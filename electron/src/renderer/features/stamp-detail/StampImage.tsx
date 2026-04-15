import { useEffect, useState, useCallback, type DragEvent } from 'react';
import { Button } from '@renderer/components/primitives';

interface Props {
  filename: string | null;
  onChange: (filename: string | null) => void;
}

export function StampImage({ filename, onChange }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!filename) {
      setDataUrl(null);
      return;
    }
    void window.hinged.images.dataUrl(filename).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [filename]);

  const chooseFile = async () => {
    const result = await window.hinged.images.pickAndSave();
    if (result.ok) onChange(result.filename);
  };

  const remove = async () => {
    if (!filename) return;
    if (!confirm('Remove this image?')) return;
    await window.hinged.images.delete(filename);
    onChange(null);
  };

  const acceptFile = useCallback(
    async (file: File) => {
      const ab = await file.arrayBuffer();
      const filenameSaved = await window.hinged.images.saveBuffer(
        new Uint8Array(ab),
        filename,
      );
      onChange(filenameSaved);
    },
    [filename, onChange],
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void acceptFile(file);
  };

  return (
    <div
      className={`stamp-image-box ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {dataUrl ? (
        <>
          <img src={dataUrl} alt="Stamp" />
          <div className="stamp-image-actions">
            <Button onClick={() => void chooseFile()}>Replace</Button>
            <Button variant="danger" onClick={() => void remove()}>
              Remove
            </Button>
          </div>
        </>
      ) : (
        <div className="stamp-image-placeholder">
          <div className="subtle small">Drop an image here, or</div>
          <Button onClick={() => void chooseFile()}>Choose File…</Button>
        </div>
      )}
    </div>
  );
}
