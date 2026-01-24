import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, Star, Upload, Pencil, ImagePlus } from 'lucide-react';
import {
  getMySignatures,
  uploadSignature,
  drawSignature,
  setDefaultSignature,
  deleteSignature,
} from '../api/signatures';
import SignatureCanvas from '../components/signature/SignatureCanvas';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export default function SignatureSettingsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'draw'>('upload');
  const [isDragging, setIsDragging] = useState(false);

  const { data: signatures = [], isLoading } = useQuery({
    queryKey: ['my-signatures'],
    queryFn: getMySignatures,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadSignature(file, true),
    onSuccess: () => {
      toast.success('Tanda tangan berhasil diupload');
      queryClient.invalidateQueries({ queryKey: ['my-signatures'] });
    },
    onError: () => toast.error('Gagal upload tanda tangan'),
  });

  const drawMutation = useMutation({
    mutationFn: (base64: string) => drawSignature(base64, true),
    onSuccess: () => {
      toast.success('Tanda tangan berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['my-signatures'] });
    },
    onError: () => toast.error('Gagal menyimpan tanda tangan'),
  });

  const setDefaultMutation = useMutation({
    mutationFn: setDefaultSignature,
    onSuccess: () => {
      toast.success('Tanda tangan default berhasil diubah');
      queryClient.invalidateQueries({ queryKey: ['my-signatures'] });
    },
    onError: () => toast.error('Gagal mengubah tanda tangan default'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSignature,
    onSuccess: () => {
      toast.success('Tanda tangan berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['my-signatures'] });
    },
    onError: () => toast.error('Gagal menghapus tanda tangan'),
  });

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2MB');
      return;
    }
    uploadMutation.mutate(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleSaveDrawing = (dataUrl: string) => {
    drawMutation.mutate(dataUrl);
  };

  return (
    <div className="page-container">
      <h1>Pengaturan Tanda Tangan</h1>
      <p className="page-subtitle">
        Kelola tanda tangan digital Anda. Anda dapat upload gambar atau menggambar langsung.
      </p>

      <div className="card add-signature-card">
        <h2>Tambah Tanda Tangan Baru</h2>

        <div className="tab-buttons">
          <button
            className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <Upload size={18} />
            Upload Gambar
          </button>
          <button
            className={`tab-btn ${activeTab === 'draw' ? 'active' : ''}`}
            onClick={() => setActiveTab('draw')}
          >
            <Pencil size={18} />
            Gambar di Layar
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'upload' ? (
            <div
              className={`upload-zone ${isDragging ? 'dragging' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <div className="upload-icon">
                <ImagePlus size={48} strokeWidth={1.5} />
              </div>
              <p className="upload-text">
                {uploadMutation.isPending ? 'Mengupload...' : 'Klik atau seret gambar ke sini'}
              </p>
              <p className="upload-hint">PNG, JPG, atau GIF (Maks 2MB)</p>
            </div>
          ) : (
            <div className="draw-zone">
              <SignatureCanvas onSave={handleSaveDrawing} />
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Tanda Tangan Tersimpan</h2>

        {isLoading ? (
          <p>Memuat...</p>
        ) : signatures.length === 0 ? (
          <p style={{ color: '#666' }}>Belum ada tanda tangan tersimpan.</p>
        ) : (
          <div className="signature-grid">
            {signatures.map((sig) => (
              <div
                key={sig.id}
                className={`signature-card ${sig.isDefault ? 'is-default' : ''}`}
              >
                <img
                  src={`${API_URL}${sig.imagePath}`}
                  alt="Tanda tangan"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '120px',
                    objectFit: 'contain',
                    background: '#fff',
                    borderRadius: '4px',
                  }}
                />
                {sig.isDefault && (
                  <span className="badge badge-success">
                    <Star size={12} /> Default
                  </span>
                )}
                <div className="signature-actions">
                  {!sig.isDefault && (
                    <button
                      className="signature-action-btn"
                      onClick={() => setDefaultMutation.mutate(sig.id)}
                      title="Jadikan default"
                    >
                      <Star size={14} />
                    </button>
                  )}
                  <button
                    className="signature-action-btn danger"
                    onClick={() => {
                      if (confirm('Hapus tanda tangan ini?')) {
                        deleteMutation.mutate(sig.id);
                      }
                    }}
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .page-subtitle {
          color: var(--text-secondary);
          margin-bottom: 2rem;
        }
        .add-signature-card {
          margin-bottom: 2rem;
        }
        
        /* Tab Buttons */
        .tab-buttons {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          border-bottom: 2px solid var(--border-color);
          padding-bottom: 0;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          color: var(--text-secondary);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Sora', sans-serif;
        }
        .tab-btn:hover {
          color: var(--text-primary);
        }
        .tab-btn.active {
          color: var(--accent-primary);
          border-bottom-color: var(--accent-primary);
        }
        
        /* Tab Content */
        .tab-content {
          min-height: 220px;
        }
        
        /* Upload Zone */
        .upload-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 2rem;
          border: 2px dashed var(--border-color);
          border-radius: 12px;
          background: var(--bg-primary);
          cursor: pointer;
          transition: all 0.2s;
        }
        .upload-zone:hover,
        .upload-zone.dragging {
          border-color: var(--accent-primary);
          background: var(--accent-light);
        }
        .upload-icon {
          color: var(--accent-primary);
          margin-bottom: 1rem;
        }
        .upload-text {
          margin: 0;
          font-size: 1rem;
          font-weight: 500;
          color: var(--text-primary);
        }
        .upload-hint {
          margin: 0.5rem 0 0;
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        
        /* Draw Zone */
        .draw-zone {
          padding: 1rem 0;
        }
        
        /* Signature Grid */
        .signature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }
        .signature-card {
          border: 2px solid var(--border-color);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          position: relative;
          background: var(--bg-secondary);
          transition: border-color 0.2s;
        }
        .signature-card:hover {
          border-color: var(--accent-primary);
        }
        .signature-card.is-default {
          border-color: #22c55e;
          background: var(--bg-hover);
        }
        .signature-card img {
          background: #fff;
          border-radius: 8px;
        }
        .signature-actions {
          display: flex;
          gap: 0.25rem;
          margin-top: 0.5rem;
          width: 100%;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .badge-success {
          background: #dcfce7;
          color: #15803d;
        }
        
        /* Signature Action Buttons */
        .signature-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          background: var(--bg-primary);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
        }
        .signature-action-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .signature-action-btn.danger {
          color: #ef4444;
        }
        .signature-action-btn.danger:hover {
          background: #fef2f2;
          color: #dc2626;
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
          .tab-buttons {
            flex-direction: column;
            border-bottom: none;
            gap: 0.5rem;
          }
          .tab-btn {
            justify-content: center;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            margin-bottom: 0;
          }
          .tab-btn.active {
            background: var(--accent-light);
            border-color: var(--accent-primary);
          }
          .upload-zone {
            padding: 2rem 1rem;
          }
          .signature-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 0.75rem;
          }
          .signature-card {
            padding: 0.75rem;
          }
          .signature-card img {
            max-height: 80px;
          }
          .signature-actions {
            width: 100%;
            justify-content: center;
            gap: 0.5rem;
          }
          .signature-action-btn {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>
    </div>
  );
}
