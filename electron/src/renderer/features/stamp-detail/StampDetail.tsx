import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  useAlbums,
  useCollections,
  useCountries,
  useRestoreStamps,
  useSettings,
  useStamps,
  useTrashedStamps,
  useUpdateStamp,
} from '@renderer/lib/api';
import { useSelection } from '@renderer/state/selection';
import { Button, Field, Input, Select, Textarea } from '@renderer/components/primitives';
import { SeriesPicker } from '@renderer/components/SeriesPicker';
import {
  catalogSystemLabel,
  centeringGrades,
  collectionStatuses,
  gumConditions,
} from '@shared/display';
import type { Stamp, StampPatchPayload } from '@shared/types';
import { StampImage } from './StampImage';

// Autosave: each field commits via onBlur for text/number, onChange for selects.
// Draft state stays in sync with the selected stamp while typing.

interface Draft {
  catalogNumber: string;
  yearStart: string;
  yearEnd: string;
  denomination: string;
  color: string;
  perforationGauge: string;
  watermark: string;
  notes: string;
  purchasePrice: string;
  purchaseDate: string;
  acquisitionSource: string;
  gumConditionRaw: string;
  centeringGradeRaw: string;
  collectionStatusRaw: string;
  countryId: string;
  quantity: string;
  tradeable: boolean;
  certNumber: string;
  certIssuer: string;
  certDate: string;
}

const emptyDraft: Draft = {
  catalogNumber: '',
  yearStart: '',
  yearEnd: '',
  denomination: '',
  color: '',
  perforationGauge: '',
  watermark: '',
  notes: '',
  purchasePrice: '',
  purchaseDate: '',
  acquisitionSource: '',
  gumConditionRaw: 'unspecified',
  centeringGradeRaw: 'unspecified',
  collectionStatusRaw: 'owned',
  countryId: '',
  quantity: '1',
  tradeable: false,
  certNumber: '',
  certIssuer: '',
  certDate: '',
};

function fromStamp(s: Stamp): Draft {
  return {
    catalogNumber: s.catalogNumber,
    yearStart: s.yearStart != null ? String(s.yearStart) : '',
    yearEnd: s.yearEnd != null ? String(s.yearEnd) : '',
    denomination: s.denomination,
    color: s.color,
    perforationGauge: s.perforationGauge ?? '',
    watermark: s.watermark ?? '',
    notes: s.notes,
    purchasePrice: s.purchasePrice ?? '',
    purchaseDate: s.purchaseDate ? s.purchaseDate.slice(0, 10) : '',
    acquisitionSource: s.acquisitionSource,
    gumConditionRaw: s.gumConditionRaw,
    centeringGradeRaw: s.centeringGradeRaw,
    collectionStatusRaw: s.collectionStatusRaw,
    countryId: s.countryId != null ? String(s.countryId) : '',
    quantity: String(s.quantity ?? 1),
    tradeable: s.tradeable,
    certNumber: s.certNumber ?? '',
    certIssuer: s.certIssuer ?? '',
    certDate: s.certDate ? s.certDate.slice(0, 10) : '',
  };
}

