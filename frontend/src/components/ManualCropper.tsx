import type { PointerEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText } from 'lucide-react';

interface Props {
  file: File;
  onCropConfirm: (file: File) => void;
  onResetToOriginal: () => void;
}

interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ManualCropper({ file, onCropConfirm, onResetToOriginal }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const isMobile =
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const isPdf = useMemo(() => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'), [file]);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
    return () => setPreviewUrl('');
  }, [file]);

  const canCrop = useMemo(
    () => !isPdf && selection && selection.width > 10 && selection.height > 10,
    [isPdf, selection],
  );

  const handlePointerDown = (evt: PointerEvent<HTMLDivElement>) => {
    if (isPdf) return; // No cropping for PDF
    const rect = evt.currentTarget.getBoundingClientRect();
    startRef.current = { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
    setSelection({ x: startRef.current.x, y: startRef.current.y, width: 0, height: 0 });
    setDragging(true);
  };

  const handlePointerMove = (evt: PointerEvent<HTMLDivElement>) => {
    if (!dragging || !startRef.current || isPdf) return;
    const rect = evt.currentTarget.getBoundingClientRect();
    const currentX = evt.clientX - rect.left;
    const currentY = evt.clientY - rect.top;
    const width = currentX - startRef.current.x;
    const height = currentY - startRef.current.y;
    setSelection({
      x: Math.min(startRef.current.x, currentX),
      y: Math.min(startRef.current.y, currentY),
      width: Math.abs(width),
      height: Math.abs(height),
    });
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  const performCrop = async () => {
    if (!selection || !imgRef.current || isPdf) return;
    const img = imgRef.current;
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(selection.width * scaleX);
    canvas.height = Math.round(selection.height * scaleY);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      img,
      selection.x * scaleX,
      selection.y * scaleY,
      selection.width * scaleX,
      selection.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
    if (!blob) return;

    const croppedFile = new File([blob], `cropped_${file.name}`, { type: 'image/png' });
    onCropConfirm(croppedFile);
  };

  // PDF Preview Mode
  if (isPdf) {
    return (
      <div className="cropper">
        <div className="pdf-preview-container">
          <div className="pdf-preview-info">
            <FileText size={48} />
            <h3>Dokumen PDF</h3>
            <p>
              {isMobile
                ? 'Preview PDF tidak didukung di browser mobile. Cropping tidak tersedia untuk PDF.'
                : 'Preview PDF - Cropping tidak tersedia untuk PDF'}
            </p>
          </div>
          {!isMobile && previewUrl && (
            <embed
              src={previewUrl}
              type="application/pdf"
              width="100%"
              height="400"
              className="pdf-preview-embed"
            />
          )}
        </div>
        <div className="actions">
          <button type="button" className="ghost-btn" onClick={onResetToOriginal}>
            Pakai file asli
          </button>
        </div>
        <style>{`
          .pdf-preview-container {
            background: var(--bg-secondary);
            border: 2px dashed var(--border-color);
            border-radius: 8px;
            overflow: hidden;
          }
          .pdf-preview-info {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            padding: 1.5rem;
            color: var(--text-secondary);
          }
          .pdf-preview-info h3 {
            margin: 0;
            color: var(--text-primary);
          }
          .pdf-preview-info p {
            margin: 0;
            font-size: 0.875rem;
          }
          .pdf-preview-embed {
            border: none;
            border-top: 1px solid var(--border-color);
          }
        `}</style>
      </div>
    );
  }

  // Image Preview Mode (with cropping)
  return (
    <div className="cropper">
      <div
        className="cropper-preview"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {previewUrl && <img ref={imgRef} src={previewUrl} alt="preview" draggable={false} />}
        {selection && (
          <div
            className="crop-rect"
            style={{
              left: selection.x,
              top: selection.y,
              width: selection.width,
              height: selection.height,
            }}
          />
        )}
      </div>
      <div className="actions">
        <button type="button" className="ghost-btn" onClick={() => setSelection(null)}>
          Reset area
        </button>
        <button type="button" className="ghost-btn" onClick={onResetToOriginal}>
          Pakai gambar asli
        </button>
        <button type="button" className="gradient-action-btn" onClick={performCrop} disabled={!canCrop}>
          Gunakan hasil crop
        </button>
      </div>
    </div>
  );
}

