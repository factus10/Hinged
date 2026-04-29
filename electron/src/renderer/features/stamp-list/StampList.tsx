import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import {
  useAlbums,
  useBulkDeleteStamps,
  useBulkUpdateStamps,
  useCollections,
  useCountries,
  useCreateStamp,
  useDeleteStamp,
  useEmptyTrash,
  useRestoreStamps,
  useSeries,
  useSettings,
  useStamps,
  useTrashedStamps,
  useUpdateStamp,
} from '@renderer/lib/api';
import { useSelection } from '@renderer/state/selection';
import { useDialogs } from '@renderer/state/dialogs';
import { Button, Input, Select } from '@renderer/components/primitives';
import { EditableCell } from '@renderer/components/EditableCell';
import type { Album, Collection, Country, Stamp, StampPatchPayload } from '@shared/types';
import {
  centeringGradeShorthand,
  collectionStatusLabel,
  gumConditionShorthand,
} from '@shared/display';
import { useVirtualizer } from '@tanstack/react-virtual';
import { QuickAddRow } from './QuickAddRow';
import { BulkActionsPopover } from './BulkActionsPopover';
import { ColumnsMenu } from './ColumnsMenu';
import {
  STAMP_COLUMNS,
  COL_BY_ID,
  computeColumnWidths,
  useColumnPrefs,
  type ColumnId,
} from './columns';

const RECENT_DAYS = 30;

// Natural sort for catalog numbers.
const catalogCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

function compareCatalogNumbers(a: string, b: string): number {
  const aEmpty = a === '';
  const bEmpty = b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  return catalogCollator.compare(a, b);
}

interface TimelineBarProps {
  rows: Stamp[];
  yearMin: number | null;
  yearMax: number | null;
  setYearMin: (n: number | null) => void;
  setYearMax: (n: number | null) => void;
  /** All stamps in the current scope (before the timeline filter). Used
      to figure out the available year range. */
  sourceStamps: Stamp[];
}

function TimelineBar({
  rows,
  yearMin,
  yearMax,
  setYearMin,
  setYearMax,
  sourceStamps,
}: TimelineBarProps): JSX.Element {
  // Compute the bounds from the un-year-filtered stamps so the slider's
  // endpoints don't shrink as you drag the handles inward.
  const { absMin, absMax } = useMemo(() => {
    const years = sourceStamps
      .map((s) => s.yearStart)
      .filter((y): y is number => y != null);
    if (years.length === 0) {
      const thisYear = new Date().getFullYear();
      return { absMin: 1840, absMax: thisYear };
    }
    return {
      absMin: Math.min(...years),
      absMax: Math.max(...years),
    };
  }, [sourceStamps]);

  // Compute counts per year on the un-filtered set (gives the histogram
  // a stable shape regardless of the slider position).
  const histogram = useMemo(() => {
    const counts = new Map<number, number>();
    for (const s of sourceStamps) {
      if (s.yearStart == null) continue;
      counts.set(s.yearStart, (counts.get(s.yearStart) ?? 0) + 1);
    }
    return counts;
  }, [sourceStamps]);

  const lo = yearMin ?? absMin;
  const hi = yearMax ?? absMax;
  const span = Math.max(1, absMax - absMin);

  const matchedYears = useMemo(() => {
    const s = new Set<number>();
    for (const r of rows) if (r.yearStart != null) s.add(r.yearStart);
    return s;
  }, [rows]);

  // Build histogram bars
  const maxBarCount = useMemo(() => {
    let m = 0;
    for (const c of histogram.values()) if (c > m) m = c;
    return Math.max(1, m);
  }, [histogram]);

  const bars: Array<{ year: number; pct: number; height: number; matched: boolean }> = [];
  for (let y = absMin; y <= absMax; y += 1) {
    const count = histogram.get(y) ?? 0;
    if (count === 0) continue;
    bars.push({
      year: y,
      pct: ((y - absMin) / span) * 100,
      height: (count / maxBarCount) * 100,
      matched: matchedYears.has(y) && y >= lo && y <= hi,
    });
  }

  const reset = () => {
    setYearMin(null);
    setYearMax(null);
  };

  return (
    <div className="timeline-bar">
      <div className="timeline-controls">
        <span className="subtle small">From</span>
        <input
          type="number"
          className="input"
          value={lo}
          min={absMin}
          max={hi}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) setYearMin(n);
          }}
          style={{ width: 70 }}
        />
        <span className="subtle small">to</span>
        <input
          type="number"
          className="input"
          value={hi}
          min={lo}
          max={absMax}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) setYearMax(n);
          }}
          style={{ width: 70 }}
        />
        <button type="button" className="btn" onClick={reset} style={{ fontSize: '11px' }}>
          Reset
        </button>
        <span className="subtle small" style={{ marginLeft: 'auto' }}>
          Stamps with no year: hidden
        </span>
      </div>
      <div className="timeline-histogram">
        {bars.map((b) => (
          <span
            key={b.year}
            className={`timeline-bar-mark ${b.matched ? 'matched' : ''}`}
            style={{ left: `${b.pct}%`, height: `${Math.max(8, b.height)}%` }}
            title={`${b.year}: ${histogram.get(b.year)} stamp${histogram.get(b.year) === 1 ? '' : 's'}`}
          />
        ))}
        <div
          className="timeline-range-overlay"
          style={{
            left: `${((lo - absMin) / span) * 100}%`,
            width: `${((hi - lo) / span) * 100}%`,
          }}
        />
      </div>
      <div className="timeline-axis subtle small">
        <span>{absMin}</span>
        <span>{absMax}</span>
      </div>
    </div>
  );
}

