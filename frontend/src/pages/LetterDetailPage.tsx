import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, X, Save, FileSignature, Check, Clock, Eye, ZoomIn, ZoomOut, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import api from '../api/client';
import type { Letter, SignatureRequest } from '../api/types';
import { getSignatureRequestsByLetter, cancelSignatureRequest } from '../api/signatures';
import SignatureRequestModal from '../components/signature/SignatureRequestModal';
import { useAuth } from '../context/AuthContext';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const isMobileDevice = () =>
  typeof navigator !== 'undefined' &&
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Helper functions for signature status


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

const getUserIdFromToken = (token?: string) => {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload).sub;
  } catch (e) {
    return null;
  }
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

  const cancelMutation = useMutation({
    mutationFn: cancelSignatureRequest,
    onSuccess: () => {
      toast.success('Permintaan tanda tangan dibatalkan');
      queryClient.invalidateQueries({ queryKey: ['signature-requests', id] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Gagal membatalkan permintaan';
      toast.error(msg);
    },
  });

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

  const openBlobInNewTab = (blob: Blob, filename = 'document.pdf') => {
    // For mobile, download instead of opening new tab (blob URLs don't work well on mobile)
    if (isMobileDevice()) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Revoke after delay
      setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
      return;
    }

    // Desktop: open in new tab
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
    const safeName = (letter?.letterNumber || 'document').replace(/[^a-zA-Z0-9-_]/g, '_');
    openBlobInNewTab(pdfBlob, `${safeName}.pdf`);
  };

  // Download signed PDF using lazy embedding endpoint (POST to bypass IDM)
  const downloadSignedPdf = async (letterId: string) => {
    try {
      const resp = await api.post(`/letters/${letterId}/signed-pdf`, {}, {
        responseType: 'blob',
      });
      const pdfBlob = new Blob([resp.data], { type: 'application/pdf' });
      const safeName = (letter?.letterNumber || 'document').replace(/[^a-zA-Z0-9-_]/g, '_');
      downloadBlob(pdfBlob, `${safeName}_Signed.pdf`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal mengunduh dokumen bertanda tangan');
    }
  };

  const pdfPreviewFileId = useMemo(() => {
    if (isMobile) return null;
    if (!letter?.fileUrl?.toLowerCase().endsWith('.pdf')) return null;
    return letter.fileId ?? null;
  }, [isMobile, letter]);

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
    const fullUrl = getImageUrl(path);

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
           const fileId = letter?.fileId;
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
                  onChange={(e) => setForm({ ...form, unitBisnis: e.target.value as Letter['unitBisnis'] })}
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
        <div className="signature-section">
          <h3 className="section-title">
            <FileSignature size={20} className="text-accent" />
            Status Tanda Tangan
          </h3>
          
          <div className="signature-groups">
            {signatureRequestGroups.map((group: SignatureRequest[], groupIndex: number) => {
              const signedCount = group.filter((req) => req.status === 'SIGNED').length;
              const isAllSigned = group.every(req => req.status === 'SIGNED');
              const groupDate = group[0]?.createdAt ? new Date(group[0].createdAt) : new Date();

              return (
                <div key={groupIndex} className="signature-group">
                  <div className="group-header">
                    <div className="group-info">
                      <span className="group-date">
                        Permintaan: {groupDate.toLocaleString('id-ID', { 
                          day: 'numeric', month: 'short', year: 'numeric', 
                          hour: '2-digit', minute: '2-digit' 
                        })}
                      </span>
                      {isAllSigned ? (
                        <span className="group-badge completed">
                          <Check size={12} strokeWidth={3} /> Selesai
                        </span>
                      ) : (
                        <span className="group-badge pending">
                          {signedCount} / {group.length} TTD
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="signer-list-container">
                    {group.map((req: SignatureRequest) => (
                      <div key={req.id} className="signer-row">
                        <div className="signer-main">
                          <div className="signer-avatar">
                            {req.assignee?.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="signer-details">
                            <div className="signer-name">
                              {req.assignee?.username || 'Unknown User'}
                            </div>
                            <div className="signer-meta">
                              {req.status === 'SIGNED' ? (
                                <span className="status-text success">
                                   Ditandatangani pada {new Date(req.signedAt!).toLocaleString('id-ID', {
                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                   })}
                                </span>
                              ) : req.status === 'REJECTED' ? (
                                <span className="status-text error">
                                  Ditolak
                                </span>
                              ) : (
                                <div className="signer-actions">
                                  <span className="status-text warning">
                                    Menunggu tanda tangan
                                    {/* Debug Info */}
                                    {/* <span style={{fontSize: '10px', color: 'gray'}}>
                                      {user?.id} vs {req.requestedBy}
                                    </span> */}
                                  </span>
                                  {user && (req.requestedBy === (user.id || getUserIdFromToken(user.token))) && (
                                    <button 
                                      className="cancel-req-btn-premium"
                                      onClick={() => {
                                        if (confirm('Batalkan permintaan tanda tangan ini?')) {
                                          cancelMutation.mutate(req.id);
                                        }
                                      }}
                                      title="Batalkan Permintaan"
                                    >
                                      <Trash2 size={14} /> Batalkan
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="signer-status-icon">
                          {req.status === 'SIGNED' ? (
                            <div className="icon-circle success"><Check size={16} /></div>
                          ) : req.status === 'REJECTED' ? (
                            <div className="icon-circle error"><X size={16} /></div>
                          ) : (
                            <div className="icon-circle warning"><Clock size={16} /></div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Group Actions Footer */}
                    {isAllSigned && (
                      <div className="group-actions">
                        <button
                          type="button"
                          onClick={() => downloadSignedPdf(letter.id)}
                          className="action-btn view"
                        >
                          <Eye size={16} />
                          <span>Lihat & Download</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
        /* New Signature Section Styles */
        .signature-section {
          margin-top: 2rem;
          font-family: 'Sora', sans-serif;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 1.5rem;
        }

        .signature-groups {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .signature-group {
          background: var(--bg-primary);
          border-radius: 20px;
          border: 1px solid var(--border-color);
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .signature-group:hover {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
          transform: translateY(-2px);
          border-color: var(--accent-primary);
        }

        .group-header {
          padding: 1.25rem 1.5rem;
          background: linear-gradient(to right, var(--bg-secondary), var(--bg-primary));
          border-bottom: 1px solid var(--border-color);
        }

        /* Premium Cancel Button */
        .cancel-req-btn-premium {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.8rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          color: #ef4444;
          font-family: 'Sora', sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          letter-spacing: 0.02em;
        }

        .cancel-req-btn-premium:hover {
          background: #ef4444;
          color: white;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
          border-color: #ef4444;
        }

        .cancel-req-btn-premium:active {
          transform: translateY(0);
        }


        .group-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 1rem;
          flex-wrap: wrap; /* Allow wrapping on small screens */
        }

        .group-date {
          font-size: 0.875rem;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .group-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.025em;
          text-transform: uppercase;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .group-badge.completed {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 4px 6px rgba(16, 185, 129, 0.25);
        }
        
        .group-badge.pending {
          background: var(--bg-hover);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }

        .signer-list-container {
          background: var(--bg-primary);
        }

        .signer-row {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-light);
          transition: background 0.15s;
        }
        
        .signer-row:last-child {
          border-bottom: none;
        }
        
        .signer-row:hover {
          background: var(--bg-hover);
        }

        .signer-main {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .signer-avatar {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.125rem;
          box-shadow: 0 4px 6px rgba(79, 70, 229, 0.25);
          flex-shrink: 0;
        }

        .signer-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0; /* Prevent text overflow issues */
        }

        .signer-name {
          font-weight: 700;
          color: var(--text-primary);
          font-size: 1rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .signer-meta {
          font-size: 0.75rem;
          font-weight: 500;
        }

        .status-text.success { color: #059669; }
        .status-text.error { color: #dc2626; }
        .status-text.warning { color: #d97706; }

        .signer-status-icon {
          display: flex;
          align-items: center;
        }

        .icon-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          transition: transform 0.2s;
        }
        
        .signer-row:hover .icon-circle {
          transform: scale(1.1);
        }
        
        .icon-circle.success {
          background: #d1fae5;
          color: #059669;
          box-shadow: 0 0 0 4px #ecfdf5;
        }
        
        .icon-circle.error {
          background: #fee2e2;
          color: #dc2626;
          box-shadow: 0 0 0 4px #fef2f2;
        }
        
        .icon-circle.warning {
          background: #fef3c7;
          color: #d97706;
          box-shadow: 0 0 0 4px #fffbeb;
        }

        .group-actions {
          padding: 1.25rem 1.5rem;
          background: var(--bg-hover);
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid transparent;
          font-family: 'Sora', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .action-btn.view {
          /* Force bright blue gradient */
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white !important;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .action-btn.view:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(37, 99, 235, 0.4);
          filter: brightness(1.1);
        }
        .action-btn.view:active {
          transform: translateY(0);
        }

        .action-btn.download {
          background: white;
          border: 1px solid #e5e7eb;
          color: #374151;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .action-btn.download:hover {
          background: #f9fafb;
          color: #111827;
          border-color: #d1d5db;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        html.dark .action-btn.download {
            background: rgba(30, 41, 59, 1); /* slate-800 solid */
            border-color: rgba(255, 255, 255, 0.2);
            color: #e5e7eb;
        }
        html.dark .action-btn.download:hover {
            border-color: white;
            color: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }

        /* Status colors enhancement */
        html.dark .group-header {
             background: linear-gradient(to right, rgba(255, 255, 255, 0.03), transparent);
        }
        html.dark .icon-circle.success { 
          background: rgba(5, 150, 105, 0.15);
          box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.05);
        }
        html.dark .icon-circle.error { 
          background: rgba(220, 38, 38, 0.15); 
          box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.05);
        }
        html.dark .icon-circle.warning { 
          background: rgba(217, 119, 6, 0.15);
          box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.05);
        }

        /* Mobile Responsive */
        @media (max-width: 640px) {
          .group-header {
            padding: 1rem;
          }
          
          .group-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          
          .group-badge {
            width: 100%;
            justify-content: center;
          }

          .signer-row {
            grid-template-columns: 1fr;
            gap: 1rem;
            padding: 1rem;
            align-items: flex-start;
          }
          
          .signer-main {
            width: 100%;
          }
          
          .signer-details {
            width: 100%;
          }

          .signer-status-icon {
            display: none; 
          }
          
          .group-actions {
            flex-direction: column;
            padding: 1rem;
          }
          
          .action-btn {
            width: 100%;
          }
        }

        /* PDF Preview Styles */
        .preview-pdf-container {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
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
          border-radius: 16px;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .preview-image-container:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
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
          gap: 16px;
          padding: 16px;
          background: var(--bg-primary);
          align-items: center;
        }
        .pdf-mobile-text {
          font-family: 'Sora', sans-serif;
          font-size: 0.938rem;
          color: var(--text-secondary);
          text-align: center;
          line-height: 1.5;
        }
        .pdf-mobile-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }
        .pdf-open-btn, .pdf-download-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 20px;
          border-radius: 12px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          font-family: 'Sora', sans-serif;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
          font-size: 1rem;
        }
        .pdf-open-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          box-shadow: 0 4px 6px rgba(37, 99, 235, 0.25);
        }
        .pdf-open-btn:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 12px rgba(37, 99, 235, 0.3);
        }
        .pdf-open-btn:active {
          transform: translateY(0);
        }
        
        .pdf-download-btn {
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .pdf-download-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
          color: #111827;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        

        html.dark .pdf-download-btn {
           background: rgba(30, 41, 59, 1);
           border-color: rgba(255, 255, 255, 0.2);
           color: #e5e7eb;
        }
        html.dark .pdf-download-btn:hover {
           border-color: white;
           color: white;
           box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        .signer-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .cancel-req-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.5rem;
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 600;
          transition: all 0.2s;
          white-space: nowrap;
        }
        
        .cancel-req-btn:hover {
          background: #fecaca;
        }

        @media (max-width: 640px) {
          .signer-actions {
            gap: 0.5rem;
            margin-top: 0.25rem;
          }
          
          .cancel-req-btn {
            padding: 0.2rem 0.4rem;
            font-size: 0.7rem;
          }
          
          .signer-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }
        }
      `}</style>
    </section>
  );
}
