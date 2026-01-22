import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, Brain, Clock, RefreshCw, Info, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api/client';
import type {
  OcrPreviewEnqueueResponse,
  OcrPreviewJobStatusResponse,
  OcrPreviewResponse,
} from '../api/types';
import CameraCapture from '../components/CameraCapture';
import ManualCropper from '../components/ManualCropper';
import UploadBox from '../components/UploadBox';

export default function UploadPage() {
  const navigate = useNavigate();
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [preparedFile, setPreparedFile] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [originalMeta, setOriginalMeta] = useState<{
    fileId: string;
    filePath: string;
    urlFull: string;
  } | null>(null);
  const [ocrMeta, setOcrMeta] = useState<{
    fileId: string;
    filePath: string;
    urlFull: string;
  } | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrPreviewResponse | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jobState, setJobState] = useState<string>('');

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const pollOcrJob = async (jobId: string) => {
    const started = Date.now();
    const timeoutMs = 2 * 60 * 1000; // 2 minutes

    while (true) {
      const res = await api.get<OcrPreviewJobStatusResponse>(
        `/letters/ocr-preview/${jobId}`,
      );
      const job = res.data;
      setJobState(job.state);

      if (job.state === 'completed') {
        if (!job.result) throw new Error('OCR job completed without result');
        return job.result;
      }

      if (job.state === 'failed') {
        throw new Error(job.error || 'OCR job failed');
      }

      if (Date.now() - started > timeoutMs) {
        throw new Error('OCR job timeout');
      }

      await wait(1000);
    }
  };


  const fileLabel = useMemo(() => {
    if (!preparedFile) return '';
    const sizeKb = (preparedFile.size / 1024).toFixed(1);
    return `${preparedFile.name} (${sizeKb} KB)`;
  }, [preparedFile]);

  const handleFileSelected = (file: File) => {
    setSourceFile(file);
    setPreparedFile(file);
    setShowCamera(false);
    setOcrResult(null);
    setShowRawText(false);
    setOriginalMeta(null);
    setOcrMeta(null);
    setError('');
  };

  const handleUpload = async () => {
    if (!preparedFile || !sourceFile) return;
    setLoading(true);
    setError('');
    setJobState('');
    try {
      // upload file utuh untuk penyimpanan
      const formOriginal = new FormData();
      formOriginal.append('file', sourceFile);
      const originalRes = await api.post('/files/upload', formOriginal, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setOriginalMeta(originalRes.data);

      // jika file untuk OCR sama dengan original, reuse; kalau tidak, upload versi crop
      let ocrFileMeta = originalRes.data;
      if (preparedFile !== sourceFile) {
        const formCrop = new FormData();
        formCrop.append('file', preparedFile);
        const cropRes = await api.post('/files/upload', formCrop, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        ocrFileMeta = cropRes.data;
      }
      setOcrMeta(ocrFileMeta);

      const enqueue = await api.post<OcrPreviewEnqueueResponse>(
        '/letters/ocr-preview',
        {
        fileId: ocrFileMeta.fileId,
        },
      );

      const result = await pollOcrJob(enqueue.data.jobId);
      setOcrResult(result);
      setShowRawText(false);
      toast.success('Analisis dokumen berhasil!');
    } catch {
      setError('Upload atau analisis dokumen gagal. Pastikan backend jalan dan login masih aktif.');
      toast.error('Upload atau analisis dokumen gagal. Pastikan backend jalan dan login masih aktif.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Unggah</p>
          <h1>Dokumen</h1>
          <p>Drop file, ambil dari kamera, lalu crop manual sebelum analisis.</p>
        </div>
        <button
          type="button"
          className="ghost-btn"
          onClick={() =>
            navigate('/letters/new', {
              state: { ocrResult, originalMeta, ocrMeta },
            })
          }
          disabled={!ocrResult}
        >
          Lanjut ke form
        </button>
      </div>

      <div className="grid two-col">
        <div className="card">
          <UploadBox onFileSelected={handleFileSelected} onOpenCamera={() => setShowCamera(true)} />
          {showCamera && (
            <CameraCapture
              onCapture={handleFileSelected}
              onClose={() => setShowCamera(false)}
            />
          )}
          {sourceFile && (
            <div className="card">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Manual crop</p>
          <h3>Pilih area dokumen sebelum analisis</h3>
                </div>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={handleUpload}
                  disabled={!preparedFile || loading}
                >
                  {loading ? 'Memproses...' : 'Analisis Dokumen'}
                </button>
              </div>
              <ManualCropper
                file={sourceFile}
                onCropConfirm={setPreparedFile}
                onResetToOriginal={() => setPreparedFile(sourceFile)}
              />
              <p className="small-note">File aktif: {fileLabel || '-'}</p>
            </div>
          )}
        </div>

        <div className="card">
          {loading && (
            <div className="ocr-loading">
              <div className="ocr-loading-header">
                <div className="ocr-loading-spinner"></div>
                <div>
                  <p className="ocr-loading-title">Sedang memproses dokumen...</p>
                  <p className="ocr-loading-subtitle">Mohon tunggu sebentar</p>
                </div>
              </div>

              <div className="ocr-loading-steps">
                <div className={`ocr-step ${['waiting', 'active', 'completed'].includes(jobState) ? 'active' : ''}`}>
                  <div className="step-icon"><FileText size={18} /></div>
                  <div className="step-content">
                    <span className="step-text">Upload & Konversi PDF</span>
                  </div>
                </div>
                <div className={`ocr-step ${jobState === 'active' || jobState === 'completed' ? 'active' : ''}`}>
                  <div className="step-icon"><Eye size={18} /></div>
                  <div className="step-content">
                    <span className="step-text">OCR Text Extraction</span>
                  </div>
                </div>
                <div className={`ocr-step ${jobState === 'completed' ? 'active' : ''}`}>
                  <div className="step-icon"><Brain size={18} /></div>
                  <div className="step-content">
                    <span className="step-text">AI Data Extraction</span>
                  </div>
                </div>
              </div>

              <div className="ocr-loading-info">
                <div className="info-item">
                  <Clock size={14} />
                  <span>
                    {jobState === 'waiting' && 'Menunggu antrian...'}
                    {jobState === 'active' && 'Sedang menganalisis dengan AI...'}
                    {jobState === 'delayed' && 'Antrian penuh, sistem mencoba ulang...'}
                    {!jobState && 'Memproses dokumen (OCR + AI)'}
                  </span>
                </div>
                <div className="info-item time">
                  <AlertTriangle size={14} />
                  <span>Estimasi waktu: 30 detik - 2 menit</span>
                </div>
              </div>

              <div className="ocr-loading-message info">
                <Info size={14} />
                <span>
                  <strong>Info:</strong> Proses memakan waktu karena server berada di Makassar
                  dan terhubung ke Google API. Sistem akan otomatis mencoba ulang
                  (retry 3x) kalau terjadi gangguan koneksi.
                </span>
              </div>

              <div className="ocr-loading-retry info">
                <RefreshCw size={14} />
                <span>Automatic retry: 3x percobaan</span>
              </div>
            </div>
          )}
          {error && <div className="error-box">{error}</div>}

          {originalMeta && (
            <div className="grid">
              <div>
                <h3>File Utuh</h3>
                <a href={originalMeta.urlFull} target="_blank" rel="noreferrer">
                  Lihat gambar
                </a>
              </div>
              <div>
                <h3>Hasil Analisis</h3>
                {ocrResult ? (
                  <div className="grid" style={{ gap: '0.75rem' }}>
                    <pre className="code-box">
                      {JSON.stringify(
                        { ...ocrResult, ocrRawText: '[hidden]' },
                        null,
                        2,
                      )}
                    </pre>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => setShowRawText((v) => !v)}
                    >
                      {showRawText ? 'Sembunyikan OCR Raw Text' : 'Tampilkan OCR Raw Text'}
                    </button>
                    {showRawText && (
                      <pre className="code-box" style={{ whiteSpace: 'pre-wrap' }}>
                        {ocrResult.ocrRawText || '(kosong)'}
                      </pre>
                    )}
                  </div>
                ) : (
                  <pre className="code-box">Belum ada hasil</pre>
                )}
              </div>
              {ocrMeta && preparedFile !== sourceFile && (
                <div>
                  <h3>File OCR (crop)</h3>
                  <a href={ocrMeta.urlFull} target="_blank" rel="noreferrer">
                    Lihat versi crop
                  </a>
                </div>
              )}
            </div>
          )}

          {!originalMeta && (
            <div className="card">
              <p>Belum ada upload. Pilih file atau kamera, lalu klik "Analisis Dokumen".</p>
            </div>
          )}
        </div>
      </div>
    </section>

    <style>{`
      .ocr-loading {
        padding: 1.5rem;
      }
      .ocr-loading-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid var(--border-color);
      }
      .ocr-loading-title {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
      }
      .ocr-loading-subtitle {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin: 0;
      }

      .ocr-loading-steps {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin: 1.5rem 0;
      }
      .ocr-step {
        display: flex;
        align-items: center;
        gap: 0.875rem;
        padding: 0.875rem 1rem;
        border-radius: 8px;
        background: var(--bg-secondary);
        opacity: 0.5;
        transition: all 0.3s ease;
        border: 1px solid transparent;
      }
      .ocr-step.active {
        opacity: 1;
        background: var(--bg-primary);
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1);
      }
      .step-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        min-width: 36px;
        border-radius: 8px;
        background: var(--bg-hover);
        color: var(--text-secondary);
      }
      .ocr-step.active .step-icon {
        background: var(--accent-primary);
        color: white;
      }
      .step-content {
        flex: 1;
      }
      .step-text {
        font-weight: 500;
        color: var(--text-primary);
        font-size: 0.875rem;
      }

      .ocr-loading-info {
        display: flex;
        flex-direction: column;
        gap: 0.625rem;
        margin: 1.5rem 0;
        padding: 0.75rem 1rem;
        background: var(--bg-secondary);
        border-radius: 8px;
      }
      .info-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: var(--text-primary);
      }
      .info-item svg {
        flex-shrink: 0;
        color: var(--text-secondary);
      }
      .info-item.time svg {
        color: var(--accent-primary);
      }

      .ocr-loading-message {
        display: flex;
        align-items: flex-start;
        gap: 0.625rem;
        margin-top: 1rem;
        padding: 0.875rem 1rem;
        background: rgba(59, 130, 246, 0.05);
        border: 1px solid rgba(59, 130, 246, 0.1);
        border-radius: 8px;
        font-size: 0.813rem;
        color: var(--text-secondary);
        line-height: 1.6;
      }
      .ocr-loading-message svg {
        flex-shrink: 0;
        color: var(--accent-primary);
        margin-top: 0.125rem;
      }
      .ocr-loading-message strong {
        color: var(--text-primary);
        font-weight: 600;
      }

      .ocr-loading-retry {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.75rem;
        padding: 0.625rem 0.875rem;
        background: rgba(16, 185, 129, 0.08);
        border: 1px solid rgba(16, 185, 129, 0.2);
        border-radius: 6px;
        font-size: 0.75rem;
        color: #059669;
        font-weight: 500;
      }
      .ocr-loading-retry svg {
        flex-shrink: 0;
      }

      /* Mobile Responsive */
      @media (max-width: 640px) {
        .ocr-loading {
          padding: 1rem;
        }
        .ocr-loading-header {
          gap: 0.75rem;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
        }
        .ocr-loading-spinner {
          width: 40px;
          height: 40px;
          border-width: 2.5px;
        }
        .ocr-loading-title {
          font-size: 0.938rem;
        }
        .ocr-loading-subtitle {
          font-size: 0.813rem;
        }
        .ocr-loading-steps {
          gap: 0.625rem;
          margin: 1rem 0;
        }
        .ocr-step {
          padding: 0.625rem 0.875rem;
          gap: 0.625rem;
        }
        .step-icon {
          width: 32px;
          height: 32px;
          min-width: 32px;
        }
        .step-icon svg {
          width: 16px;
          height: 16px;
        }
        .step-text {
          font-size: 0.813rem;
        }
        .ocr-loading-info {
          gap: 0.5rem;
          margin: 1rem 0;
          padding: 0.625rem 0.875rem;
        }
        .info-item {
          font-size: 0.813rem;
          gap: 0.375rem;
        }
        .info-item svg {
          width: 13px;
          height: 13px;
        }
        .ocr-loading-message {
          gap: 0.5rem;
          margin-top: 0.875rem;
          padding: 0.75rem;
          font-size: 0.75rem;
        }
        .ocr-loading-message svg {
          width: 13px;
          height: 13px;
        }
        .ocr-loading-retry {
          gap: 0.375rem;
          margin-top: 0.625rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.688rem;
        }
        .ocr-loading-retry svg {
          width: 12px;
          height: 12px;
        }
      }

      /* Extra Small Mobile */
      @media (max-width: 374px) {
        .ocr-loading {
          padding: 0.875rem;
        }
        .ocr-loading-header {
          gap: 0.625rem;
        }
        .ocr-loading-spinner {
          width: 36px;
          height: 36px;
          border-width: 2px;
        }
        .ocr-loading-title {
          font-size: 0.875rem;
        }
        .ocr-loading-subtitle {
          font-size: 0.75rem;
        }
        .ocr-loading-steps {
          gap: 0.5rem;
          margin: 0.875rem 0;
        }
        .ocr-step {
          padding: 0.5rem 0.75rem;
          gap: 0.5rem;
        }
        .step-icon {
          width: 28px;
          height: 28px;
          min-width: 28px;
        }
        .step-icon svg {
          width: 14px;
          height: 14px;
        }
        .step-text {
          font-size: 0.75rem;
        }
        .ocr-loading-info {
          gap: 0.375rem;
          margin: 0.875rem 0;
          padding: 0.5rem 0.75rem;
        }
        .info-item {
          font-size: 0.75rem;
          gap: 0.25rem;
        }
        .info-item svg {
          width: 12px;
          height: 12px;
        }
        .ocr-loading-message {
          gap: 0.375rem;
          padding: 0.625rem 0.75rem;
          font-size: 0.688rem;
        }
        .ocr-loading-message svg {
          width: 12px;
          height: 12px;
        }
        .ocr-loading-retry {
          gap: 0.25rem;
          padding: 0.375rem 0.625rem;
          font-size: 0.625rem;
        }
        .ocr-loading-retry svg {
          width: 10px;
          height: 10px;
        }
      }
    `}</style>
    </>
  );
}
