import {
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
} from '@renderer/lib/api';
import { useSelection } from '@renderer/state/selection';
import { useDialogs } from '@renderer/state/dialogs';
import { Button, Input, Select } from '@renderer/components/primitives';
import type { Album, Collection, Country, Stamp, StampPatchPayload } from '@shared/types';
import {
  centeringGradeShorthand,
  collectionStatusLabel,
  gumConditionShorthand,
} from '@shared/display';
import { QuickAddRow } from './QuickAddRow';
import { BulkActionsPopover } from './BulkActionsPopover';

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

function displayCatalogNumber(
  stamp: Stamp,
  albumsById: Map<number, Album>,
  collectionsById: Map<number, Collection>,
  countriesById: Map<number, Country>,
): string {
  const album = albumsById.get(stamp.albumId);
  const collection = album ? collectionsById.get(album.collectionId) : null;
  const countryId = collection?.countryId ?? stamp.countryId ?? null;
  const country = countryId != null ? countriesById.get(countryId) : null;
  const sys = collection?.catalogSystemRaw ?? 'scott';
  const prefix = country?.catalogPrefixes?.[sys] ?? '';
  return prefix ? `${prefix} ${stamp.catalogNumber}` : stamp.catalogNumber;
}

function displayYear(stamp: Stamp): string {
  if (stamp.yearStart == null) return '';
  if (stamp.yearEnd != null && stamp.yearEnd !== stamp.yearStart) {
    return `${stamp.yearStart}–${stamp.yearEnd}`;
  }
  return String(stamp.yearStart);
}

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
  const deleteStamp = useDeleteStamp();
  const bulkUpdate = useBulkUpdateStamps();
  const bulkDelete = useBulkDeleteStamps();
  const restoreStamps = useRestoreStamps();
  const emptyTrash = useEmptyTrash();
  const { openCsvImport } = useDialogs();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [seriesFilter, setSeriesFilter] = useState<string>('');
  const [popover, setPopover] = useState<{ x: number; y: number } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

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
  }, [liveStamps, trashedStamps, isTrashView, albums, albumsById, collectionsById, selection, statusFilter, seriesFilter, search]);

  // When the sidebar selection changes, reset stamp selection.
  useEffect(() => {
    clearStampSelection();
    setPopover(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.type, 'id' in selection ? selection.id : null, 'kind' in selection ? selection.kind : null]);

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

  const onDeleteOne = (s: Stamp) => {
    if (isTrashView) {
      restoreStamps.mutate([s.id]);
      return;
    }
    if (!confirm(`Move "${s.catalogNumber || '(untitled)'}" to Trash?`)) return;
    deleteStamp.mutate(s.id);
    if (focusedStampId === s.id) clearStampSelection();
  };

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
            <thead>
              <tr>
                <th>Catalog #</th>
                <th>Year</th>
                <th>Denom.</th>
                <th>Color</th>
                <th>Series</th>
                <th>Cond.</th>
                <th>Status</th>
                <th>Qty</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const isSel = selectedStampIds.has(s.id);
                const showsTrade = s.tradeable || s.quantity > 1;
                return (
                  <tr
                    key={s.id}
                    className={isSel ? 'selected' : ''}
                    onClick={(e) => onRowClick(e, s)}
                    onContextMenu={(e) => onContextMenu(e, s)}
                  >
                    <td className="mono">
                      {displayCatalogNumber(s, albumsById, collectionsById, countriesById) || '—'}
                    </td>
                    <td>{displayYear(s)}</td>
                    <td>{s.denomination}</td>
                    <td>{s.color}</td>
                    <td className="series-cell subtle small">
                      {s.seriesId != null ? seriesById.get(s.seriesId)?.name ?? '' : ''}
                    </td>
                    <td className="mono small">
                      {gumConditionShorthand(s.gumConditionRaw)}{' '}
                      {centeringGradeShorthand(s.centeringGradeRaw)}
                    </td>
                    <td>
                      <span className={`status-chip status-${s.collectionStatusRaw}`}>
                        {collectionStatusLabel[s.collectionStatusRaw] ?? s.collectionStatusRaw}
                      </span>
                    </td>
                    <td className="qty-cell mono small">
                      {showsTrade && (
                        <>
                          {s.quantity > 1 && <span>{s.quantity}</span>}
                          {s.tradeable && (
                            <span className="trade-badge" title="Tradeable">↔</span>
                          )}
                        </>
                      )}
                    </td>
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
              })}
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
        />
      )}
    </section>
  );
}
