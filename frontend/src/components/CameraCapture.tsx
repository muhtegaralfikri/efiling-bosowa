import { useEffect, useRef, useState } from 'react';
import { X, RefreshCw, Check, Image as ImageIcon } from 'lucide-react';

interface Props {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    setError('');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      
      streamRef.current = media;
      
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn('Video play failed:', e);
        }
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setError('Kamera tidak dapat diakses.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Mirror if using front camera (optional, stick to standard for back camera focus)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
    if (!blob) return;
    
    const file = new File([blob], `capture_${Date.now()}.png`, { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    
    setCapturedImage(url);
    setCapturedFile(file);
    stopCamera(); // Stop stream to save battery while reviewing
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedFile) {
      onCapture(capturedFile);
      onClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="camera-overlay">
      <div className="camera-container">
        {/* Header Control */}
        <div className="camera-top-bar">
          <div className="badge">Mode Dokumen</div>
          <button onClick={handleClose} className="close-btn">
            <X size={24} />
          </button>
        </div>

        {/* Main Viewfinder */}
        <div className="viewfinder">
          {error ? (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={startCamera} className="retry-btn">Coba Lagi</button>
            </div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured" className="preview-image" />
          ) : (
            <>
              <video ref={videoRef} playsInline muted className="live-feed" />
              <div className="grid-overlay">
                <div className="grid-line h-1"></div>
                <div className="grid-line h-2"></div>
                <div className="grid-line v-1"></div>
                <div className="grid-line v-2"></div>
              </div>
            </>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="camera-bottom-bar">
          {capturedImage ? (
            <div className="review-actions">
              <button onClick={handleRetake} className="action-btn secondary">
                <RefreshCw size={20} />
                <span>Foto Ulang</span>
              </button>
              <button onClick={handleConfirm} className="action-btn primary">
                <Check size={24} />
                <span>Gunakan Foto</span>
              </button>
            </div>
          ) : (
            <div className="capture-actions">
               <button className="utility-btn hidden-mobile" disabled>
                 <ImageIcon size={20} />
               </button>
               
               <button onClick={handleCapture} className="shutter-btn">
                 <div className="shutter-inner" />
               </button>

               <button 
                 className="utility-btn" 
                 onClick={() => {
                   setIsSwitching(true);
                   setTimeout(() => {
                     startCamera();
                     setIsSwitching(false);
                   }, 300);
                 }}
               >
                 <RefreshCw size={20} className={isSwitching ? 'spin' : ''} />
               </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .camera-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .camera-container {
          width: 100%;
          height: 100%;
          max-width: 600px; /* Constrain max width for desktop aesthetics */
          position: relative;
          display: flex;
          flex-direction: column;
          background: #000;
        }

        /* Top Bar */
        .camera-top-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 20;
          background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent);
        }

        .badge {
          padding: 4px 12px;
          background: rgba(255,255,255,0.2);
          backdrop-filter: blur(4px);
          border-radius: 99px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          letter-spacing: 0.05em;
        }

        .close-btn {
          background: rgba(0,0,0,0.3);
          border: none;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(4px);
          transition: background 0.2s;
        }

        .close-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        /* Viewfinder */
        .viewfinder {
          flex: 1;
          position: relative;
          overflow: hidden;
          background: #1a1a1a;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .live-feed, .preview-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .error-message {
          text-align: center;
          color: white;
          padding: 2rem;
        }

        .retry-btn {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        /* Grid Overlay */
        .grid-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.3;
        }

        .grid-line {
          position: absolute;
          background: rgba(255,255,255,0.5);
        }

        .h-1 { top: 33.33%; left: 0; right: 0; height: 1px; }
        .h-2 { top: 66.66%; left: 0; right: 0; height: 1px; }
        .v-1 { left: 33.33%; top: 0; bottom: 0; width: 1px; }
        .v-2 { left: 66.66%; top: 0; bottom: 0; width: 1px; }

        /* Bottom Controls */
        .camera-bottom-bar {
          padding: 2rem;
          background: #000;
          min-height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 20;
        }

        .capture-actions {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 320px;
        }

        .shutter-btn {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: transparent;
          border: 4px solid white;
          padding: 4px;
          cursor: pointer;
          transition: transform 0.1s;
        }

        .shutter-btn:active {
          transform: scale(0.95);
        }

        .shutter-inner {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: white;
          transition: background 0.2s;
        }

        .shutter-btn:active .shutter-inner {
          background: #e5e5e5;
        }

        .utility-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .utility-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        .spin {
          animation: spin 0.5s ease-in-out;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(180deg); }
        }

        /* Review Actions */
        .review-actions {
          display: flex;
          gap: 1rem;
          width: 100%;
        }

        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 12px;
          font-weight: 600;
          font-family: 'Sora', sans-serif;
          cursor: pointer;
          border: none;
        }

        .action-btn.primary {
          background: white;
          color: black;
        }

        .action-btn.secondary {
          background: rgba(255,255,255,0.15);
          color: white;
        }

        .hidden-mobile {
          visibility: hidden; /* Keep alignment */
        }
      `}</style>
    </div>
  );
}