const TSV_HEADER = [
  'Catalog Number',
  'Country',
  'Year',
  'Denomination',
  'Color',
  'Series',
  'Gum Condition',
  'Centering Grade',
  'Status',
  'Quantity',
  'Tradeable',
  'Notes',
];

function stampsToTsv(
  stamps: Stamp[],
  albumsById: Map<number, Album>,
  collectionsById: Map<number, Collection>,
  countriesById: Map<number, Country>,
  seriesById: Map<number, { name: string }>,
): string {
  if (stamps.length === 0) return '';
  const lines: string[] = [TSV_HEADER.join('\t')];
  for (const s of stamps) {
    const album = albumsById.get(s.albumId);
    const collection = album ? collectionsById.get(album.collectionId) : null;
    const cid = collection?.countryId ?? s.countryId ?? null;
    const country = cid != null ? countriesById.get(cid) : null;
    const year =
      s.yearStart == null
        ? ''
        : s.yearEnd != null && s.yearEnd !== s.yearStart
          ? `${s.yearStart}-${s.yearEnd}`
          : String(s.yearStart);
    const seriesName =
      s.seriesId != null ? (seriesById.get(s.seriesId)?.name ?? '') : '';
    const fields = [
      s.catalogNumber,
      country?.name ?? '',
      year,
      s.denomination,
      s.color,
      seriesName,
      s.gumConditionRaw,
      s.centeringGradeRaw,
      s.collectionStatusRaw,
      String(s.quantity ?? 1),
      s.tradeable ? 'TRUE' : 'FALSE',
      // Replace tab/newline so a single line per stamp is preserved
      s.notes.replace(/[\t\r\n]/g, ' '),
    ];
    lines.push(fields.join('\t'));
  }
  return lines.join('\n');
}

// Memoized row. The whole reason for the memo is the window-resize case:
// when the user drags the window edge, the parent recomputes column widths
// every animation frame, which triggers a parent re-render. Without this
// memo, all ~2000 rows reconcile through React on every frame even though
// none of their data changed. With the memo, React short-circuits any row
// whose props are reference-equal to the previous render — and the parent
// is careful to keep stamp/maps/handlers stable across re-renders.
//
// Only the props that actually affect render output are listed. The colWidths
// map is *not* a prop — column widths live in <colgroup>, and table-layout:
// fixed propagates them to cells without React having to walk into rows.
interface StampRowProps {
  stamp: Stamp;
  isSelected: boolean;
  visibleIds: ColumnId[];
  isTrashView: boolean;
  albumsById: Map<number, Album>;
  collectionsById: Map<number, Collection>;
  countriesById: Map<number, Country>;
  seriesById: Map<number, { name: string }>;
  onCommitField: (id: number, patch: StampPatchPayload) => void;
  onRowClick: (e: MouseEvent, s: Stamp) => void;
  onContextMenu: (e: MouseEvent, s: Stamp) => void;
  onDeleteOne: (s: Stamp) => void;
}

