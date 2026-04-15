import { useMemo, useState } from 'react';
import {
  useAlbums,
  useCollections,
  useCountries,
  useStamps,
} from '@renderer/lib/api';
import { Button, Dialog, Field, Input, Select } from '@renderer/components/primitives';
import {
  centeringGradeShorthand,
  gumConditionShorthand,
} from '@shared/display';
import type { Stamp } from '@shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

function extractNumeric(catalogNumber: string): number | null {
  const match = catalogNumber.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function compressGaps(gaps: number[]): string[] {
  if (gaps.length === 0) return [];
  const ranges: string[] = [];
  let start = gaps[0]!;
  let end = start;
  for (let i = 1; i < gaps.length; i += 1) {
    const n = gaps[i]!;
    if (n === end + 1) {
      end = n;
    } else {
      ranges.push(start === end ? `#${start}` : `#${start}-${end}`);
      start = n;
      end = n;
    }
  }
  ranges.push(start === end ? `#${start}` : `#${start}-${end}`);
  return ranges;
}

export function GapAnalysisDialog({ open, onClose }: Props) {
  const currentYear = new Date().getFullYear();
  const { data: countries = [] } = useCountries();
  const { data: collections = [] } = useCollections();
  const { data: albums = [] } = useAlbums();
  const { data: stamps = [] } = useStamps();

  const [countryId, setCountryId] = useState<string>('');
  const [startYear, setStartYear] = useState(1900);
  const [endYear, setEndYear] = useState(currentYear);
  const [analyzed, setAnalyzed] = useState(false);

  const albumsById = useMemo(() => new Map(albums.map((a) => [a.id, a])), [albums]);
  const collectionsById = useMemo(() => new Map(collections.map((c) => [c.id, c])), [collections]);

  const results = useMemo(() => {
    const cid = countryId ? Number(countryId) : null;
    if (!cid) return null;
    const matching = stamps.filter((s) => {
      // Resolve effective country (same as Swift collectionCountry)
      const album = albumsById.get(s.albumId);
      const collection = album ? collectionsById.get(album.collectionId) : null;
      const effectiveCountryId = collection?.countryId ?? s.countryId ?? null;
      if (effectiveCountryId !== cid) return false;
      const y = s.yearStart ?? 0;
      if (y < startYear) return false;
      if (y > endYear) return false;
      return true;
    });

    const owned = matching.filter((s) => s.collectionStatusRaw === 'owned');
    const wanted = matching.filter((s) => s.collectionStatusRaw === 'wanted');

    const ownedNums = new Set(owned.map((s) => extractNumeric(s.catalogNumber)).filter((n): n is number => n != null));
    const wantedNums = new Set(wanted.map((s) => extractNumeric(s.catalogNumber)).filter((n): n is number => n != null));
    const all = new Set([...ownedNums, ...wantedNums]);

    const gaps: number[] = [];
    if (all.size > 0) {
      const min = Math.min(...all);
      const max = Math.max(...all);
      if (max - min < 1000) {
        for (let n = min; n <= max; n += 1) {
          if (!all.has(n)) gaps.push(n);
        }
      }
    }

    const completion =
      owned.length + wanted.length === 0
        ? 0
        : (owned.length / (owned.length + wanted.length)) * 100;

    return {
      owned,
      wanted: wanted.sort((a, b) => (a.yearStart ?? 0) - (b.yearStart ?? 0)),
      gapRanges: compressGaps(gaps),
      totalGaps: gaps.length,
      completion,
    };
  }, [albumsById, collectionsById, stamps, countryId, startYear, endYear]);

  const preset = (a: number, b: number) => {
    setStartYear(a);
    setEndYear(b);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Gap Analysis"
      footer={<Button variant="primary" onClick={onClose}>Done</Button>}
    >
      <div className="gap-analysis">
        <div className="gap-query">
          <Field label="Country">
            <Select value={countryId} onChange={(e) => setCountryId(e.target.value)}>
              <option value="">— Choose a country —</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="gap-year-row">
            <Field label="From">
              <Input
                type="number"
                value={startYear}
                onChange={(e) => setStartYear(Number(e.target.value) || 1840)}
              />
            </Field>
            <Field label="To">
              <Input
                type="number"
                value={endYear}
                onChange={(e) => setEndYear(Number(e.target.value) || currentYear)}
              />
            </Field>
          </div>

          <div className="row">
            <Button onClick={() => preset(1840, 1940)}>Classic</Button>
            <Button onClick={() => preset(1941, 2000)}>Modern</Button>
            <Button onClick={() => preset(2001, currentYear)}>Recent</Button>
          </div>

          <Button
            variant="primary"
            onClick={() => setAnalyzed(true)}
            disabled={!countryId}
            style={{ marginTop: '0.5rem', alignSelf: 'stretch' }}
          >
            Analyze
          </Button>
        </div>

        <div className="gap-results">
          {!analyzed || !results ? (
            <div className="empty-state">Select a country and click Analyze.</div>
          ) : results.owned.length === 0 && results.wanted.length === 0 ? (
            <div className="empty-state">No stamps in the selected range.</div>
          ) : (
            <>
              <div className="gap-summary">
                <SummaryCell label="Owned" value={results.owned.length} color="var(--owned)" />
                <SummaryCell label="Wanted" value={results.wanted.length} color="var(--wanted)" />
                <SummaryCell
                  label="Completion"
                  value={`${results.completion.toFixed(1)}%`}
                />
                <SummaryCell label="Gaps" value={results.totalGaps} color="var(--accent)" />
              </div>

              <div className="completion-bar">
                <div
                  className="completion-bar-fill"
                  style={{ width: `${results.completion}%` }}
                />
              </div>

              {results.gapRanges.length > 0 && (
                <>
                  <div className="gap-section-header">Potential catalog number gaps</div>
                  <div className="gap-chips">
                    {results.gapRanges.slice(0, 50).map((r) => (
                      <span key={r} className="gap-chip">
                        {r}
                      </span>
                    ))}
                    {results.gapRanges.length > 50 && (
                      <span className="subtle small">
                        …and {results.gapRanges.length - 50} more
                      </span>
                    )}
                  </div>
                </>
              )}

              {results.wanted.length > 0 && (
                <>
                  <div className="gap-section-header">Wanted ({results.wanted.length})</div>
                  <ul className="gap-stamp-list">
                    {results.wanted.map((s) => (
                      <StampRow key={s.id} stamp={s} />
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function SummaryCell({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="summary-cell">
      <span className="subtle small">{label}</span>
      <strong style={color ? { color } : undefined}>{value}</strong>
    </div>
  );
}

function StampRow({ stamp }: { stamp: Stamp }) {
  const year =
    stamp.yearStart == null
      ? ''
      : stamp.yearEnd && stamp.yearEnd !== stamp.yearStart
        ? `${stamp.yearStart}–${stamp.yearEnd}`
        : String(stamp.yearStart);
  return (
    <li>
      <span className="mono">{stamp.catalogNumber || '—'}</span>
      <span className="subtle small">{year}</span>
      <span>{stamp.denomination}</span>
      <span className="subtle">{stamp.color}</span>
      <span className="mono small subtle">
        {gumConditionShorthand(stamp.gumConditionRaw)} {centeringGradeShorthand(stamp.centeringGradeRaw)}
      </span>
    </li>
  );
}
