import { useCallback, useState } from 'react';
import { UploadCloud, Image, Camera } from 'lucide-react';

interface Props {
  onFileSelected: (file: File) => void;
  onOpenCamera?: () => void;
}

export default function UploadBox({ onFileSelected, onOpenCamera }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleSelect = useCallback(
    (files: FileList | null) => {
      if (files && files[0]) {
        onFileSelected(files[0]);
      }
    },
    [onFileSelected],
  );

  return (
    <div
      className={`upload-box ${isDragging ? 'dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleSelect(e.dataTransfer.files);
      }}
    >
      <input
        type="file"
        accept="image/*,.pdf"
        onChange={(e) => handleSelect(e.target.files)}
        id="file-upload"
      />
      
      <div className="upload-content">
        <div className="icon-wrapper">
          <UploadCloud size={48} strokeWidth={1.5} />
        </div>
        
        <div className="text-content">
          <h3>Upload Dokumen</h3>
          <p>Tarik file ke sini atau klik untuk jelajahi</p>
        </div>

        <div className="upload-tips">
          <div className="tip-item">
            <Image size={14} />
            <span>JPG, PNG, PDF</span>
          </div>
          <div className="tip-divider">•</div>
          <div className="tip-item">
            <Camera size={14} />
            <span>Scan Kamera</span>
          </div>
        </div>

        {onOpenCamera && (
          <button type="button" className="camera-btn" onClick={(e) => {
            e.stopPropagation();
            onOpenCamera();
          }}>
            <Camera size={18} />
            <span>Buka Kamera</span>
          </button>
        )}
      </div>

      <style>{`
        .upload-box {
          position: relative;
          width: 100%;
          min-height: 320px;
          border-radius: 24px;
          border: 2px dashed var(--border-color);
          background: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          overflow: hidden;
        }

        .upload-box:hover {
          border-color: var(--accent-primary);
          background: var(--bg-hover);
          transform: translateY(-2px);
        }

        .upload-box.dragging {
          border-color: var(--accent-primary);
          background: rgba(59, 130, 246, 0.05);
          border-style: solid;
          transform: scale(1.01);
          box-shadow: 0 10px 30px -10px rgba(59, 130, 246, 0.2);
        }

        .upload-box input {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
          z-index: 10;
        }

        .upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          padding: 2rem;
          text-align: center;
          pointer-events: none; /* Let clicks pass to input */
        }

        .icon-wrapper {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: var(--bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          transition: transform 0.3s ease;
        }

        .upload-box:hover .icon-wrapper {
          transform: scale(1.1) rotate(5deg);
        }

        .text-content h3 {
          font-family: 'Sora', sans-serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 0.5rem 0;
        }

        .text-content p {
          font-size: 0.938rem;
          color: var(--text-secondary);
          margin: 0;
        }

        .upload-tips {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 1rem;
          background: var(--bg-primary);
          border-radius: 99px;
          border: 1px solid var(--border-color);
        }

        .tip-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .tip-divider {
          color: var(--border-color);
        }

        .camera-btn {
          pointer-events: auto; /* Re-enable clicks */
          position: relative;
          z-index: 20;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          margin-top: 0.5rem;
          font-family: 'Sora', sans-serif;
          box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
        }

        .camera-btn:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.45);
        }

        .camera-btn:active {
          transform: translateY(-1px) scale(0.98);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        }

        html.dark .upload-box {
          background: rgba(255, 255, 255, 0.02);
          border-color: rgba(255, 255, 255, 0.1);
        }
        
        html.dark .upload-box:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: var(--accent-primary);
        }

        html.dark .icon-wrapper {
          background: rgba(255, 255, 255, 0.05);
          box-shadow: none;
        }

        html.dark .upload-tips {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
        }

        html.dark .camera-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border: none;
          color: white;
          box-shadow: 0 4px 14px rgba(59, 130, 246, 0.25);
        }

        html.dark .camera-btn:hover {
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
        }

        /* Mobile Responsive */
        @media (max-width: 640px) {
          .upload-box {
            min-height: 260px;
            border-radius: 16px;
          }
          
          .upload-content {
            padding: 1.5rem;
            gap: 1rem;
          }

          .icon-wrapper {
            width: 72px;
            height: 72px;
          }

          .text-content h3 {
            font-size: 1.125rem;
          }
          
          .text-content p {
            font-size: 0.875rem;
          }

          .upload-tips {
            flex-direction: column;
            gap: 0.5rem;
            padding: 0.75rem;
            border-radius: 12px;
            width: 100%;
            background: var(--bg-primary);
          }

          .tip-divider {
            display: none;
          }
          
          .tip-item {
            width: 100%;
            justify-content: center;
            padding: 0 0.5rem;
          }
          
          .camera-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
