import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useCreateSeries, useSeries } from '@renderer/lib/api';

interface Props {
  /** Current series id, or null. */
  value: number | null;
  /** Called when the user picks (or creates) a series, or clears it. */
  onChange: (id: number | null) => void;
  /** Optional country to default new series to. */
  defaultCountryId?: number | null;
  /** Render with a disabled appearance (read-only). */
  disabled?: boolean;
  /** Override the placeholder shown when no series is selected. */
  placeholder?: string;
}

/**
 * Series picker — a typeahead combobox.
 *
 * - Shows the current series name as a button-styled chip.
 * - Click it to open the dropdown.
 * - Type to filter existing series.
 * - Pick a result with arrow keys + Enter, or click.
 * - If the typed text doesn't match any existing series, a "Create
 *   '<text>'" row appears at the bottom of the list.
 * - "(none)" at the top of the list clears the selection.
 *
 * Designed with reasonably large hit targets and font (better for
 * older eyes than the rest of the form).
 */
export function SeriesPicker({
  value,
  onChange,
  defaultCountryId,
  disabled,
  placeholder = '(none)',
}: Props) {
  const { data: allSeries = [] } = useSeries();
  const createSeries = useCreateSeries();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hover, setHover] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = useMemo(
    () => (value != null ? allSeries.find((s) => s.id === value) ?? null : null),
    [allSeries, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allSeries;
    return allSeries.filter((s) => s.name.toLowerCase().includes(q));
  }, [allSeries, query]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return false;
    return allSeries.some((s) => s.name.toLowerCase() === q);
  }, [allSeries, query]);

  const showCreate = query.trim().length > 0 && !exactMatch;

  // Reset state when opening/closing
  useEffect(() => {
    if (open) {
      setQuery('');
      setHover(0);
      // Defer focus until after render
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Total number of selectable rows (counting (none) and Create… if shown)
  const totalRows = 1 + filtered.length + (showCreate ? 1 : 0);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHover((h) => Math.min(totalRows - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHover((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      void chooseRow(hover);
    }
  };

  const chooseRow = async (idx: number) => {
    if (idx === 0) {
      onChange(null);
      setOpen(false);
      return;
    }
    const seriesIdx = idx - 1;
    if (seriesIdx < filtered.length) {
      onChange(filtered[seriesIdx]!.id);
      setOpen(false);
      return;
    }
    // Create-new row
    if (showCreate) {
      const created = await createSeries.mutateAsync({
        name: query.trim(),
        countryId: defaultCountryId ?? null,
      });
      onChange(created.id);
      setOpen(false);
    }
  };

  return (
    <div className={`series-picker ${disabled ? 'is-disabled' : ''}`} ref={wrapRef}>
      <button
        type="button"
        className="series-picker-trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={current ? '' : 'subtle'}>
          {current ? current.name : placeholder}
        </span>
        <span className="series-picker-caret" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="series-picker-pop" role="listbox">
          <input
            ref={inputRef}
            className="series-picker-search"
            placeholder="Search or type a new series name…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHover(0);
            }}
            onKeyDown={onKeyDown}
          />
          <div className="series-picker-list">
            <div
              className={`series-picker-row ${hover === 0 ? 'hover' : ''}`}
              role="option"
              aria-selected={value == null}
              onMouseEnter={() => setHover(0)}
              onClick={() => void chooseRow(0)}
            >
              <span className="subtle">(none — clear series)</span>
            </div>
            {filtered.map((s, i) => {
              const idx = i + 1;
              return (
                <div
                  key={s.id}
                  className={`series-picker-row ${hover === idx ? 'hover' : ''} ${value === s.id ? 'selected' : ''}`}
                  role="option"
                  aria-selected={value === s.id}
                  onMouseEnter={() => setHover(idx)}
                  onClick={() => void chooseRow(idx)}
                >
                  <span>{s.name}</span>
                  {(s.yearStart || s.yearEnd) && (
                    <span className="subtle small">
                      {s.yearStart ?? '?'}
                      {s.yearEnd && s.yearEnd !== s.yearStart ? `–${s.yearEnd}` : ''}
                    </span>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && !showCreate && (
              <div className="series-picker-empty subtle">No series yet.</div>
            )}
            {showCreate && (
              <div
                className={`series-picker-row create ${hover === totalRows - 1 ? 'hover' : ''}`}
                role="option"
                aria-selected={false}
                onMouseEnter={() => setHover(totalRows - 1)}
                onClick={() => void chooseRow(totalRows - 1)}
              >
                <span>
                  Create <strong>&ldquo;{query.trim()}&rdquo;</strong>
                </span>
                <span className="subtle small">Press Enter</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
