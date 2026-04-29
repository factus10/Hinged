// Multi-image gallery for a stamp.
//
// Mental model:
//   - The thumbnail strip lists every image, primary first.
//   - The big "viewer" panel above the strip shows whichever image is
//     currently selected. By default that's the primary.
//   - Selection is independent of "primary" — clicking a thumbnail
//     just changes what the viewer shows. To change the primary you
//     drag the image to the front of the strip, or click the star
//     button in the viewer's action row.
//   - The caption field belongs to the currently-viewed image, so the
//     user can edit any image's caption without first promoting it.
//   - The magnifier button opens the lightbox at full resolution; the
//     lightbox can also page through all images.

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { Button } from '@renderer/components/primitives';
import {
  useAddStampImage,
  useDeleteStampImage,
  useReorderStampImages,
  useReplaceStampImageFile,
  useSetPrimaryStampImage,
  useSetStampImageCaption,
  useStampImages,
} from '@renderer/lib/api';
import type { StampImage } from '@shared/types';

interface Props {
  stampId: number;
}

export function StampImageGallery({ stampId }: Props) {
  const { data: images = [] } = useStampImages(stampId);
  const addImage = useAddStampImage();
  const deleteImage = useDeleteStampImage();
  const reorder = useReorderStampImages();
  const setCaption = useSetStampImageCaption();
  const replaceFile = useReplaceStampImageFile();
  const setPrimary = useSetPrimaryStampImage();

  // Currently-viewed thumbnail index. Reset to 0 (the primary) whenever
  // the stamp itself changes, since the previous index would point at
  // a different stamp's image.
  const [viewIndex, setViewIndex] = useState(0);
  const prevStampId = useRef(stampId);
  if (prevStampId.current !== stampId) {
    prevStampId.current = stampId;
    if (viewIndex !== 0) setViewIndex(0);
  }
  // Clamp viewIndex if images shrinks (e.g. after a delete).
  useEffect(() => {
    if (viewIndex >= images.length && images.length > 0) {
      setViewIndex(images.length - 1);
    }
  }, [images.length, viewIndex]);

  const current = images[viewIndex] ?? null;

  const onAcceptFile = async (file: File): Promise<void> => {
    const ab = await file.arrayBuffer();
    const filename = await window.hinged.images.saveBuffer(new Uint8Array(ab), null);
    addImage.mutate({ stampId, filename });
  };

  const pickFile = async (): Promise<void> => {
    const result = await window.hinged.images.pickAndSave();
    if (result.ok) addImage.mutate({ stampId, filename: result.filename });
  };

  const removeImage = (img: StampImage): void => {
    if (!confirm('Remove this image?')) return;
    const oldFilename = img.filename;
    deleteImage.mutate(
      { imageId: img.id, stampId },
      {
        onSuccess: () => {
          void window.hinged.images.delete(oldFilename);
        },
      },
    );
  };

  // Lightbox state: opens on the currently-viewed image, then has its
  // own arrow-key navigation.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // ---------- DnD reorder ----------
  // Drop position is an integer in [0, images.length] representing the
  // gap between thumbs where the dragged image will land. We render a
  // Gap element at every such position; the active one expands to a
  // thumb-sized placeholder, which physically pushes neighboring
  // thumbs out of the way. This is more tactile than a thin "between
  // these two" indicator bar and matches the macOS Finder pattern.
  const [dropPosition, setDropPosition] = useState<number | null>(null);

  // Auto-scroll: when the cursor approaches the strip's left/right
  // edge during a drag, scroll the strip in that direction at a steady
  // rate. Driven by requestAnimationFrame so it stays smooth.
  const stripRef = useRef<HTMLDivElement>(null);
  const autoScrollDir = useRef<-1 | 0 | 1>(0);
  const autoScrollRaf = useRef<number>(0);
  const stopAutoScroll = (): void => {
    autoScrollDir.current = 0;
    if (autoScrollRaf.current) {
      cancelAnimationFrame(autoScrollRaf.current);
      autoScrollRaf.current = 0;
    }
  };
  const tickAutoScroll = (): void => {
    const el = stripRef.current;
    if (!el || autoScrollDir.current === 0) {
      autoScrollRaf.current = 0;
      return;
    }
    el.scrollLeft += autoScrollDir.current * 8;
    autoScrollRaf.current = requestAnimationFrame(tickAutoScroll);
  };
  const updateAutoScroll = (clientX: number): void => {
    const el = stripRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const EDGE = 40;
    let dir: -1 | 0 | 1 = 0;
    if (clientX < rect.left + EDGE) dir = -1;
    else if (clientX > rect.right - EDGE) dir = 1;
    autoScrollDir.current = dir;
    if (dir !== 0 && autoScrollRaf.current === 0) {
      autoScrollRaf.current = requestAnimationFrame(tickAutoScroll);
    } else if (dir === 0) {
      stopAutoScroll();
    }
  };

  const onDragStart = (e: DragEvent<HTMLDivElement>, id: number): void => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-hinged-image-id', String(id));
  };

  // Compute drop position from cursor X over a specific thumb. The
  // strip's wrapper-level handler also computes (for cursor over the
  // gaps themselves), but per-thumb resolution is more responsive.
  const onDragOverThumb = (e: DragEvent<HTMLDivElement>, targetIdx: number): void => {
    if (!e.dataTransfer.types.includes('application/x-hinged-image-id')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const after = e.clientX >= rect.left + rect.width / 2;
    const next = targetIdx + (after ? 1 : 0);
    setDropPosition((cur) => (cur === next ? cur : next));
    updateAutoScroll(e.clientX);
  };

  // Allow dropping directly on the gap elements between thumbs (and
  // before the first / after the last). This is the obvious target
  // when the user has aimed precisely at a gap.
  const onDragOverGap = (e: DragEvent<HTMLDivElement>, position: number): void => {
    if (!e.dataTransfer.types.includes('application/x-hinged-image-id')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropPosition((cur) => (cur === position ? cur : position));
    updateAutoScroll(e.clientX);
  };

  const onDropReorder = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    stopAutoScroll();
    const finalPos = dropPosition;
    setDropPosition(null);
    const src = Number(e.dataTransfer.getData('application/x-hinged-image-id'));
    if (!src || finalPos == null) return;
    const order = images.map((i) => i.id);
    const fromIdx = order.indexOf(src);
    if (fromIdx < 0) return;
    // Adjust the destination for the removal: if the drop position is
    // after the source's old slot, removing the source shifts every
    // index past it down by one.
    let insertAt = finalPos;
    if (insertAt > fromIdx) insertAt -= 1;
    if (insertAt === fromIdx) return; // no-op move
    order.splice(fromIdx, 1);
    order.splice(insertAt, 0, src);
    reorder.mutate({ stampId, imageIds: order });
    if (current) {
      const newIdx = order.indexOf(current.id);
      if (newIdx >= 0) setViewIndex(newIdx);
    }
  };
  const onDragEndThumb = (): void => {
    setDropPosition(null);
    stopAutoScroll();
  };

  // External-file drop (a file dragged from the OS onto the gallery).
  const onDropFile = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void onAcceptFile(file);
  };
  const [dragging, setDragging] = useState(false);

  // Empty state.
  if (images.length === 0) {
    return (
      <div
        className={`gallery gallery-empty ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes('application/x-hinged-image-id')) {
            e.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDropFile}
      >
        <div className="gallery-placeholder">
          <div className="subtle small">Drop images here, or</div>
          <Button onClick={() => void pickFile()}>Choose File…</Button>
        </div>
      </div>
    );
  }

  const goPrev = (): void => {
    if (images.length === 0) return;
    setViewIndex((idx) => (idx - 1 + images.length) % images.length);
  };
  const goNext = (): void => {
    if (images.length === 0) return;
    setViewIndex((idx) => (idx + 1) % images.length);
  };

  // Keyboard nav inside the gallery: arrow keys page through images
  // when the gallery is focused (i.e. the user clicked it). Doesn't
  // hijack global arrow keys.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (images.length < 2) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    }
  };

  return (
    <>
      <div className="gallery" tabIndex={-1} onKeyDown={onKeyDown}>
        {/* Viewer */}
        {current && (
          <Viewer
            image={current}
            indexLabel={`${viewIndex + 1} / ${images.length}`}
            hasMany={images.length > 1}
            dragging={dragging}
            onPrev={goPrev}
            onNext={goNext}
            onOpenLightbox={() => setLightboxIndex(viewIndex)}
            onDragOver={(e) => {
              // OS-file drop on the viewer adds a new image; reorder
              // drags from inside the gallery are handled by the strip.
              if (!e.dataTransfer.types.includes('application/x-hinged-image-id')) {
                e.preventDefault();
                setDragging(true);
              }
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              if (!e.dataTransfer.types.includes('application/x-hinged-image-id')) {
                onDropFile(e);
              }
            }}
          />
        )}

        {/* Caption for the currently-viewed image */}
        {current && (
          <CaptionRow
            key={current.id /* reset draft when current changes */}
            image={current}
            onChange={(c) =>
              setCaption.mutate({ imageId: current.id, stampId, caption: c })
            }
          />
        )}

        {/* Thumbnail strip — every image, primary first.
            Layout: [Gap 0][Thumb 0][Gap 1][Thumb 1]…[Gap N][+ tile]
            Gaps are 0px wide normally; the active one (during a drag)
            expands to a thumb-sized placeholder, physically pushing
            neighbours aside so the user sees where the drop will land. */}
        <div
          className="gallery-strip"
          ref={stripRef}
          onDragOver={(e) => {
            // OS file drops are handled here; reorder drags route
            // through per-thumb / per-gap handlers below.
            if (!e.dataTransfer.types.includes('application/x-hinged-image-id')) {
              e.preventDefault();
            }
          }}
          onDrop={(e) => {
            if (e.dataTransfer.types.includes('application/x-hinged-image-id')) {
              onDropReorder(e);
            } else {
              onDropFile(e);
            }
            stopAutoScroll();
          }}
        >
          {images.map((img, i) => (
            <Fragment key={img.id}>
              <Gap
                position={i}
                isActive={dropPosition === i}
                onDragOver={onDragOverGap}
              />
              <Thumb
                image={img}
                isPrimary={i === 0}
                isSelected={i === viewIndex}
                onDragStart={(e) => onDragStart(e, img.id)}
                onDragOver={(e) => onDragOverThumb(e, i)}
                onDragEnd={onDragEndThumb}
                onClick={() => setViewIndex(i)}
                onRemove={() => removeImage(img)}
                onReplace={async () => {
                  const result = await window.hinged.images.pickAndSave();
                  if (!result.ok) return;
                  const oldFilename = img.filename;
                  await replaceFile.mutateAsync({
                    imageId: img.id,
                    stampId,
                    filename: result.filename,
                  });
                  void window.hinged.images.delete(oldFilename);
                }}
                onMakePrimary={() => {
                  if (i === 0) return;
                  setPrimary.mutate({ imageId: img.id, stampId });
                  setViewIndex(0);
                }}
              />
            </Fragment>
          ))}
          <Gap
            position={images.length}
            isActive={dropPosition === images.length}
            onDragOver={onDragOverGap}
          />
          <button
            type="button"
            className="gallery-add"
            title="Add an image"
            onClick={() => void pickFile()}
          >
            <span aria-hidden>+</span>
          </button>
        </div>
      </div>

      {lightboxIndex != null && images[lightboxIndex] && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onChangeIndex={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

// ---------- Viewer (the big "current image" panel) ----------

function Viewer({
  image,
  indexLabel,
  hasMany,
  dragging,
  onPrev,
  onNext,
  onOpenLightbox,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  image: StampImage;
  indexLabel: string;
  hasMany: boolean;
  dragging: boolean;
  onPrev: () => void;
  onNext: () => void;
  onOpenLightbox: () => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
}) {
  const dataUrl = useImageDataUrl(image.filename);
  return (
    <div
      className={`gallery-viewer ${dragging ? 'dragging' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="gallery-viewer-stage">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={image.caption ?? ''}
            draggable={false}
            onClick={onOpenLightbox}
          />
        ) : (
          <div className="gallery-loading subtle small">Loading…</div>
        )}
        {/* Magnifier / lightbox button, top-right. Shown on hover. */}
        <button
          type="button"
          className="gallery-viewer-zoom"
          onClick={onOpenLightbox}
          title="Open full-size (Esc to close)"
          aria-label="Open full-size"
        >
          ⤢
        </button>
        {/* Prev/next pager controls, only when there's more than one image */}
        {hasMany && (
          <>
            <button
              type="button"
              className="gallery-viewer-nav gallery-viewer-prev"
              onClick={onPrev}
              title="Previous (←)"
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              type="button"
              className="gallery-viewer-nav gallery-viewer-next"
              onClick={onNext}
              title="Next (→)"
              aria-label="Next image"
            >
              ›
            </button>
          </>
        )}
      </div>
      {hasMany && (
        <div className="gallery-actions">
          <span className="gallery-counter subtle small">{indexLabel}</span>
        </div>
      )}
    </div>
  );
}

