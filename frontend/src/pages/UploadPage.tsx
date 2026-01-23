import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Eye, Brain, Clock, 
  Check, ChevronDown, ChevronUp, Copy, Sparkles, ArrowRight
} from 'lucide-react';
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
  const [jobState, setJobState] = useState<string>('');
  const [activeStep, setActiveStep] = useState(0); // 0: Upload, 1: Crop, 2: Process, 3: Result

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
    setActiveStep(1); // Go to Crop step
  };

  const handleUpload = async () => {
    if (!preparedFile || !sourceFile) return;
    setLoading(true);
    setActiveStep(2); // Go to Process step
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
      setActiveStep(3); // Go to Result step
      toast.success('Analisis dokumen berhasil!');
    } catch {
      toast.error('Upload atau analisis dokumen gagal. Pastikan backend jalan dan login masih aktif.');
      setActiveStep(1); // Back to crop on error
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Disalin ke clipboard');
  };

  return (
    <div className="upload-page-wrapper">
      <section className="panel upload-panel">
        {/* Header */}
        <header className="page-header">
          <div className="header-content">
            <span className="premium-badge">
              <Sparkles size={14} fill="currentColor" />
              AI Powered
            </span>
            <h1>Analisis Dokumen</h1>
            <p>Upload, crop, dan biarkan AI mengekstrak data surat secara otomatis.</p>
          </div>
        </header>

        {/* Dynamic Content based on Steps */}
        <div className="content-area">
          {/* Step 0: Upload */}
          {!sourceFile && (
            <div className={`step-container ${activeStep === 0 ? 'active' : ''}`}>
              <UploadBox onFileSelected={handleFileSelected} onOpenCamera={() => setShowCamera(true)} />
            </div>
          )}

          {/* Camera Modal */}
          {showCamera && (
            <CameraCapture
              onCapture={handleFileSelected}
              onClose={() => setShowCamera(false)}
            />
          )}

          {/* Step 1: Crop & Preview */}
          {sourceFile && !loading && !ocrResult && (
            <div className="crop-section animate-in">
              <div className="section-header">
                <div>
                  <h2>Sesuaikan Area</h2>
                  <p>Pastikan teks dokumen terbaca jelas</p>
                </div>
                <button
                  type="button"
                  className="ghost-btn danger"
                  onClick={() => {
                    setSourceFile(null);
                    setPreparedFile(null);
                    setActiveStep(0);
                  }}
                >
                  Ganti File
                </button>
              </div>

              <div className="cropper-card">
                <ManualCropper
                  file={sourceFile}
                  onCropConfirm={setPreparedFile}
                  onResetToOriginal={() => setPreparedFile(sourceFile)}
                />
              </div>

              <div className="action-bar">
                <div className="file-info">
                  <div className="file-icon">
                    <FileText size={18} />
                  </div>
                  <span>{fileLabel}</span>
                </div>
                <button
                  className="primary-btn lg"
                  onClick={handleUpload}
                  disabled={!preparedFile}
                >
                  <span>Mulai Analisis AI</span>
                  <Brain size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Processing (Loading) */}
          {loading && (
            <div className="processing-section animate-in">
              <div className="loading-card">
                <div className="loading-animation">
                  <div className="pulse-ring"></div>
                  <Brain size={48} className="brain-icon" />
                </div>
                <h2>Sedang Menganalisis...</h2>
                <p>AI sedang membaca dan mengekstrak data dari dokumen Anda</p>

                <div className="processing-steps">
                   <div className={`proc-step ${['waiting', 'active', 'completed'].includes(jobState || '') ? 'completed' : 'active'}`}>
                     <div className="step-indicator"><Check size={14} /></div>
                     <span>Upload & Pre-processing</span>
                   </div>
                   <div className={`proc-step ${['active', 'completed'].includes(jobState || '') ? (jobState === 'completed' ? 'completed' : 'active') : ''}`}>
                     <div className="step-indicator">{jobState === 'completed' ? <Check size={14}/> : <div className="spinner-dot"/>}</div>
                     <span>OCR Text Extraction</span>
                   </div>
                   <div className={`proc-step ${jobState === 'completed' ? 'completed' : (['active'].includes(jobState || '') ? 'active' : '')}`}>
                     <div className="step-indicator">{jobState === 'completed' ? <Check size={14}/> : <div className="spinner-dot"/>}</div>
                     <span>AI Data Structuring</span>
                   </div>
                </div>

                {jobState === 'delayed' && (
                  <div className="delay-notice">
                    <Clock size={16} />
                    <span>Antrian padat, estimasi &lt; 2 menit...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Result */}
          {ocrResult && (
            <div className="result-section animate-in">
              <div className="success-banner">
                <div className="icon-circle success">
                  <Check size={24} />
                </div>
                <div>
                  <h2>Analisis Selesai!</h2>
                  <p>Data berhasil diekstrak. Silakan review sebelum lanjut.</p>
                </div>
              </div>

              <div className="result-grid">
                <div className="code-viewer">
                  <div className="code-header">
                    <span>Hasil Ekstraksi (JSON)</span>
                    <button 
                      className="icon-btn small" 
                      onClick={() => copyToClipboard(JSON.stringify(ocrResult, null, 2))}
                      title="Salin JSON"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <pre className="code-content">
                    {JSON.stringify({ ...ocrResult, ocrRawText: '[hidden]' }, null, 2)}
                  </pre>
                </div>

                <div className="actions-card">
                  <h3>Langkah Selanjutnya</h3>
                  <button
                    className="primary-btn full"
                    onClick={() =>
                      navigate('/letters/new', {
                        state: { ocrResult, originalMeta, ocrMeta },
                      })
                    }
                  >
                    <span>Buat Surat dari Data Ini</span>
                    <ArrowRight size={18} />
                  </button>
                  
                  <div className="secondary-actions">
                    <button 
                      className="outline-btn small"
                      onClick={() => setShowRawText(!showRawText)}
                    >
                      {showRawText ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                      {showRawText ? 'Tutup Raw Text' : 'Lihat Raw Text'}
                    </button>
                    
                    {originalMeta && (
                      <a 
                        href={originalMeta.urlFull} 
                        target="_blank" 
                        rel="noreferrer"
                        className="outline-btn small"
                      >
                         <Eye size={16} />
                         Lihat File Asli
                      </a>
                    )}
                  </div>

                  {showRawText && (
                    <div className="raw-text-viewer animate-in">
                      <pre>{ocrResult.ocrRawText || '(kosong)'}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <style>{`
        .upload-page-wrapper {
          min-height: calc(100vh - 80px);
          display: flex;
          justify-content: center;
          /* Remove gradient background to respect global theme or apply subtle bg */
        }

        .upload-panel {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          /* Inherits .panel styles (bg, border, shadow) */
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
        }

        .page-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding-bottom: 2rem;
          border-bottom: 1px solid var(--border-color);
        }

        .header-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .premium-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.875rem;
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent-primary);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .header-content h1 {
          font-family: 'Sora', sans-serif;
          font-size: 2.5rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, var(--text-primary) 30%, var(--text-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }

        .header-content p {
          font-size: 1.125rem;
          color: var(--text-secondary);
          max-width: 500px;
          line-height: 1.6;
          margin: 0;
        }

        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-in {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Crop Section */
        .crop-section {
          background: var(--bg-primary); /* Ensure contrast against panel if needed, or transparent */
          border-radius: 16px;
          border: 1px solid var(--border-color);
          overflow: hidden;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid var(--border-color);
        }

        .section-header h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 0.25rem 0;
          font-family: 'Sora', sans-serif;
        }

        .section-header p {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0;
        }

        .cropper-card {
          padding: 2rem;
          background: var(--bg-secondary);
        }

        .action-bar {
          padding: 1.25rem 2rem;
          background: var(--bg-primary);
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .file-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
        }

        .primary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: var(--accent-primary);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: 'Sora', sans-serif;
        }

        .primary-btn:hover {
          background: var(--accent-hover);
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(var(--accent-rgb), 0.25);
        }
        
        .primary-btn:active {
          transform: translateY(0);
        }
        
        .primary-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .primary-btn.lg {
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
        }

        .primary-btn.full {
          width: 100%;
        }

        .ghost-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          padding: 0.5rem 1rem;
          border-radius: 8px;
        }

        .ghost-btn:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }
        
        .ghost-btn.danger:hover {
          background: #fef2f2;
          color: #ef4444;
        }

        .outline-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: transparent;
          border: 1px solid var(--border-color);
          border-radius: 10px;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }

        .outline-btn:hover {
          border-color: var(--text-primary);
          color: var(--text-primary);
          background: var(--bg-hover);
          transform: translateY(-1px);
        }

        /* Processing Section */
        .processing-section {
          text-align: center;
          padding: 3rem 0;
        }

        .loading-animation {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pulse-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid var(--accent-primary);
          opacity: 0.5;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        .brain-icon {
          color: var(--accent-primary);
          z-index: 2;
        }

        .loading-card h2 {
          font-family: 'Sora', sans-serif;
          font-size: 1.5rem;
          margin: 0 0 0.5rem;
        }

        .processing-steps {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-width: 300px;
          margin: 2rem auto;
          text-align: left;
        }

        .proc-step {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border-radius: 12px;
          opacity: 0.5;
          transition: all 0.3s;
        }

        .proc-step.active, .proc-step.completed {
          opacity: 1;
          background: var(--bg-primary);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .step-indicator {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--bg-hover);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .proc-step.completed .step-indicator {
          background: #10b981;
          color: white;
        }

        .spinner-dot {
          width: 8px;
          height: 8px;
          background: var(--accent-primary);
          border-radius: 50%;
          animation: bounce 1s infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: scale(0.5); opacity: 0.5; }
          50% { transform: scale(1); opacity: 1; }
        }

        /* Result Section */
        .success-banner {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.5rem;
          background: linear-gradient(to right, rgba(16, 185, 129, 0.1), transparent);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 16px;
          margin-bottom: 2rem;
        }

        .icon-circle.success {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #10b981;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .result-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }

        .code-viewer {
          background: #1e293b;
          border-radius: 16px;
          overflow: hidden;
          color: #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .code-header {
          padding: 0.75rem 1rem;
          background: rgba(255,255,255,0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: #94a3b8;
        }

        .code-content {
          padding: 1rem;
          margin: 0;
          overflow: auto;
          max-height: 400px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.813rem;
          line-height: 1.5;
        }

        .actions-card {
          background: var(--bg-primary);
          padding: 1.5rem;
          border-radius: 16px;
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 1rem;
          height: fit-content;
        }

        .actions-card h3 {
          font-size: 1rem;
          margin: 0;
          font-family: 'Sora', sans-serif;
        }

        .secondary-actions {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .raw-text-viewer {
          background: var(--bg-secondary);
          padding: 1rem;
          border-radius: 8px;
          font-size: 0.75rem;
          max-height: 200px;
          overflow: auto;
          white-space: pre-wrap;
          border: 1px solid var(--border-color);
        }

        .icon-btn {
          background: transparent;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background 0.2s;
        }
        
        .icon-btn:hover {
          background: rgba(255,255,255,0.1);
        }

        /* Dark Mode overrides */
        html.dark .upload-panel {
           background: #1e293b; /* dark slate */
           border-color: rgba(255,255,255,0.1);
        }

        html.dark .header-content h1 {
           background: linear-gradient(135deg, #fff 30%, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        html.dark .ghost-btn.danger:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .result-grid {
            grid-template-columns: 1fr;
          }
          .upload-panel {
            padding: 1.5rem;
          }
        }
        
        @media (max-width: 640px) {
          .upload-panel {
            padding: 1.25rem;
            gap: 1.5rem;
          }
          .header-content h1 {
            font-size: 1.75rem;
          }
          .header-content p {
            font-size: 1rem;
          }
          .section-header {
            padding: 1rem;
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }
          .section-header button {
            width: 100%;
            justify-content: center;
          }
          .action-bar {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
            padding: 1rem;
          }
          .primary-btn.lg {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
