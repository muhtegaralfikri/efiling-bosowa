import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, X, Save, FileSignature, Check, Clock, XCircle, Eye, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import type { Letter, SignatureRequest } from '../api/types';
import { getSignatureRequestsByLetter } from '../api/signatures';
import SignatureRequestModal from '../components/signature/SignatureRequestModal';
import { useAuth } from '../context/AuthContext';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const isMobileDevice = () =>
  typeof navigator !== 'undefined' &&
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Helper functions for signature status
const getOverallStatus = (requests: SignatureRequest[]) => {
  const allSigned = requests.every(req => req.status === 'SIGNED');
  const someSigned = requests.some(req => req.status === 'SIGNED');
  const allRejected = requests.every(req => req.status === 'REJECTED');
  const somePending = requests.some(req => req.status === 'PENDING');
  
  if (allSigned) return 'completed';
  if (allRejected) return 'rejected';
  if (someSigned || somePending) return 'in-progress';
  return 'pending';
};

// Group signature requests by letterId and createdAt (same batch)
const groupSignatureRequests = (requests: SignatureRequest[]) => {
  if (!requests.length) return [];
  
  // Group requests by letter and creation time (within 1 minute = same batch)
  const groups: { [key: string]: SignatureRequest[] } = {};
  
  requests.forEach(req => {
    // Create key based on letterId and createdAt rounded to minutes
    const createdAt = new Date(req.createdAt);
    const roundedTime = new Date(createdAt.setSeconds(0, 0)); // Round to minute
    const key = `${req.letterId}-${roundedTime.getTime()}`;
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(req);
  });
  
  return Object.values(groups);
};

