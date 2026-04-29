// Column registry + persisted preferences for the stamp list.
//
// Two prefs live in localStorage under one key:
//   - visibleIds: ordered list of column ids the user wants to see
//   - widths: { columnId -> px } — explicit pixel widths the user has
//             dragged columns to. Columns not in this map ride the
//             auto-fit / flex layout.
//
// We intentionally keep this in localStorage rather than the SQLite
// settings table because (a) it's UI-only state with no need to round-
// trip through main, and (b) it lets us iterate on the column shape
// without a schema migration.

import { useCallback, useEffect, useState } from 'react';

export interface ColumnDef {
  id: ColumnId;
  label: string;
  minWidth: number;
  /** Weight used to distribute remaining width among auto-sized columns.
   *  Columns with flex=0 hug their content (use defaultWidth as a hint). */
  defaultFlex: number;
  /** Used as a target / starting width when no flex weight is in play. */
  defaultWidth: number;
  defaultVisible: boolean;
  /** Whether the cell content can be ellipsis-truncated when narrow. */
  truncate: boolean;
}

export const STAMP_COLUMNS: readonly ColumnDef[] = [
  { id: 'catalog', label: 'Catalog #', minWidth: 90, defaultFlex: 0, defaultWidth: 110, defaultVisible: true, truncate: false },
  { id: 'year',    label: 'Year',      minWidth: 60, defaultFlex: 0, defaultWidth: 80,  defaultVisible: true, truncate: false },
  { id: 'denom',   label: 'Denom.',    minWidth: 90, defaultFlex: 2, defaultWidth: 160, defaultVisible: true, truncate: true },
  { id: 'color',   label: 'Color',     minWidth: 70, defaultFlex: 1, defaultWidth: 100, defaultVisible: true, truncate: true },
  { id: 'series',  label: 'Series',    minWidth: 90, defaultFlex: 2, defaultWidth: 160, defaultVisible: true, truncate: true },
  { id: 'cond',    label: 'Cond.',     minWidth: 60, defaultFlex: 0, defaultWidth: 70,  defaultVisible: true, truncate: false },
  { id: 'status',  label: 'Status',    minWidth: 100, defaultFlex: 0, defaultWidth: 110, defaultVisible: true, truncate: false },
  { id: 'qty',     label: 'Qty',       minWidth: 50, defaultFlex: 0, defaultWidth: 60,  defaultVisible: true, truncate: false },
] as const;

export type ColumnId = 'catalog' | 'year' | 'denom' | 'color' | 'series' | 'cond' | 'status' | 'qty';

export const COL_BY_ID: Record<ColumnId, ColumnDef> = STAMP_COLUMNS.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<ColumnId, ColumnDef>,
);

export interface ColumnPrefs {
  /** Ordered list of column ids that should be visible. Order is the
   *  display order; we don't yet support reordering, so this stays in
   *  STAMP_COLUMNS order, but storing as an array gives us a smooth
   *  upgrade path. */
  visibleIds: ColumnId[];
  /** Explicit pixel widths the user has resized columns to. */
  widths: Partial<Record<ColumnId, number>>;
}

const STORAGE_KEY = 'stampListColumns.v1';

function defaultPrefs(): ColumnPrefs {
  return {
    visibleIds: STAMP_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id),
    widths: {},
  };
}

function loadPrefs(): ColumnPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw) as Partial<ColumnPrefs>;
    const known = new Set<string>(STAMP_COLUMNS.map((c) => c.id));
    const visibleIds = (parsed.visibleIds ?? defaultPrefs().visibleIds).filter(
      (id): id is ColumnId => known.has(id),
    );
    // Preserve registry order so toggling visibility doesn't shuffle columns.
    visibleIds.sort(
      (a, b) =>
        STAMP_COLUMNS.findIndex((c) => c.id === a) -
        STAMP_COLUMNS.findIndex((c) => c.id === b),
    );
    const widths: Partial<Record<ColumnId, number>> = {};
    for (const [k, v] of Object.entries(parsed.widths ?? {})) {
      if (known.has(k) && typeof v === 'number' && v > 0) {
        widths[k as ColumnId] = v;
      }
    }
    return { visibleIds, widths };
  } catch {
    return defaultPrefs();
  }
}

function savePrefs(prefs: ColumnPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage can throw in private mode / quota exhausted; ignore.
  }
}

/**
 * React hook for column prefs. Returns the current prefs plus a small
 * action API. Multiple components on the page would each have their own
 * cached state, so on each save we also dispatch a window event so other
 * StampList instances (none today) would stay in sync.
 */