// ---------- Thumbnail ----------

// A Gap renders between adjacent thumbs (and before the first / after
// the last). It collapses to 0px when not in use, and during a drag
// the gap at the current drop position expands to thumb-width with a
// dashed accent border, physically nudging the surrounding thumbs out
// of the way so the user sees exactly where the drop will land.
function Gap({
  position,
  isActive,
  onDragOver,
}: {
  position: number;
  isActive: boolean;
  onDragOver: (e: DragEvent<HTMLDivElement>, position: number) => void;
}) {
  return (
    <div
      className={`gallery-gap${isActive ? ' is-active' : ''}`}
      onDragOver={(e) => onDragOver(e, position)}
    />
  );
}

function Thumb({
  image,
  isPrimary,
  isSelected,
  onDragStart,
  onDragOver,
  onDragEnd,
  onClick,
  onRemove,
  onReplace,
  onMakePrimary,
}: {
  image: StampImage;
  isPrimary: boolean;
  isSelected: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onRemove: () => void;
  onReplace: () => void;
  onMakePrimary: () => void;
}) {
  const dataUrl = useImageDataUrl(image.filename);
  return (
    <div
      className={[
        'gallery-thumb',
        isPrimary ? 'is-primary' : '',
        isSelected ? 'is-selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onClick={onClick}
      title={
        (image.caption ? `${image.caption}\n` : '') +
        (isPrimary ? 'Primary · click to view, drag to reorder' : 'Click to view, drag to reorder')
      }
    >
      {dataUrl && (
        // draggable={false} on the <img> is essential. Browsers default
        // to dragging an image as a URL (data: URL in our case), which
        // shows the "globe/link" cursor and never reaches our wrapper's
        // dragstart. With this off, the parent <div>'s drag handler
        // owns the gesture cleanly.
        <img src={dataUrl} alt={image.caption ?? ''} draggable={false} />
      )}
      <button
        type="button"
        className="gallery-thumb-star"
        title={isPrimary ? 'This is the primary image' : 'Make this the primary image'}
        aria-label={isPrimary ? 'Primary image' : 'Make primary'}
        onClick={(e) => {
          e.stopPropagation();
          if (!isPrimary) onMakePrimary();
        }}
      >
        {isPrimary ? '★' : '☆'}
      </button>
      <button
        type="button"
        className="gallery-thumb-replace"
        title="Replace this image with a different file"
        aria-label="Replace image"
        onClick={(e) => {
          e.stopPropagation();
          onReplace();
        }}
      >
        ↻
      </button>
      <button
        className="gallery-thumb-remove"
        title="Remove this image"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        ×
      </button>
      {image.caption && <div className="gallery-thumb-caption">{image.caption}</div>}
    </div>
  );
}

// ---------- Caption row ----------

function CaptionRow({
  image,
  onChange,
}: {
  image: StampImage;
  onChange: (c: string) => void;
}) {
  const [draft, setDraft] = useState(image.caption ?? '');
  return (
    <input
      className="input gallery-caption"
      value={draft}
      placeholder="Caption (e.g. front, back, cert)"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== (image.caption ?? '')) onChange(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

// ---------- Lightbox ----------

function Lightbox({
  images,
  index,
  onChangeIndex,
  onClose,
}: {
  images: StampImage[];
  index: number;
  onChangeIndex: (i: number) => void;
  onClose: () => void;
}) {
  const image = images[index]!;
  const dataUrl = useImageDataUrl(image.filename);
  const hasMany = images.length > 1;

  const goPrev = (): void => {
    onChangeIndex((index - 1 + images.length) % images.length);
  };
  const goNext = (): void => {
    onChangeIndex((index + 1) % images.length);
  };

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && hasMany) goPrev();
      else if (e.key === 'ArrowRight' && hasMany) goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, images.length, onClose]);

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
        {dataUrl ? <img src={dataUrl} alt={image.caption ?? ''} draggable={false} /> : null}
        {image.caption && <div className="lightbox-caption">{image.caption}</div>}
        {hasMany && (
          <div className="lightbox-counter">
            {index + 1} / {images.length}
          </div>
        )}
        <button className="lightbox-close" onClick={onClose} title="Close (Esc)">
          ×
        </button>
        {hasMany && (
          <>
            <button
              className="lightbox-nav lightbox-prev"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              title="Previous (←)"
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              className="lightbox-nav lightbox-next"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              title="Next (→)"
              aria-label="Next image"
            >
              ›
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Helpers ----------

function useImageDataUrl(filename: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!filename) {
      setUrl(null);
      return;
    }
    void window.hinged.images.dataUrl(filename).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [filename]);
  return url;
}