export default function LetterDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useMemo(() => isMobileDevice(), []);
  const [letter, setLetter] = useState<Letter | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<Letter>>({});
  const [saving, setSaving] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [activePreview, setActivePreview] = useState<{ url: string; type: 'pdf' | 'image'; ownedUrl?: boolean } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const { data: signatureRequests = [] } = useQuery({
    queryKey: ['signature-requests', id],
    queryFn: () => getSignatureRequestsByLetter(id!),
    enabled: !!id,
  });

  const signatureRequestGroups = useMemo(
    () => groupSignatureRequests(signatureRequests),
    [signatureRequests],
  );

  const downloadBlob = (blob: Blob, filename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  };

  const openBlobInNewTab = (blob: Blob) => {
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    // Delay revoke a bit so new tab can load it
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
  };

  const downloadLetterPdf = async (letterId: string) => {
    const resp = await api.get(`/letters/${letterId}/download-pdf`, { responseType: 'blob' });
    const pdfBlob = new Blob([resp.data], { type: 'application/pdf' });
    const safeName = (letter?.letterNumber || 'document').replace(/[^a-zA-Z0-9-_]/g, '_');
    downloadBlob(pdfBlob, `${safeName}.pdf`);
  };

  const openLetterPdfInNewTab = async (letterId: string) => {
    const resp = await api.get(`/letters/${letterId}/download-pdf`, { responseType: 'blob' });
    const pdfBlob = new Blob([resp.data], { type: 'application/pdf' });
    openBlobInNewTab(pdfBlob);
  };

  const downloadSignedPdf = async (filename: string, downloadName?: string) => {
    const resp = await api.get(`/letters/signed-image-download/${filename}`, {
      params: { downloadName },
      responseType: 'blob',
    });
    const pdfBlob = new Blob([resp.data], { type: 'application/pdf' });
    downloadBlob(pdfBlob, downloadName || filename);
  };

  const pdfPreviewFileId = useMemo(() => {
    if (isMobile) return null;
    if (!letter?.fileUrl?.toLowerCase().endsWith('.pdf')) return null;
    return (letter as any)?.fileId as string | null;
  }, [isMobile, letter?.fileUrl, (letter as any)?.fileId]);

  // Fetch PDF as Blob to bypass IDM (desktop only)
  useEffect(() => {
    if (isMobile || !pdfPreviewFileId) {
      setPdfBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    const controller = new AbortController();

    api
      .get(`/letters/pdf-preview/${pdfPreviewFileId}`, {
        responseType: 'blob',
        signal: controller.signal,
      })
      .then((res) => {
        const pdfBlob = new Blob([res.data], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(pdfBlob);
        setPdfBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return blobUrl;
        });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error('Failed to load PDF blob:', err);
      });

    return () => {
      controller.abort();
      setPdfBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [isMobile, pdfPreviewFileId]);

  useEffect(() => {
    if (id) {
      const controller = new AbortController();
      api
        .get(`/letters/${id}`, { signal: controller.signal })
        .then((res) => {
          setLetter(res.data);
          setForm(res.data);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          console.error('Failed to load letter:', err);
        });

      return () => controller.abort();
    }
  }, [id]);

  const handleEdit = () => {
    setIsEditing(true);
    setForm({ ...letter });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setForm({ ...letter });
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await api.patch(`/letters/${id}`, {
        letterNumber: form.letterNumber,
        jenisSurat: form.jenisSurat,
        jenisDokumen: form.jenisDokumen,
        tanggalSurat: form.tanggalSurat,
        namaPengirim: form.namaPengirim,
        alamatPengirim: form.alamatPengirim,
        teleponPengirim: form.teleponPengirim,
        perihal: form.perihal,
        totalNominal: Number(form.totalNominal) || 0,
      });
      setLetter(res.data);
      setIsEditing(false);
      toast.success('Dokumen berhasil diperbarui');
      // Invalidate letters cache so list updates automatically
      queryClient.invalidateQueries({ queryKey: ['letters'] });
    } catch {
      toast.error('Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${API_BASE}${path}`;
  };

  const handleViewDocument = async (path: string, type: 'pdf' | 'image', existingBlobUrl?: string | null) => {
    if (existingBlobUrl) {
      setActivePreview({ url: existingBlobUrl, type: 'pdf', ownedUrl: false });
      setZoomLevel(1);
      return;
    }

    // Determine if we need to use the POST endpoint for signed files (IDM bypass)
    const isSignedFile = path.includes('/uploads/signed/');
    let fullUrl = getImageUrl(path);
    
    if (type === 'pdf' || isSignedFile) {
      try {
        const toastId = toast.loading('Memuat preview dokumen...');
        let blob: Blob;

        if (isSignedFile) {
           const filename = path.split('/').pop();
           if (!filename) throw new Error('Invalid signed filename');
           const resp = await api.post('/letters/signed-image-preview', { filename }, { responseType: 'blob' });
           blob = new Blob([resp.data], { type: 'application/pdf' });
        } else {
           // For PDFs, prefer the streaming endpoint (avoids IDM, and now requires auth)
           const fileId = (letter as any)?.fileId;
           if (fileId) {
             const resp = await api.get(`/letters/pdf-preview/${fileId}`, { responseType: 'blob' });
             blob = new Blob([resp.data], { type: 'application/pdf' });
           } else {
             // Fallback: best effort (may be blocked by IDM depending on browser)
             const resp = await fetch(fullUrl);
             if (!resp.ok) throw new Error('Fetch failed');
             blob = await resp.blob();
           }
        }

        if (isMobile) {
          openBlobInNewTab(blob);
        } else {
          const blobUrl = URL.createObjectURL(blob);
          setActivePreview({ url: blobUrl, type: 'pdf', ownedUrl: true });
        }
        toast.dismiss(toastId);
      } catch (e) {
        console.error(e);
        toast.error('Gagal memuat preview');
      }
    } else {
      // Standard image loading (non-signed)
      setActivePreview({ url: fullUrl, type: 'image', ownedUrl: false });
    }
    setZoomLevel(1);
  };

  // Revoke blob URLs created for previews when closed/replaced
  useEffect(() => {
    return () => {
      if (activePreview?.ownedUrl && activePreview.url.startsWith('blob:')) {
        URL.revokeObjectURL(activePreview.url);
      }
    };
  }, [activePreview]);



  if (!letter) {
    return (
      <section className="panel">
        <p>Memuat detail...</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Detail Dokumen</p>
          <h1>{letter.letterNumber}</h1>
        </div>
        <div className="actions">
          {!isEditing ? (
            <>
              {user && (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => setShowSignatureModal(true)}
                >
                  <FileSignature size={16} /> Minta TTD
                </button>
              )}
              <button type="button" className="ghost-btn" onClick={handleEdit}>
                <Pencil size={16} /> Edit
              </button>
              <button type="button" className="ghost-btn" onClick={() => navigate(-1)}>
                Kembali
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="primary-btn"
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button type="button" className="ghost-btn" onClick={handleCancel}>
                <X size={16} /> Batal
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid two-col">
        <div>
          {!isEditing ? (
            <ul className="meta">
              <li>
                <strong>Tipe</strong> {letter.jenisSurat}
              </li>
              <li>
                <strong>Jenis Dokumen</strong> {letter.jenisDokumen}
              </li>
              <li>
                <strong>Unit Bisnis</strong> {letter.unitBisnis?.replace('_', ' ') || '-'}
              </li>
              <li>
                <strong>Tanggal</strong> {letter.tanggalSurat}
              </li>
              <li>
                <strong>Pengirim</strong> {letter.namaPengirim || '-'}
              </li>
              <li>
                <strong>Alamat</strong> {letter.alamatPengirim || '-'}
              </li>
              <li>
                <strong>Telepon</strong> {letter.teleponPengirim || '-'}
              </li>
              <li>
                <strong>Perihal</strong> {letter.perihal || '-'}
              </li>
              <li>
                <strong>Total Nominal</strong> Rp {letter.totalNominal?.toLocaleString('id-ID')}
              </li>
            </ul>
          ) : (
            <form className="form-grid two-col">
              <label>
                Nomor Surat
                <input
                  value={form.letterNumber || ''}
                  onChange={(e) => setForm({ ...form, letterNumber: e.target.value })}
                />
              </label>
              <label>
                Tipe Dokumen
                <select
                  value={form.jenisSurat || 'MASUK'}
                  onChange={(e) => setForm({ ...form, jenisSurat: e.target.value as 'MASUK' | 'KELUAR' })}
                >
                  <option value="MASUK">MASUK</option>
                  <option value="KELUAR">KELUAR</option>
                </select>
              </label>
              <label>
                Jenis Dokumen
                <select
                  value={form.jenisDokumen || 'SURAT'}
                  onChange={(e) => setForm({ ...form, jenisDokumen: e.target.value as 'SURAT' | 'INVOICE' | 'INTERNAL_MEMO' | 'PAD' })}
                >
                  <option value="SURAT">SURAT</option>
                  <option value="INVOICE">INVOICE</option>
                  <option value="INTERNAL_MEMO">INTERNAL MEMO</option>
                  <option value="PAD">PAD</option>
                </select>
              </label>
              <label>
                Unit Bisnis
                <select
                  value={form.unitBisnis || ''}
                  onChange={(e) => setForm({ ...form, unitBisnis: e.target.value as any })}
                  disabled
                >
                  <option value="BOSOWA_TAXI">Bosowa Taxi</option>
                  <option value="OTORENTAL_NUSANTARA">Otorental Nusantara</option>
                  <option value="OTO_GARAGE_INDONESIA">Oto Garage Indonesia</option>
                  <option value="MALLOMO">Mallomo</option>
                  <option value="LAGALIGO_LOGISTIK">Lagaligo Logistik</option>
                  <option value="PORT_MANAGEMENT">Port Management</option>
                </select>
              </label>
              <label>
                Tanggal Surat
                <input
                  type="date"
                  value={form.tanggalSurat || ''}
                  onChange={(e) => setForm({ ...form, tanggalSurat: e.target.value })}
                />
              </label>
              <label>
                Nama Pengirim
                <input
                  value={form.namaPengirim || ''}
                  onChange={(e) => setForm({ ...form, namaPengirim: e.target.value })}
                />
              </label>
              <label>
                Alamat Pengirim
                <input
                  value={form.alamatPengirim || ''}
                  onChange={(e) => setForm({ ...form, alamatPengirim: e.target.value })}
                />
              </label>
              <label>
                Telepon Pengirim
                <input
                  value={form.teleponPengirim || ''}
                  onChange={(e) => setForm({ ...form, teleponPengirim: e.target.value })}
                />
              </label>
              <label>
                Perihal
                <input
                  value={form.perihal || ''}
                  onChange={(e) => setForm({ ...form, perihal: e.target.value })}
                />
              </label>
              <label>
                Total Nominal
                <input
                  type="number"
                  value={form.totalNominal || 0}
                  onChange={(e) => setForm({ ...form, totalNominal: Number(e.target.value) })}
                />
              </label>
            </form>
          )}
        </div>
        <div>
          {letter.fileUrl ? (
            letter.fileUrl.toLowerCase().endsWith('.pdf') ? (
              // PDF Preview using iframe with Blob URL (desktop). Mobile uses open/download buttons.
              <div className="preview-pdf-container">
                {isMobile ? (
                  <div className="pdf-mobile-actions">
                    <div style={{ padding: '16px', textAlign: 'center' }}>
                      Preview PDF tidak didukung di browser mobile. Gunakan tombol di bawah untuk membuka dokumen.
                    </div>
                    <div className="pdf-mobile-buttons">
                      <button
                        type="button"
                        className="pdf-open-btn"
                        onClick={() => openLetterPdfInNewTab(id!)}
                      >
                        Buka PDF
                      </button>
                      <button
                        type="button"
                        className="pdf-download-btn"
                        onClick={() => downloadLetterPdf(id!)}
                      >
                        Unduh
                      </button>
                    </div>
                  </div>
                ) : pdfBlobUrl ? (
                  <>
                    <iframe
                      src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                      title="PDF Preview"
                      width="100%"
                      height="600px"
                      className="preview-pdf"
                    />
                    <div
                      className="pdf-overlay"
                      onClick={() => handleViewDocument(letter.fileUrl!, 'pdf', pdfBlobUrl)}
                    >
                      <div className="zoom-hint">
                        <ZoomIn size={20} />
                        <span>Klik untuk zoom</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center' }}>Memuat Dokumen PDF...</div>
                )}
              </div>
            ) : (
              // Image Preview with zoom
              <div
                className="preview-image-container"
                onClick={() => handleViewDocument(letter.fileUrl!, 'image')}
              >
                <img
                  src={getImageUrl(letter.fileUrl)}
                  alt="Preview Surat"
                  className="preview-image"
                />
                <div className="zoom-hint">
                  <ZoomIn size={20} />
                  <span>Klik untuk zoom</span>
                </div>
              </div>
            )
          ) : (
            <p>Tidak ada lampiran</p>
          )}
          
        </div>
      </div>

      {signatureRequests.length > 0 && (
        <div className="signature-status-section">
          <h3><FileSignature size={18} /> Status Tanda Tangan</h3>
          
          {/* Group signature requests by batch */}
          {signatureRequestGroups.map((group: SignatureRequest[], groupIndex: number) => {
            const signedCount = group.filter((req) => req.status === 'SIGNED').length;
            const progress = (signedCount / group.length) * 100;
            const overallStatus = getOverallStatus(group);

            return (
            <div key={groupIndex} className="signature-card">
              <div className="signature-header">
                <div className="signature-progress-header">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${progress}%` 
                      }}
                    />
                  </div>
                </div>
                <div className={`signature-status ${overallStatus}`}>
                  {signedCount}/{group.length} Sudah TTD
                </div>
              </div>
              
              <div className="signature-details">
                
                {/* Signers list */}
                <div className="signers-list">
                  {group.map((req: SignatureRequest) => (
                    <div key={req.id} className="signer-item">
                      <div className="signer-info">
                        <div className="signer-name">
                          {req.assignee?.username || 'Unknown'}
                        </div>
                        <div className={`signer-status ${req.status.toLowerCase()}`}>
                          {req.status === 'PENDING' && (
                            <>
                              <Clock size={14} />
                              <span>Menunggu</span>
                            </>
                          )}
                          {req.status === 'SIGNED' && (
                            <>
                              <Check size={14} />
                              <span>Sudah TTD</span>
                            </>
                          )}
                          {req.status === 'REJECTED' && (
                            <>
                              <XCircle size={14} />
                              <span>Ditolak</span>
                            </>
                          )}
                        </div>
                      </div>
                      {req.signedAt && (
                        <div className="signer-date">
                          {new Date(req.signedAt).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Actions - show when all signed in this group */}
                {group.every(req => req.status === 'SIGNED') && (
                  <div className="signature-actions">
                    {group[0]?.signedImagePath && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleViewDocument(
                            group[0].signedImagePath!,
                            group[0].signedImagePath!.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'
                          )}
                          className="primary-btn"
                        >
                          <Eye size={16} className="mr-2" />
                          Lihat Dokumen Tertandatangani
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                             const filename = group[0].signedImagePath!.split('/').pop();
                             const downloadName = `${(letter?.letterNumber || 'document').replace(/[^a-zA-Z0-9-_]/g, '_')}_Signed.pdf`;
                             if (!filename) {
                               toast.error('Filename dokumen tidak valid');
                               return;
                             }
                             downloadSignedPdf(filename, downloadName);
                          }}
                          className="ghost-btn"
                        >
                          <Download size={16} className="mr-2" />
                          Download
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      )}

      {showSignatureModal && (
        <SignatureRequestModal
          letterId={id!}
          letterNumber={letter.letterNumber}
          onClose={() => setShowSignatureModal(false)}
        />
      )}

      {!!activePreview && (
        <div className="image-zoom-overlay" onClick={() => setActivePreview(null)}>
          <div className="image-zoom-controls" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="zoom-control-btn"
              onClick={() => setZoomLevel((prev) => Math.min(prev + 0.25, 3))}
              title="Perbesar"
            >
              <ZoomIn size={20} />
            </button>
            <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              className="zoom-control-btn"
              onClick={() => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5))}
              title="Perkecil"
            >
              <ZoomOut size={20} />
            </button>
            <button
              type="button"
              className="zoom-control-btn close"
              onClick={() => setActivePreview(null)}
              title="Tutup"
            >
              <X size={20} />
            </button>
          </div>
          <div className="image-zoom-content" onClick={(e) => e.stopPropagation()}>
            {activePreview.type === 'pdf' ? (
              isMobile ? (
                <div style={{ padding: '16px', textAlign: 'center' }}>
                  Preview PDF tidak didukung di mobile.{' '}
                  {id && (
                    <button type="button" className="ghost-btn" onClick={() => openLetterPdfInNewTab(id)}>
                      Buka PDF
                    </button>
                  )}
                </div>
              ) : (
                <iframe
                  src={`${activePreview.url}#toolbar=0&navpanes=0&scrollbar=0`}
                  title="PDF Zoom"
                  className="pdf-zoom-embed"
                />
              )
            ) : (
              <img
                src={activePreview.url}
                alt="Document Preview"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            )}
          </div>
        </div>
      )}

      <style>{`
        .signature-status-section {
          margin-top: 2rem;
          padding: 1.25rem;
          background: var(--bg-secondary);
          border-radius: 16px;
          border: 1px solid var(--border-color);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .signature-status-section h3 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0 0 1.25rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .signature-card {
          background: var(--bg-primary);
          border-radius: 12px;
          border: 1px solid var(--border-color);
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }
        .signature-card + .signature-card {
          margin-top: 1rem;
        }
        
        .signature-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          background: var(--bg-hover);
          border-bottom: 1px solid var(--border-color);
          gap: 1rem;
        }
        .signature-progress-header {
          flex: 1;
          min-width: 0;
        }
        .signature-progress-header .progress-bar {
          height: 8px;
          background: var(--bg-secondary);
          border-radius: 4px;
          overflow: hidden;
        }
        .signature-progress-header .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981 0%, #059669 100%);
          border-radius: 4px;
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .signature-status {
          display: inline-flex;
          align-items: center;
          padding: 0.5rem 1rem;
          border-radius: 12px;
          font-size: 0.813rem;
          font-weight: 600;
          white-space: nowrap;
        }
        
        /* Light mode status colors */
        @media (prefers-color-scheme: light) {
          .signature-status.completed {
            background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
            color: #166534;
          }
          .signature-status.rejected {
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
            color: #991b1b;
          }
          .signature-status.in-progress {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            color: #92400e;
          }
          .signature-status.pending {
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
            color: #4b5563;
          }
        }
        
        /* Dark mode status colors */
        @media (prefers-color-scheme: dark) {
          .signature-status.completed {
            background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
            color: #6ee7b7;
          }
          .signature-status.rejected {
            background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
            color: #fca5a5;
          }
          .signature-status.in-progress {
            background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
            color: #fcd34d;
          }
          .signature-status.pending {
            background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
            color: #9ca3af;
          }
        }
        
        /* Fallback for manual dark mode */
        html.dark .signature-status.completed {
          background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
          color: #6ee7b7;
        }
        html.dark .signature-status.rejected {
          background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
          color: #fca5a5;
        }
        html.dark .signature-status.in-progress {
          background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
          color: #fcd34d;
        }
        html.dark .signature-status.pending {
          background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
          color: #9ca3af;
        }
        
        .signature-details {
          padding: 1.25rem;
        }
        
        .progress-container {
          margin-bottom: 1.5rem;
        }
        .progress-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
          font-weight: 500;
        }
        .progress-bar {
          width: 100%;
          height: 10px;
          background: var(--bg-hover);
          border-radius: 8px;
          overflow: hidden;
          position: relative;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981 0%, #059669 100%);
          border-radius: 8px;
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          animation: shimmer 2s infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .signers-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .signer-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: 10px;
          border: 1px solid var(--border-color);
          transition: all 0.2s ease;
        }
        .signer-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        .signer-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }
        .signer-name {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.938rem;
          min-width: 120px;
        }
        .signer-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.813rem;
          font-weight: 500;
          padding: 0.375rem 0.75rem;
          border-radius: 8px;
          background: var(--bg-hover);
        }
        .signer-status.pending { 
          color: #f59e0b; 
          background: rgba(245, 158, 11, 0.1);
        }
        .signer-status.signed { 
          color: #10b981; 
          background: rgba(16, 185, 129, 0.1);
        }
        .signer-status.rejected { 
          color: #ef4444; 
          background: rgba(239, 68, 68, 0.1);
        }
        .signer-date {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 500;
          white-space: nowrap;
        }
        
        .signature-actions {
          margin-top: 1.5rem;
          padding-top: 1.25rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        .mr-2 {
          margin-right: 0.5rem;
        }
        .view-signed-btn,
        .download-signed-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          text-decoration: none;
          transition: background 0.2s;
          border: none;
          cursor: pointer;
        }
        .view-signed-btn {
          background: var(--accent-light);
          color: var(--accent-primary);
        }
        .view-signed-btn:hover {
          background: var(--bg-hover);
        }
        .download-signed-btn {
          background: var(--bg-hover);
          color: var(--text-secondary);
        }
        .download-signed-btn:hover {
          background: var(--border-color);
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
          .signature-status-section {
            padding: 1rem;
            margin-top: 1.5rem;
          }
          
          .signature-status-section h3 {
            font-size: 1rem;
            gap: 0.5rem;
          }
          
          .signature-card + .signature-card {
            margin-top: 0.75rem;
          }
          
          .signature-header {
            padding: 1rem;
            flex-direction: column;
            gap: 0.75rem;
            align-items: flex-start;
            min-height: auto;
          }
          
          .signature-title {
            font-size: 0.938rem;
          }
          
          .signature-status {
            font-size: 0.75rem;
            padding: 0.375rem 0.75rem;
            width: 100%;
            justify-content: center;
          }
          
          .signature-details {
            padding: 1rem;
          }
          
          .progress-container {
            margin-bottom: 1rem;
          }
          
          .progress-label {
            font-size: 0.813rem;
            margin-bottom: 0.5rem;
          }
          
          .progress-bar {
            height: 8px;
          }
          
          .signer-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
            padding: 0.75rem;
          }
          
          .signer-info {
            width: 100%;
            gap: 0.75rem;
          }
          
          .signer-name {
            font-size: 0.875rem;
            min-width: auto;
          }
          
          .signer-status {
            font-size: 0.75rem;
            padding: 0.25rem 0.5rem;
          }
          
          .signer-date {
            font-size: 0.688rem;
            align-self: flex-end;
          }
          
          .signature-actions {
            flex-direction: column;
            gap: 0.75rem;
            padding-top: 1rem;
          }
          
          .signature-actions button {
            width: 100%;
            justify-content: center;
          }
          
          .mr-2 {
            margin-right: 0.375rem;
          }
        }
        
        /* Small Mobile (320-374px) */
        @media (max-width: 374px) {
          .signature-status-section {
            padding: 0.75rem;
          }
          
          .signature-header,
          .signature-details {
            padding: 0.75rem;
          }
          
          .signer-item {
            padding: 0.5rem;
          }
          
          .signature-status-section h3 {
            font-size: 0.938rem;
          }
          
          .signature-title {
            font-size: 0.875rem;
          }
          
          .signer-name {
            font-size: 0.813rem;
          }
          
          .signer-status {
            font-size: 0.688rem;
            padding: 0.25rem 0.375rem;
          }
        }
        
        /* Prevent text overflow in status badges */
        .signature-status {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        @media (max-width: 768px) {
          .signature-status {
            max-width: none;
          }
        }

        /* PDF Preview Styles */
        .preview-pdf-container {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
        }
        .preview-pdf {
          border: none;
          min-height: 500px;
        }
        .pdf-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          cursor: zoom-in;
          z-index: 10;
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          padding: 12px;
          transition: background 0.2s;
        }
        .pdf-overlay:hover {
          background: rgba(0, 0, 0, 0.05);
        }
        .pdf-overlay:hover .zoom-hint {
          opacity: 1;
        }

        /* Image Zoom Styles */
        .preview-image-container {
          position: relative;
          cursor: zoom-in;
          border-radius: 8px;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .preview-image-container:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        .preview-image-container:hover .zoom-hint {
          opacity: 1;
        }
        .zoom-hint {
          position: absolute;
          bottom: 12px;
          right: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.75);
          color: white;
          border-radius: 6px;
          font-size: 0.75rem;
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
        }
        .image-zoom-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .image-zoom-controls {
          position: absolute;
          top: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          z-index: 1001;
        }
        .zoom-control-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: none;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }
        .zoom-control-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }
        .zoom-control-btn.close {
          background: rgba(239, 68, 68, 0.3);
        }
        .zoom-control-btn.close:hover {
          background: rgba(239, 68, 68, 0.5);
        }
        .zoom-level {
          color: white;
          font-size: 0.875rem;
          font-weight: 500;
          min-width: 50px;
          text-align: center;
        }
        .image-zoom-content {
          max-width: 90vw;
          max-height: 85vh;
          width: 90vw;
          height: 85vh;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .image-zoom-content img {
          max-width: 100%;
          max-height: 85vh;
          object-fit: contain;
          border-radius: 8px;
          transition: transform 0.2s ease;
        }
        .pdf-zoom-embed {
          width: 100%;
          height: 100%;
          border: none;
          border-radius: 8px;
          background: white;
        }
        .pdf-mobile-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 8px;
        }
        .pdf-mobile-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
          padding: 0 16px 16px;
        }
        .pdf-open-btn, .pdf-download-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 14px;
          border-radius: 10px;
          font-weight: 700;
          border: 1px solid var(--border-color);
          background: var(--bg-primary);
          color: var(--text-primary);
          text-decoration: none;
          cursor: pointer;
        }
        .pdf-open-btn:hover, .pdf-download-btn:hover {
          background: var(--bg-hover);
        }

        /* Signature Status Redesign - Responsive & Dark Mode */
        .signature-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1rem;
        }
        .signature-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background: var(--bg-panel);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          transition: all 0.2s ease;
        }
        .signature-item:hover {
          border-color: var(--accent-light);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }
        .signature-user {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 600;
          color: var(--text-primary);
          font-size: 1rem;
        }
        .signature-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        /* Badges */
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          line-height: 1;
          letter-spacing: 0.025em;
          text-transform: uppercase;
        }
        .status-badge.signed {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }
        .status-badge.pending {
          background: #fef9c3;
          color: #854d0e;
          border: 1px solid #fde047;
        }
        .status-badge.rejected {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        /* Dark Mode Badge Overrides */
        [data-theme="dark"] .status-badge.signed {
          background: rgba(22, 101, 52, 0.2);
          color: #86efac;
          border-color: rgba(22, 101, 52, 0.4);
        }
        [data-theme="dark"] .status-badge.pending {
          background: rgba(133, 77, 14, 0.2);
          color: #fde047;
          border-color: rgba(133, 77, 14, 0.4);
        }
        [data-theme="dark"] .status-badge.rejected {
           background: rgba(153, 27, 27, 0.2);
           color: #fca5a5;
           border-color: rgba(153, 27, 27, 0.4);
        }

        /* Buttons */
        .view-signed-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: transparent;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .view-signed-btn:hover {
          background: var(--bg-hover);
          border-color: var(--accent-secondary);
          color: var(--text-primary);
        }
        .download-signed-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: var(--bg-hover);
          color: var(--accent-primary);
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }
        .download-signed-btn:hover {
          background: var(--accent-light);
          transform: translateY(-1px);
        }

        /* Mobile Responsive */
        @media (max-width: 640px) {
          .signature-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          .signature-actions {
            width: 100%;
            justify-content: space-between;
          }
          .status-badge {
            order: -1; /* Display badge above name on mobile? Or standard flow? Standard flow is fine */
          }
        }
      `}</style>
    </section>
  );
}
