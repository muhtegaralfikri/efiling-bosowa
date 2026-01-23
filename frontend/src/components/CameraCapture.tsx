import { useEffect, useRef, useState } from 'react';

interface Props {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    setError('');
    try {
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
          // Don't show error here as stream is active
        }
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setError('Kamera tidak bisa diakses. Cek izin browser.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };
    // ... (rest of methods)

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
    if (!blob) return;
    const file = new File([blob], `capture_${Date.now()}.png`, { type: 'image/png' });
    onCapture(file);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="camera-box">
      <div className="camera-header">
        <div>
          <p className="eyebrow">Kamera</p>
          <h3>Ambil foto dokumen</h3>
        </div>
        <div className="actions">
          <button type="button" className="ghost-btn" onClick={handleClose}>
            Tutup
          </button>
        </div>
      </div>
      {error && <div className="error-box">{error}</div>}
      <div className="camera-preview">
        <video ref={videoRef} playsInline muted />
      </div>
      <div className="actions">
        <button type="button" className="ghost-btn" onClick={handleCapture}>
          Ambil foto
        </button>
        <button type="button" className="ghost-btn" onClick={startCamera}>
          Restart kamera
        </button>
      </div>
    </div>
  );
}