export function useColumnPrefs(): {
  prefs: ColumnPrefs;
  setVisibility: (id: ColumnId, visible: boolean) => void;
  setWidth: (id: ColumnId, width: number | null) => void;
  resetAllWidths: () => void;
  resetAll: () => void;
} {
  const [prefs, setPrefs] = useState<ColumnPrefs>(() => loadPrefs());

  // Listen for cross-instance changes (and for storage events, which fire
  // when another window updates localStorage).
  useEffect(() => {
    const handler = (): void => setPrefs(loadPrefs());
    window.addEventListener('storage', handler);
    window.addEventListener('hinged:column-prefs-changed', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('hinged:column-prefs-changed', handler);
    };
  }, []);

  const commit = useCallback((next: ColumnPrefs) => {
    setPrefs(next);
    savePrefs(next);
    window.dispatchEvent(new CustomEvent('hinged:column-prefs-changed'));
  }, []);

  const setVisibility = useCallback(
    (id: ColumnId, visible: boolean) => {
      const set = new Set(prefs.visibleIds);
      if (visible) set.add(id);
      else set.delete(id);
      const visibleIds = STAMP_COLUMNS.filter((c) => set.has(c.id)).map((c) => c.id);
      // Always keep at least one column visible to avoid an empty table.
      if (visibleIds.length === 0) return;
      commit({ ...prefs, visibleIds });
    },
    [prefs, commit],
  );

  const setWidth = useCallback(
    (id: ColumnId, width: number | null) => {
      const widths = { ...prefs.widths };
      if (width == null) delete widths[id];
      else widths[id] = Math.max(COL_BY_ID[id].minWidth, Math.round(width));
      commit({ ...prefs, widths });
    },
    [prefs, commit],
  );

  const resetAllWidths = useCallback(() => {
    commit({ ...prefs, widths: {} });
  }, [prefs, commit]);

  const resetAll = useCallback(() => {
    commit(defaultPrefs());
  }, [commit]);

  return { prefs, setVisibility, setWidth, resetAllWidths, resetAll };
}

/**
 * Compute a px width for every visible column based on:
 *   - explicit user-set widths (honoured exactly)
 *   - flex weights for unset columns sharing the remaining space
 *   - minWidth floors
 *   - a fallback to the column's defaultWidth when nothing else fits
 *
 * Returns a map from columnId → width in px. The caller emits a
 * <colgroup> with these widths.
 *
 * If `available` is unknown (0 / undefined) we return defaultWidths,
 * which is fine for the first render before ResizeObserver fires.
 */
export function computeColumnWidths(
  visible: ColumnDef[],
  userWidths: Partial<Record<ColumnId, number>>,
  available: number,
): Record<ColumnId, number> {
  const out: Partial<Record<ColumnId, number>> = {};

  if (!available || available <= 0) {
    for (const c of visible) {
      out[c.id] = userWidths[c.id] ?? c.defaultWidth;
    }
    return out as Record<ColumnId, number>;
  }

  // 1. Explicit widths first.
  let used = 0;
  for (const c of visible) {
    if (userWidths[c.id] != null) {
      const w = Math.max(c.minWidth, userWidths[c.id]!);
      out[c.id] = w;
      used += w;
    }
  }

  // 2. Auto columns share what's left, weighted by flex (or by
  //    defaultWidth when flex is 0).
  const auto = visible.filter((c) => userWidths[c.id] == null);
  const remaining = Math.max(0, available - used);

  if (auto.length > 0) {
    const totalWeight = auto.reduce(
      (s, c) => s + (c.defaultFlex > 0 ? c.defaultFlex : c.defaultWidth / 100),
      0,
    );
    let remainingBudget = remaining;
    let remainingWeight = totalWeight;

    // Two-pass: first floor at minWidth for anything that would otherwise
    // be too small, then re-distribute leftover among the rest.
    const flexed: ColumnDef[] = [];
    for (const c of auto) {
      const weight = c.defaultFlex > 0 ? c.defaultFlex : c.defaultWidth / 100;
      const proposed =
        remainingWeight > 0 ? (weight / remainingWeight) * remainingBudget : c.minWidth;
      if (proposed < c.minWidth) {
        out[c.id] = c.minWidth;
        remainingBudget -= c.minWidth;
        remainingWeight -= weight;
      } else {
        flexed.push(c);
      }
    }
    for (const c of flexed) {
      const weight = c.defaultFlex > 0 ? c.defaultFlex : c.defaultWidth / 100;
      const w =
        remainingWeight > 0
          ? Math.max(c.minWidth, (weight / remainingWeight) * remainingBudget)
          : c.minWidth;
      out[c.id] = Math.round(w);
    }
  }

  return out as Record<ColumnId, number>;
}