const StampRow = memo(function StampRow({
  stamp: s,
  isSelected,
  visibleIds,
  isTrashView,
  albumsById,
  collectionsById,
  countriesById,
  seriesById,
  onCommitField,
  onRowClick,
  onContextMenu,
  onDeleteOne,
}: StampRowProps) {
  const showsTrade = s.tradeable || s.quantity > 1;
  const renderCell = (id: ColumnId): React.ReactNode => {
    switch (id) {
      case 'catalog': {
        const album = albumsById.get(s.albumId);
        const collection = album ? collectionsById.get(album.collectionId) : null;
        const countryId = collection?.countryId ?? s.countryId ?? null;
        const country = countryId != null ? countriesById.get(countryId) : null;
        const sys = collection?.catalogSystemRaw ?? 'scott';
        const prefix = country?.catalogPrefixes?.[sys] ?? '';
        return (
          <td key={id} className="mono col-catalog">
            {prefix && <span className="catalog-prefix">{prefix} </span>}
            <EditableCell
              value={s.catalogNumber}
              onCommit={(next) => onCommitField(s.id, { catalogNumber: next })}
            />
          </td>
        );
      }
      case 'year':
        return (
          <td key={id} className="col-year">
            <EditableCell
              value={s.yearStart != null ? String(s.yearStart) : ''}
              type="number"
              emptyText={s.yearEnd != null ? `–${s.yearEnd}` : '—'}
              onCommit={(next) =>
                onCommitField(s.id, { yearStart: next === '' ? null : Number(next) })
              }
            />
            {s.yearStart != null && s.yearEnd != null && s.yearEnd !== s.yearStart && (
              <span className="subtle">–{s.yearEnd}</span>
            )}
          </td>
        );
      case 'denom':
        return (
          <td key={id} className="col-denom truncate">
            <EditableCell
              value={s.denomination}
              emptyText=""
              onCommit={(next) => onCommitField(s.id, { denomination: next })}
            />
          </td>
        );
      case 'color':
        return (
          <td key={id} className="col-color truncate">
            <EditableCell
              value={s.color}
              emptyText=""
              onCommit={(next) => onCommitField(s.id, { color: next })}
            />
          </td>
        );
      case 'series':
        return (
          <td key={id} className="series-cell subtle small col-series truncate">
            {s.seriesId != null ? (seriesById.get(s.seriesId)?.name ?? '') : ''}
          </td>
        );
      case 'cond':
        return (
          <td key={id} className="mono small col-cond">
            {gumConditionShorthand(s.gumConditionRaw)}{' '}
            {centeringGradeShorthand(s.centeringGradeRaw)}
          </td>
        );
      case 'status':
        return (
          <td key={id} className="col-status">
            <span className={`status-chip status-${s.collectionStatusRaw}`}>
              {collectionStatusLabel[s.collectionStatusRaw] ?? s.collectionStatusRaw}
            </span>
          </td>
        );
      case 'qty':
        return (
          <td key={id} className="qty-cell mono small col-qty">
            {showsTrade && (
              <span className="qty-cell-inner">
                {s.quantity > 1 && <span>{s.quantity}</span>}
                {s.tradeable && (
                  <span className="trade-badge" title="Tradeable">↔</span>
                )}
              </span>
            )}
          </td>
        );
    }
  };
  return (
    <tr
      className={isSelected ? 'selected' : ''}
      onClick={(e) => onRowClick(e, s)}
      onContextMenu={(e) => onContextMenu(e, s)}
    >
      {visibleIds.map((id) => renderCell(id))}
      <td className="row-actions">
        <button
          className="icon-btn"
          title={isTrashView ? 'Restore' : 'Move to Trash'}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteOne(s);
          }}
        >
          {isTrashView ? '↺' : '×'}
        </button>
      </td>
    </tr>
  );
});

