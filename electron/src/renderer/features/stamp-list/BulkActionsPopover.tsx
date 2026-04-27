import { useEffect, useRef, type CSSProperties } from 'react';
import type { Album, StampPatchPayload } from '@shared/types';
import {
  centeringGrades,
  collectionStatuses,
  gumConditions,
} from '@shared/display';

interface Props {
  x: number;
  y: number;
  count: number;
  albums: Album[];
  currentAlbumId?: number | null;
  onClose: () => void;
  onApplyPatch: (patch: StampPatchPayload) => void;
  onDelete: () => void;
}

export function BulkActionsPopover({
  x,
  y,
  count,
  albums,
  currentAlbumId,
  onClose,
  onApplyPatch,
  onDelete,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Defer to avoid catching the originating click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', onDocClick);
      document.addEventListener('keydown', onKey);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Keep the popover on-screen.
  const style: CSSProperties = {
    left: Math.min(x, window.innerWidth - 240),
    top: Math.min(y, window.innerHeight - 320),
  };

  const apply = (patch: StampPatchPayload) => {
    onApplyPatch(patch);
    onClose();
  };

  return (
    <div ref={ref} className="context-menu" style={style} role="menu">
      <div className="context-menu-heading">
        {count} stamp{count === 1 ? '' : 's'} selected
      </div>

      <div className="context-menu-group">
        <div className="context-menu-group-label">Status</div>
        {collectionStatuses.map((s) => (
          <button key={s.value} onClick={() => apply({ collectionStatusRaw: s.value })}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="context-menu-group">
        <div className="context-menu-group-label">Gum condition</div>
        {gumConditions.map((g) => (
          <button key={g.value} onClick={() => apply({ gumConditionRaw: g.value })}>
            {g.label}
          </button>
        ))}
      </div>

      <div className="context-menu-group">
        <div className="context-menu-group-label">Centering</div>
        {centeringGrades.map((c) => (
          <button key={c.value} onClick={() => apply({ centeringGradeRaw: c.value })}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="context-menu-group">
        <div className="context-menu-group-label">Tradeable</div>
        <button onClick={() => apply({ tradeable: true })}>Mark tradeable</button>
        <button onClick={() => apply({ tradeable: false })}>Unmark tradeable</button>
      </div>

      {albums.length > 0 && (
        <div className="context-menu-group">
          <div className="context-menu-group-label">Move to album</div>
          <div className="context-menu-scroll">
            {albums
              .filter((a) => a.id !== currentAlbumId)
              .map((a) => (
                <button key={a.id} onClick={() => apply({ albumId: a.id })}>
                  {a.name}
                </button>
              ))}
          </div>
        </div>
      )}

      <div className="context-menu-group">
        <button
          className="context-menu-danger"
          onClick={() => {
            onDelete();
            onClose();
          }}
        >
          Move to Trash
        </button>
      </div>
    </div>
  );
}