export function StampDetail() {
  const { focusedStampId, selectedStampIds, clearStampSelection } = useSelection();
  const { data: stamps = [] } = useStamps();
  const { data: trashedStamps = [] } = useTrashedStamps();
  const { data: countries = [] } = useCountries();
  const { data: albums = [] } = useAlbums();
  const { data: collections = [] } = useCollections();
  const { data: settings } = useSettings();
  const updateStamp = useUpdateStamp();
  const restoreStamps = useRestoreStamps();
  const currency = settings?.currencySymbol ?? '$';

  const stamp = useMemo(() => {
    if (focusedStampId == null) return null;
    return (
      stamps.find((s) => s.id === focusedStampId) ??
      trashedStamps.find((s) => s.id === focusedStampId) ??
      null
    );
  }, [stamps, trashedStamps, focusedStampId]);

  // *** Hooks must be called unconditionally on every render, BEFORE any early
  // return — otherwise React throws minified error #300 ("rendered fewer hooks
  // than expected") when the bulk-selection branch is taken. See issue #1. ***
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  useEffect(() => {
    setDraft(stamp ? fromStamp(stamp) : emptyDraft);
  }, [stamp?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enter-advances-to-next-field: when the user hits Return in a single-line
  // input or a select, blur it (which triggers the autosave commit) and move
  // focus to the next focusable form control inside the panel. Textareas keep
  // their normal newline behaviour.
  const formRef = useRef<HTMLFormElement>(null);
  const handleEnterAdvance = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement;
    const tag = target.tagName;
    if (tag === 'TEXTAREA' || tag === 'BUTTON') return;
    if (tag !== 'INPUT' && tag !== 'SELECT') return;
    if (tag === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') return;
    e.preventDefault();
    const root = formRef.current;
    if (!root) return;
    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>('input, select, textarea, button'),
    ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);
    const idx = focusables.indexOf(target);
    if (idx === -1) return;
    // Blur first so onBlur autosave runs before focus moves.
    target.blur();
    const next = focusables[idx + 1];
    if (next) next.focus();
  };

  // When >1 selected, show a bulk placeholder instead of per-stamp edit.
  if (selectedStampIds.size > 1) {
    return (
      <section className="stamp-detail">
        <div className="empty-state">
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>{selectedStampIds.size} stamps selected</strong>
          </div>
          <div className="subtle small" style={{ marginBottom: '0.75rem' }}>
            Use the bulk toolbar above the stamp list, or right-click any
            selected row for more bulk actions.
          </div>
          <Button onClick={clearStampSelection}>Clear selection</Button>
        </div>
      </section>
    );
  }

  if (!stamp) {
    return (
      <section className="stamp-detail">
        <div className="empty-state">Select a stamp to edit.</div>
      </section>
    );
  }

  // Trashed stamps are read-only until restored.
  if (stamp.deletedAt) {
    return (
      <section className="stamp-detail">
        <div className="detail-header">
          <div className="detail-breadcrumb subtle">Trash</div>
          <h2>{stamp.catalogNumber || '(untitled stamp)'}</h2>
        </div>
        <p className="subtle small">
          This stamp is in Trash. Restore it to edit, or empty Trash to remove it permanently.
        </p>
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <Button
            variant="primary"
            onClick={() => {
              restoreStamps.mutate([stamp.id]);
              clearStampSelection();
            }}
          >
            Restore
          </Button>
        </div>
      </section>
    );
  }

  const commit = (patch: StampPatchPayload) => {
    updateStamp.mutate({ id: stamp.id, patch });
  };

  // Helpers: commit a string/number field from the current draft if it changed.
  const commitIfChanged = (field: keyof Draft, patch: StampPatchPayload) => {
    if (draft[field] === fromStamp(stamp)[field]) return;
    commit(patch);
  };

  // Context headers
  const album = albums.find((a) => a.id === stamp.albumId);
  const collection = album ? collections.find((c) => c.id === album.collectionId) : null;
  const country = countries.find(
    (c) => c.id === (collection?.countryId ?? stamp.countryId ?? -1),
  );

  // Build a Google query from whatever metadata we have. Catalog # is
  // quoted to bias the search toward exact matches; everything else is
  // bare so Google can do its normal ranking.
  const searchGoogle = () => {
    const parts: string[] = [];
    if (country?.name) parts.push(country.name);
    if (stamp.catalogNumber) {
      const sys = collection?.catalogSystemRaw ?? 'scott';
      const prefix = country?.catalogPrefixes?.[sys] ?? '';
      parts.push(`"${prefix ? `${prefix} ` : ''}${stamp.catalogNumber}"`);
    }
    if (stamp.denomination) parts.push(stamp.denomination);
    if (stamp.yearStart != null) parts.push(String(stamp.yearStart));
    parts.push('stamp');
    const q = parts.filter(Boolean).join(' ');
    const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    if (settings?.searchInApp === 'false') {
      // window.open is intercepted by setWindowOpenHandler in main and
      // routed through shell.openExternal, so this opens in the user's
      // default browser rather than a new Electron window.
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      void window.hinged.search.open(url);
    }
  };

  return (
    <section className="stamp-detail">
      <div className="detail-header">
        <div className="detail-breadcrumb subtle">
          {collection?.name ?? '—'} / {album?.name ?? '—'}
          {collection && (
            <span className="subtle small">
              {' '}
              ({catalogSystemLabel[collection.catalogSystemRaw] ?? collection.catalogSystemRaw})
            </span>
          )}
        </div>
        <div className="detail-title-row">
          <h2 className="detail-title" title={[stamp.catalogNumber, stamp.denomination].filter(Boolean).join(' — ') || '(untitled stamp)'}>
            <span className="detail-title-cat">{stamp.catalogNumber || '(untitled stamp)'}</span>
            {stamp.denomination && (
              <span className="detail-title-denom">{stamp.denomination}</span>
            )}
          </h2>
          <button
            type="button"
            className="btn btn-default detail-search-btn"
            onClick={searchGoogle}
            title="Search Google for this stamp — opens in your default browser"
          >
            <span aria-hidden>🔍</span> Search Google
          </button>
        </div>
      </div>

      <div className="detail-image">
        <StampImage
          filename={stamp.imageFilename}
          onChange={(filename) => commit({ imageFilename: filename })}
        />
      </div>

      <form
        ref={formRef}
        onSubmit={(e) => e.preventDefault()}
        onKeyDown={handleEnterAdvance}
      >
        <div className="detail-grid">
          <Field label="Catalog Number">
            <Input
              value={draft.catalogNumber}
              onChange={(e) => setDraft({ ...draft, catalogNumber: e.target.value })}
              onBlur={() =>
                commitIfChanged('catalogNumber', { catalogNumber: draft.catalogNumber })
              }
            />
          </Field>

          <Field label="Status">
            <Select
              value={draft.collectionStatusRaw}
              onChange={(e) => {
                const v = e.target.value;
                setDraft({ ...draft, collectionStatusRaw: v });
                commit({ collectionStatusRaw: v });
              }}
            >
              {collectionStatuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Denomination" wide>
            <Input
              value={draft.denomination}
              onChange={(e) => setDraft({ ...draft, denomination: e.target.value })}
              onBlur={() => commitIfChanged('denomination', { denomination: draft.denomination })}
            />
          </Field>

          <Field label="Year Start">
            <Input
              type="number"
              value={draft.yearStart}
              onChange={(e) => setDraft({ ...draft, yearStart: e.target.value })}
              onBlur={() =>
                commitIfChanged('yearStart', {
                  yearStart: draft.yearStart ? Number(draft.yearStart) : null,
                })
              }
            />
          </Field>

          <Field label="Year End">
            <Input
              type="number"
              value={draft.yearEnd}
              onChange={(e) => setDraft({ ...draft, yearEnd: e.target.value })}
              onBlur={() =>
                commitIfChanged('yearEnd', {
                  yearEnd: draft.yearEnd ? Number(draft.yearEnd) : null,
                })
              }
            />
          </Field>

          <Field label="Color">
            <Input
              value={draft.color}
              onChange={(e) => setDraft({ ...draft, color: e.target.value })}
              onBlur={() => commitIfChanged('color', { color: draft.color })}
            />
          </Field>

          <Field label="Perforation">
            <Input
              value={draft.perforationGauge}
              onChange={(e) => setDraft({ ...draft, perforationGauge: e.target.value })}
              onBlur={() =>
                commitIfChanged('perforationGauge', {
                  perforationGauge: draft.perforationGauge || null,
                })
              }
            />
          </Field>

          <Field label="Watermark">
            <Input
              value={draft.watermark}
              onChange={(e) => setDraft({ ...draft, watermark: e.target.value })}
              onBlur={() => commitIfChanged('watermark', { watermark: draft.watermark || null })}
            />
          </Field>

          <Field label="Gum Condition">
            <Select
              value={draft.gumConditionRaw}
              onChange={(e) => {
                const v = e.target.value;
                setDraft({ ...draft, gumConditionRaw: v });
                commit({ gumConditionRaw: v });
              }}
            >
              {gumConditions.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Centering">
            <Select
              value={draft.centeringGradeRaw}
              onChange={(e) => {
                const v = e.target.value;
                setDraft({ ...draft, centeringGradeRaw: v });
                commit({ centeringGradeRaw: v });
              }}
            >
              {centeringGrades.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Country" hint="Per-stamp override, usually inherited from collection">
            <Select
              value={draft.countryId}
              onChange={(e) => {
                const v = e.target.value;
                setDraft({ ...draft, countryId: v });
                commit({ countryId: v ? Number(v) : null });
              }}
            >
              <option value="">— Inherit from collection —</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Series" hint="e.g. Famous Americans, Prexies, Liberty" wide>
            <SeriesPicker
              value={stamp.seriesId}
              onChange={(id) => commit({ seriesId: id })}
              defaultCountryId={collection?.countryId ?? stamp.countryId ?? null}
            />
          </Field>

          <Field label={`Purchase Price (${currency})`}>
            <Input
              value={draft.purchasePrice}
              onChange={(e) => setDraft({ ...draft, purchasePrice: e.target.value })}
              onBlur={() =>
                commitIfChanged('purchasePrice', {
                  purchasePrice: draft.purchasePrice || null,
                })
              }
              placeholder="e.g. 12.50"
            />
          </Field>

          <Field label="Purchase Date">
            <Input
              type="date"
              value={draft.purchaseDate}
              onChange={(e) => setDraft({ ...draft, purchaseDate: e.target.value })}
              onBlur={() =>
                commitIfChanged('purchaseDate', {
                  purchaseDate: draft.purchaseDate
                    ? `${draft.purchaseDate}T00:00:00Z`
                    : null,
                })
              }
            />
          </Field>

          <Field label="Source" wide>
            <Input
              value={draft.acquisitionSource}
              onChange={(e) => setDraft({ ...draft, acquisitionSource: e.target.value })}
              onBlur={() =>
                commitIfChanged('acquisitionSource', { acquisitionSource: draft.acquisitionSource })
              }
            />
          </Field>

          <Field label="Quantity" hint="Set above 1 to track duplicates">
            <Input
              type="number"
              min={1}
              value={draft.quantity}
              onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
              onBlur={() => {
                const n = Math.max(1, Number(draft.quantity) || 1);
                if (n !== stamp.quantity) commit({ quantity: n });
              }}
            />
          </Field>

          <Field label="Tradeable" wide>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={draft.tradeable}
                onChange={(e) => {
                  setDraft({ ...draft, tradeable: e.target.checked });
                  commit({ tradeable: e.target.checked });
                }}
              />
              <span className="subtle small">Show in Trading Stock smart collection</span>
            </label>
          </Field>
        </div>

        <Field label="Notes">
          <Textarea
            rows={3}
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            onBlur={() => commitIfChanged('notes', { notes: draft.notes })}
          />
        </Field>

        <details className="cert-section" open={Boolean(stamp.certNumber || stamp.certIssuer || stamp.certDate)}>
          <summary>Certification &amp; provenance</summary>
          <div className="detail-grid" style={{ marginTop: '0.5rem' }}>
            <Field label="Cert Number">
              <Input
                value={draft.certNumber}
                onChange={(e) => setDraft({ ...draft, certNumber: e.target.value })}
                onBlur={() =>
                  commitIfChanged('certNumber', { certNumber: draft.certNumber || null })
                }
                placeholder="e.g. 612345"
              />
            </Field>
            <Field label="Issuer">
              <Input
                value={draft.certIssuer}
                onChange={(e) => setDraft({ ...draft, certIssuer: e.target.value })}
                onBlur={() =>
                  commitIfChanged('certIssuer', { certIssuer: draft.certIssuer || null })
                }
                placeholder="e.g. PF, APEX, PSAG, BPA"
              />
            </Field>
            <Field label="Cert Date">
              <Input
                type="date"
                value={draft.certDate}
                onChange={(e) => setDraft({ ...draft, certDate: e.target.value })}
                onBlur={() =>
                  commitIfChanged('certDate', {
                    certDate: draft.certDate ? `${draft.certDate}T00:00:00Z` : null,
                  })
                }
              />
            </Field>
          </div>
        </details>
      </form>
    </section>
  );
}
