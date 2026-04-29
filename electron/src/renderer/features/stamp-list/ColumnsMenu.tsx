// Toolbar dropdown for picking which columns are visible and resetting
// any explicit widths the user has dragged columns to.
//
// Closes on outside-click and Escape, like the other inline popovers
// in the app.

import { useEffect, useRef, useState } from 'react';
import { Button } from '@renderer/components/primitives';
import { STAMP_COLUMNS, type ColumnId, type ColumnPrefs } from './columns';

interface Props {
  prefs: ColumnPrefs;
  setVisibility: (id: ColumnId, visible: boolean) => void;
  resetAllWidths: () => void;
  hasExplicitWidths: boolean;
}

export function ColumnsMenu({
  prefs,
  setVisibility,
  resetAllWidths,
  hasExplicitWidths,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const visible = new Set(prefs.visibleIds);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="columns-menu-wrap" ref={ref}>
      <Button onClick={() => setOpen((v) => !v)} title="Show or hide columns">
        Columns ▾
      </Button>
      {open && (
        <div className="columns-menu" role="menu">
          <div className="columns-menu-header subtle small">Show columns</div>
          {STAMP_COLUMNS.map((c) => {
            const isOn = visible.has(c.id);
            const isOnly = visible.size === 1 && isOn;
            return (
              <label
                key={c.id}
                className={`columns-menu-item${isOnly ? ' is-disabled' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  disabled={isOnly}
                  onChange={(e) => setVisibility(c.id, e.target.checked)}
                />
                <span>{c.label}</span>
              </label>
            );
          })}
          <div className="columns-menu-sep" />
          <button
            type="button"
            className="columns-menu-action"
            disabled={!hasExplicitWidths}
            onClick={() => {
              resetAllWidths();
              setOpen(false);
            }}
          >
            Reset all column widths
          </button>
        </div>
      )}
    </div>
  );
}