export function StampList() {
  const {
    selection,
    selectedStampIds,
    focusedStampId,
    setSingleStamp,
    toggleStamp,
    setSelectedStamps,
    clearStampSelection,
  } = useSelection();

  const isTrashView = selection.type === 'smart' && selection.kind === 'trash';

  const { data: liveStamps = [] } = useStamps();
  const { data: trashedStamps = [] } = useTrashedStamps();
  const { data: albums = [] } = useAlbums();
  const { data: collections = [] } = useCollections();
  const { data: countries = [] } = useCountries();
  const { data: seriesList = [] } = useSeries();
  const { data: settings } = useSettings();

  const createStamp = useCreateStamp();
  const updateStamp = useUpdateStamp();
  const deleteStamp = useDeleteStamp();
  const bulkUpdate = useBulkUpdateStamps();
  const bulkDelete = useBulkDeleteStamps();
  const restoreStamps = useRestoreStamps();
  const emptyTrash = useEmptyTrash();
  const { openCsvImport, openBulkAssignSeries } = useDialogs();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [seriesFilter, setSeriesFilter] = useState<string>('');
  const [showTimeline, setShowTimeline] = useState(false);
  const [yearMin, setYearMin] = useState<number | null>(null);
  const [yearMax, setYearMax] = useState<number | null>(null);
  const [popover, setPopover] = useState<{ x: number; y: number } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Column visibility + widths (persisted via localStorage). The hook
  // returns a stable prefs object plus actions; a custom event keeps
  // multiple instances in sync when widths change.
  const { prefs: colPrefs, setVisibility, setWidth, resetAllWidths } = useColumnPrefs();

  // Track the available width inside the scroll container so the auto-fit
  // layout can recompute when the side panel is dragged or the window
  // resizes. Subtract the row-actions column's fixed width (30 px) so
  // the data columns get the rest.
  const ROW_ACTIONS_WIDTH = 30;
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // rAF-throttle ResizeObserver callbacks. Window resize events fire
    // many times per frame; without throttling we re-render the entire
    // 1000+ row table on every dispatch, which feels laggy. Coalescing
    // to once per animation frame keeps the cost bounded to one render
    // per paint.
    let rafId = 0;
    let pendingWidth = 0;
    const ro = new ResizeObserver((entries) => {
      // contentRect.width excludes the scrollbar — exactly what we want
      // for laying out columns inside the scroll viewport.
      pendingWidth = entries[0]?.contentRect.width ?? pendingWidth;
      if (rafId === 0) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          setContainerWidth(pendingWidth);
        });
      }
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (rafId !== 0) cancelAnimationFrame(rafId);
    };
  }, []);

  // Build the visible-column list and compute widths. Memoised so the
  // <colgroup> doesn't churn on every keystroke in unrelated state.
  const visibleCols = useMemo(
    () => colPrefs.visibleIds.map((id) => COL_BY_ID[id]),
    [colPrefs.visibleIds],
  );
  const colWidths = useMemo(
    () =>
      computeColumnWidths(
        visibleCols,
        colPrefs.widths,
        Math.max(0, containerWidth - ROW_ACTIONS_WIDTH),
      ),
    [visibleCols, colPrefs.widths, containerWidth],
  );
  const hasExplicitWidths = Object.keys(colPrefs.widths).length > 0;

  // Column-resize gesture.
  //
  // Performance note: we *don't* drive the live drag through React state.
  // With ~2000 stamps in the table, calling setState on every mousemove
  // triggers a full table re-render at 60+ Hz, which feels laggy. Instead
  // we manipulate the <col>'s inline style directly via a ref, and only
  // commit to React state (and the persisted prefs) on mouseup. The
  // table re-renders exactly once per drag — cheap.
  //
  // The 'listeners on document, not the divider' pattern from the
  // companion ts2068-disk-browser doc is preserved: a fast drag can
  // outrun the cursor off the 6-px handle, and only a document-level
  // mouseup is guaranteed to fire.
  const colgroupRef = useRef<HTMLTableColElement>(null);
  const dragRef = useRef<{
    id: ColumnId;
    colIndex: number;
    startX: number;
    startWidth: number;
    finalWidth: number;
  } | null>(null);

  const onResizeStart = useCallback(
    (id: ColumnId, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const colIndex = colPrefs.visibleIds.indexOf(id);
      if (colIndex < 0) return;
      const startWidth = colWidths[id] ?? COL_BY_ID[id].defaultWidth;
      dragRef.current = { id, colIndex, startX: e.clientX, startWidth, finalWidth: startWidth };

      // Lock cursor + suppress text selection globally while dragging.
      // Without this the cursor flickers between col-resize and the
      // default I-beam every time the pointer leaves the 6-px handle,
      // and dragging across header labels can start a text selection.
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMove = (ev: globalThis.MouseEvent): void => {
        const drag = dragRef.current;
        if (!drag) return;
        const dx = ev.clientX - drag.startX;
        const next = Math.max(COL_BY_ID[drag.id].minWidth, drag.startWidth + dx);
        drag.finalWidth = next;
        // Direct DOM update — bypasses React entirely during the drag.
        const colgroup = colgroupRef.current;
        const colEl = colgroup?.children[drag.colIndex] as
          | HTMLTableColElement
          | undefined;
        if (colEl) colEl.style.width = `${next}px`;
      };
      const onUp = (): void => {
        const drag = dragRef.current;
        dragRef.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (drag) setWidth(drag.id, drag.finalWidth);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [colPrefs.visibleIds, colWidths, setWidth],
  );

  const albumsById = useMemo(() => new Map(albums.map((a) => [a.id, a])), [albums]);
  const collectionsById = useMemo(() => new Map(collections.map((c) => [c.id, c])), [collections]);
  const countriesById = useMemo(() => new Map(countries.map((c) => [c.id, c])), [countries]);
  const seriesById = useMemo(() => new Map(seriesList.map((s) => [s.id, s])), [seriesList]);

  const { rows, header, canAddStamp, currentAlbumId } = useMemo(() => {
    const sourceStamps = isTrashView ? trashedStamps : liveStamps;
    let filtered = sourceStamps;

    if (!isTrashView) {
      if (selection.type === 'album') {
        filtered = filtered.filter((s) => s.albumId === selection.id);
      } else if (selection.type === 'collection') {
        const inCollection = new Set(
          albums.filter((a) => a.collectionId === selection.id).map((a) => a.id),
        );
        filtered = filtered.filter((s) => inCollection.has(s.albumId));
      } else if (selection.type === 'smart') {
        if (selection.kind === 'allOwned') {
          filtered = filtered.filter((s) => s.collectionStatusRaw === 'owned');
        } else if (selection.kind === 'wantList') {
          filtered = filtered.filter((s) => s.collectionStatusRaw === 'wanted');
        } else if (selection.kind === 'notCollecting') {
          filtered = filtered.filter((s) => s.collectionStatusRaw === 'notCollecting');
        } else if (selection.kind === 'recentAdditions') {
          const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
          filtered = filtered.filter((s) => {
            const t = Date.parse(s.createdAt);
            return Number.isFinite(t) && t >= cutoff;
          });
        } else if (selection.kind === 'tradingStock') {
          // Anything explicitly flagged tradeable, OR anything with quantity > 1
          filtered = filtered.filter((s) => s.tradeable || s.quantity > 1);
        }
      }
    }

    if (statusFilter) {
      filtered = filtered.filter((s) => s.collectionStatusRaw === statusFilter);
    }

    if (seriesFilter) {
      const sid = seriesFilter === 'none' ? null : Number(seriesFilter);
      filtered = filtered.filter((s) => (s.seriesId ?? null) === sid);
    }

    // Timeline filter — by yearStart. Stamps with no year never match a
    // restricted range; they're shown only when the timeline filter is off.
    if (showTimeline && (yearMin != null || yearMax != null)) {
      filtered = filtered.filter((s) => {
        if (s.yearStart == null) return false;
        if (yearMin != null && s.yearStart < yearMin) return false;
        if (yearMax != null && s.yearStart > yearMax) return false;
        return true;
      });
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((s) => {
        const hay = [
          s.catalogNumber,
          s.denomination,
          s.color,
          s.notes,
          s.watermark ?? '',
          s.acquisitionSource,
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    filtered = [...filtered].sort((a, b) =>
      compareCatalogNumbers(a.catalogNumber, b.catalogNumber),
    );

    let h = 'All Stamps';
    if (isTrashView) h = 'Trash';
    else if (selection.type === 'album') h = albumsById.get(selection.id)?.name ?? 'Album';
    else if (selection.type === 'collection')
      h = collectionsById.get(selection.id)?.name ?? 'Collection';
    else if (selection.type === 'smart') {
      h =
        selection.kind === 'allOwned'
          ? 'All Owned'
          : selection.kind === 'wantList'
            ? 'Want List'
            : selection.kind === 'notCollecting'
              ? 'Not Collecting'
              : selection.kind === 'tradingStock'
                ? 'Trading Stock'
                : selection.kind === 'recentAdditions'
                  ? 'Recent Additions'
                  : 'Trash';
    }

    return {
      rows: filtered,
      header: h,
      canAddStamp: !isTrashView && selection.type === 'album',
      currentAlbumId: selection.type === 'album' ? selection.id : null,
    };
  }, [liveStamps, trashedStamps, isTrashView, albums, albumsById, collectionsById, selection, statusFilter, seriesFilter, showTimeline, yearMin, yearMax, search]);

  // When the sidebar selection changes, reset stamp selection.
  useEffect(() => {
    clearStampSelection();
    setPopover(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.type, 'id' in selection ? selection.id : null, 'kind' in selection ? selection.kind : null]);

  // Row virtualization. Only render the rows that are actually visible
  // in the scroll viewport, plus a small overscan buffer above and
  // below so scrolling doesn't reveal blank rows momentarily. With ~2000
  // stamps this drops the React reconciliation cost from O(n) to roughly
  // O(viewport_height / row_height), typically ~30-50 rows.
  //
  // We use a fixed estimateSize because content-visibility: auto on the
  // row CSS already pegs the intrinsic size to 28px. Letting the
  // virtualizer measure each row would be more accurate but adds layout
  // cost we don't need here.
  const ROW_HEIGHT = 28;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]!.start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - virtualItems[virtualItems.length - 1]!.end
      : 0;

  const rowIndexById = useMemo(() => {
    const m = new Map<number, number>();
    rows.forEach((r, i) => m.set(r.id, i));
    return m;
  }, [rows]);

  const onRowClick = useCallback(
    (e: MouseEvent, stamp: Stamp) => {
      const mod = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      if (shift && focusedStampId != null) {
        const anchor = rowIndexById.get(focusedStampId);
        const target = rowIndexById.get(stamp.id);
        if (anchor != null && target != null) {
          const [lo, hi] = anchor <= target ? [anchor, target] : [target, anchor];
          const ids = rows.slice(lo, hi + 1).map((r) => r.id);
          setSelectedStamps(ids, stamp.id);
          return;
        }
      }
      if (mod) {
        toggleStamp(stamp.id);
        return;
      }
      setSingleStamp(stamp.id);
    },
    [focusedStampId, rowIndexById, rows, setSelectedStamps, setSingleStamp, toggleStamp],
  );

  const onContextMenu = useCallback(
    (e: MouseEvent, stamp: Stamp) => {
      e.preventDefault();
      // If right-clicking a row that isn't in the current selection, replace
      // selection with just that row so the popover operates on it.
      if (!selectedStampIds.has(stamp.id)) {
        setSingleStamp(stamp.id);
      }
      setPopover({ x: e.clientX, y: e.clientY });
    },
    [selectedStampIds, setSingleStamp],
  );

  const doBulkDelete = useCallback(() => {
    if (selectedStampIds.size === 0) return;
    const ids = [...selectedStampIds];
    if (!confirm(`Move ${ids.length} stamp${ids.length === 1 ? '' : 's'} to Trash?`)) return;
    bulkDelete.mutate(ids);
    clearStampSelection();
  }, [selectedStampIds, bulkDelete, clearStampSelection]);

  const doBulkRestore = useCallback(() => {
    if (selectedStampIds.size === 0) return;
    restoreStamps.mutate([...selectedStampIds]);
    clearStampSelection();
  }, [selectedStampIds, restoreStamps, clearStampSelection]);

  const doBulkPatch = useCallback(
    (patch: StampPatchPayload) => {
      if (selectedStampIds.size === 0) return;
      bulkUpdate.mutate({ ids: [...selectedStampIds], patch });
    },
    [selectedStampIds, bulkUpdate],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (rows.length === 0) return;
      const focusedIdx = focusedStampId != null ? rowIndexById.get(focusedStampId) ?? -1 : -1;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = Math.min(rows.length - 1, focusedIdx < 0 ? 0 : focusedIdx + 1);
        setSingleStamp(rows[nextIdx]!.id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = Math.max(0, focusedIdx < 0 ? 0 : focusedIdx - 1);
        setSingleStamp(rows[prevIdx]!.id);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedStampIds.size > 0) doBulkDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        clearStampSelection();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedStamps(
          rows.map((r) => r.id),
          rows[0]?.id ?? null,
        );
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
        // Copy selected rows as TSV. Doesn't fire if the user is in a
        // form field elsewhere — this listener is on .stamp-list which
        // only has focus when the table itself is focused.
        if (selectedStampIds.size === 0) return;
        e.preventDefault();
        const selectedRows = rows.filter((r) => selectedStampIds.has(r.id));
        const tsv = stampsToTsv(selectedRows, albumsById, collectionsById, countriesById, seriesById);
        if (tsv) {
          void navigator.clipboard.writeText(tsv);
        }
      }
    },
    [rows, rowIndexById, focusedStampId, setSingleStamp, selectedStampIds, doBulkDelete, clearStampSelection, setSelectedStamps, albumsById, collectionsById, countriesById, seriesById],
  );

  const onAddStamp = async () => {
    if (!canAddStamp || selection.type !== 'album') return;
    const created = await createStamp.mutateAsync({
      albumId: selection.id,
      catalogNumber: '',
      gumConditionRaw: settings?.defaultGumConditionRaw || 'unspecified',
      centeringGradeRaw: settings?.defaultCenteringGradeRaw || 'unspecified',
      collectionStatusRaw: settings?.defaultCollectionStatusRaw || 'owned',
    });
    setSingleStamp(created.id);
  };

  const onDeleteOne = useCallback(
    (s: Stamp) => {
      if (isTrashView) {
        restoreStamps.mutate([s.id]);
        return;
      }
      if (!confirm(`Move "${s.catalogNumber || '(untitled)'}" to Trash?`)) return;
      deleteStamp.mutate(s.id);
      if (focusedStampId === s.id) clearStampSelection();
    },
    [isTrashView, restoreStamps, deleteStamp, focusedStampId, clearStampSelection],
  );

  // Stable per-stamp commit callback for inline-edit cells. Wrapping with
  // useCallback keeps the prop reference stable across re-renders so the
  // memoized StampRow doesn't bust on every parent render.
  const onCommitField = useCallback(
    (id: number, patch: StampPatchPayload) => {
      updateStamp.mutate({ id, patch });
    },
    [updateStamp],
  );

  const onEmptyTrash = () => {
    if (!confirm('Permanently delete everything in Trash? This cannot be undone.')) return;
    emptyTrash.mutate();
    clearStampSelection();
  };

  // Listen for menu-driven CSV + template commands
  useEffect(() => {
    const offImport = window.hinged.events.onImportCsv(async () => {
      if (selection.type !== 'album') {
        alert('Select an album before importing a CSV.');
        return;
      }
      const album = albumsById.get(selection.id);
      if (!album) return;
      const res = await window.hinged.csv.pickAndPreview();
      if (res.ok) {
        openCsvImport({ preview: res.preview, albumId: album.id, albumName: album.name });
      }
    });
    const offExport = window.hinged.events.onExportCsv(() => {
      if (rows.length === 0) {
        alert('No stamps in the current view to export.');
        return;
      }
      void window.hinged.csv.exportStamps(rows);
    });
    const offExportTemplate = window.hinged.events.onExportAlbumAsTemplate(() => {
      if (selection.type !== 'album') {
        alert('Select an album before exporting it as a template.');
        return;
      }
      const album = albumsById.get(selection.id);
      if (!album) return;
      void window.hinged.templates.exportAlbum(album.id, album.name);
    });
    return () => {
      offImport();
      offExport();
      offExportTemplate();
    };
  }, [selection, albumsById, rows, openCsvImport]);

  // Paste-from-clipboard import: when an album is selected and the user
  // pastes a multi-row text block (TSV from Excel/Numbers, or CSV), open
  // the column-mapping dialog with the pasted data.
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      if (selection.type !== 'album') return;
      // Don't hijack pastes targeted at form fields, contenteditables, etc.
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      const text = e.clipboardData?.getData('text/plain') ?? '';
      // Only interpret as data if it has at least two lines + a delimiter on
      // the first row. Avoids triggering on incidental short pastes.
      const firstLine = text.split(/\r?\n/)[0] ?? '';
      const looksTabular =
        text.includes('\n') && (firstLine.includes('\t') || firstLine.includes(','));
      if (!looksTabular) return;

      e.preventDefault();
      const album = albumsById.get(selection.id);
      if (!album) return;
      const res = await window.hinged.csv.previewText(text);
      if (res.ok) {
        openCsvImport({ preview: res.preview, albumId: album.id, albumName: album.name });
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [selection, albumsById, openCsvImport]);

  const selectionCount = selectedStampIds.size;

  return (
    <section
      className="stamp-list"
      tabIndex={0}
      onKeyDown={onKeyDown}
      ref={scrollRef as unknown as React.RefObject<HTMLElement>}
    >
      <div className="stamp-list-toolbar">
        <div className="toolbar-title">
          <h2>{header}</h2>
          <span className="subtle">
            {rows.length} stamp{rows.length === 1 ? '' : 's'}
            {selectionCount > 1 ? ` · ${selectionCount} selected` : ''}
          </span>
        </div>
        <div className="toolbar-controls">
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="owned">Owned</option>
            <option value="wanted">Wanted</option>
            <option value="notCollecting">Not Collecting</option>
          </Select>
          <Select
            value={seriesFilter}
            onChange={(e) => setSeriesFilter(e.target.value)}
            title="Filter by series"
          >
            <option value="">All series</option>
            <option value="none">— No series —</option>
            {seriesList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <button
            type="button"
            className={`btn ${showTimeline ? 'btn-primary' : ''}`}
            onClick={() => {
              const next = !showTimeline;
              setShowTimeline(next);
              if (!next) {
                setYearMin(null);
                setYearMax(null);
              }
            }}
            title={showTimeline ? 'Hide year filter' : 'Filter by year range'}
            style={{ fontSize: '12px' }}
          >
            Years
          </button>
          <ColumnsMenu
            prefs={colPrefs}
            setVisibility={setVisibility}
            resetAllWidths={resetAllWidths}
            hasExplicitWidths={hasExplicitWidths}
          />
          {isTrashView ? (
            <>
              {selectionCount > 0 && (
                <Button onClick={doBulkRestore}>Restore ({selectionCount})</Button>
              )}
              <Button variant="danger" onClick={onEmptyTrash} disabled={rows.length === 0}>
                Empty Trash
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={() => void onAddStamp()}
              disabled={!canAddStamp}
              title={canAddStamp ? 'Add a new stamp' : 'Select an album to add stamps'}
            >
              + Stamp
            </Button>
          )}
        </div>
      </div>

      {canAddStamp && currentAlbumId != null && <QuickAddRow albumId={currentAlbumId} />}

      {showTimeline && <TimelineBar
        rows={rows}
        yearMin={yearMin}
        yearMax={yearMax}
        setYearMin={setYearMin}
        setYearMax={setYearMax}
        sourceStamps={isTrashView ? trashedStamps : liveStamps}
      />}

      {!isTrashView && selectionCount > 1 && (
        <div className="bulk-toolbar">
          <span>{selectionCount} selected</span>
          <Button onClick={() => doBulkPatch({ collectionStatusRaw: 'owned' })}>
            Mark Owned
          </Button>
          <Button onClick={() => doBulkPatch({ collectionStatusRaw: 'wanted' })}>
            Mark Wanted
          </Button>
          <Button variant="danger" onClick={doBulkDelete}>
            Delete
          </Button>
          <Button onClick={clearStampSelection}>Clear</Button>
        </div>
      )}

      <div className="stamp-list-scroll">
        {rows.length === 0 ? (
          <div className="empty-state">
            {isTrashView
              ? 'Trash is empty.'
              : selection.type === 'none'
                ? 'Select a collection or album to see stamps.'
                : 'No stamps match the current filters.'}
          </div>
        ) : (
          <table className="stamp-table">
            <colgroup ref={colgroupRef}>
              {visibleCols.map((c) => (
                <col key={c.id} style={{ width: `${colWidths[c.id]}px` }} />
              ))}
              <col style={{ width: `${ROW_ACTIONS_WIDTH}px` }} />
            </colgroup>
            <thead>
              <tr>
                {visibleCols.map((c) => (
                  <th key={c.id} className={`col-${c.id}`}>
                    <span className="th-label">{c.label}</span>
                    <span
                      className="col-resizer"
                      onMouseDown={(e) => onResizeStart(c.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        // Double-click clears the explicit width, returning
                        // the column to auto-fit.
                        setWidth(c.id, null);
                      }}
                      title="Drag to resize · double-click to reset"
                    />
                  </th>
                ))}
                <th className="row-actions" />
              </tr>
            </thead>
            <tbody>
              {/* Top spacer for off-screen rows above the viewport. The
                  fixed-layout colspan covers every visible column + the
                  row-actions column. */}
              {paddingTop > 0 && (
                <tr aria-hidden style={{ height: `${paddingTop}px` }}>
                  <td colSpan={visibleCols.length + 1} />
                </tr>
              )}
              {virtualItems.map((vi) => {
                const s = rows[vi.index]!;
                return (
                  <StampRow
                    key={s.id}
                    stamp={s}
                    isSelected={selectedStampIds.has(s.id)}
                    visibleIds={colPrefs.visibleIds}
                    isTrashView={isTrashView}
                    albumsById={albumsById}
                    collectionsById={collectionsById}
                    countriesById={countriesById}
                    seriesById={seriesById}
                    onCommitField={onCommitField}
                    onRowClick={onRowClick}
                    onContextMenu={onContextMenu}
                    onDeleteOne={onDeleteOne}
                  />
                );
              })}
              {paddingBottom > 0 && (
                <tr aria-hidden style={{ height: `${paddingBottom}px` }}>
                  <td colSpan={visibleCols.length + 1} />
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {popover && !isTrashView && (
        <BulkActionsPopover
          x={popover.x}
          y={popover.y}
          count={selectedStampIds.size}
          albums={albums}
          currentAlbumId={currentAlbumId}
          onClose={() => setPopover(null)}
          onApplyPatch={doBulkPatch}
          onDelete={doBulkDelete}
          onAssignSeries={() => openBulkAssignSeries([...selectedStampIds])}
        />
      )}
    </section>
  );
}
