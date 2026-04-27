import { useMemo } from 'react';
import { Button, Dialog } from '@renderer/components/primitives';
import {
  useAlbums,
  useCollections,
  useCountries,
  useSeries,
  useStamps,
} from '@renderer/lib/api';
import { catalogSystemLabel } from '@shared/display';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function StatisticsDialog({ open, onClose }: Props) {
  const { data: stamps = [] } = useStamps();
  const { data: collections = [] } = useCollections();
  const { data: albums = [] } = useAlbums();
  const { data: countries = [] } = useCountries();
  const { data: seriesList = [] } = useSeries();

  const albumsById = useMemo(() => new Map(albums.map((a) => [a.id, a])), [albums]);
  const collectionsById = useMemo(
    () => new Map(collections.map((c) => [c.id, c])),
    [collections],
  );
  const countriesById = useMemo(() => new Map(countries.map((c) => [c.id, c])), [countries]);
  const seriesById = useMemo(() => new Map(seriesList.map((s) => [s.id, s])), [seriesList]);

  const stats = useMemo(() => {
    // Status counts
    let owned = 0;
    let wanted = 0;
    let notCollecting = 0;
    let withImages = 0;
    let withCert = 0;
    let totalQty = 0;
    let tradeable = 0;

    let oldestYear: number | null = null;
    let newestYear: number | null = null;
    let oldestStamp: typeof stamps[number] | null = null;
    let newestStamp: typeof stamps[number] | null = null;

    let totalSpent = 0;
    let stampsWithPrice = 0;

    const byCountry = new Map<string, { owned: number; total: number }>();
    const bySeries = new Map<string, { owned: number; total: number }>();
    const byCatalogSystem = new Map<string, number>();
    const byDecade = new Map<number, number>();
    const recentByDay = new Map<string, number>();

    const cutoff30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let recentlyAdded = 0;

    for (const s of stamps) {
      if (s.collectionStatusRaw === 'owned') owned += 1;
      else if (s.collectionStatusRaw === 'wanted') wanted += 1;
      else if (s.collectionStatusRaw === 'notCollecting') notCollecting += 1;

      if (s.imageFilename) withImages += 1;
      if (s.certNumber || s.certIssuer) withCert += 1;
      if (s.tradeable || (s.quantity ?? 1) > 1) tradeable += 1;
      totalQty += s.quantity ?? 1;

      if (s.yearStart != null) {
        if (oldestYear == null || s.yearStart < oldestYear) {
          oldestYear = s.yearStart;
          oldestStamp = s;
        }
        if (newestYear == null || s.yearStart > newestYear) {
          newestYear = s.yearStart;
          newestStamp = s;
        }
        const decade = Math.floor(s.yearStart / 10) * 10;
        byDecade.set(decade, (byDecade.get(decade) ?? 0) + 1);
      }

      if (s.purchasePrice != null && s.purchasePrice !== '') {
        const n = Number(s.purchasePrice);
        if (Number.isFinite(n)) {
          totalSpent += n;
          stampsWithPrice += 1;
        }
      }

      // Country roll-up. Use stamp's own country if set, else inherit from
      // its collection.
      const album = albumsById.get(s.albumId);
      const collection = album ? collectionsById.get(album.collectionId) : null;
      const cid = s.countryId ?? collection?.countryId ?? null;
      if (cid != null) {
        const cname = countriesById.get(cid)?.name ?? 'Unknown';
        const cur = byCountry.get(cname) ?? { owned: 0, total: 0 };
        if (s.collectionStatusRaw === 'owned') {
          cur.owned += 1;
          cur.total += 1;
        } else if (s.collectionStatusRaw === 'wanted') {
          cur.total += 1;
        }
        byCountry.set(cname, cur);
      }

      if (s.seriesId != null) {
        const sname = seriesById.get(s.seriesId)?.name ?? 'Unknown';
        const cur = bySeries.get(sname) ?? { owned: 0, total: 0 };
        if (s.collectionStatusRaw === 'owned') {
          cur.owned += 1;
          cur.total += 1;
        } else if (s.collectionStatusRaw === 'wanted') {
          cur.total += 1;
        }
        bySeries.set(sname, cur);
      }

      if (collection) {
        const csys = collection.catalogSystemRaw;
        byCatalogSystem.set(csys, (byCatalogSystem.get(csys) ?? 0) + 1);
      }

      const created = Date.parse(s.createdAt);
      if (Number.isFinite(created) && created >= cutoff30Days) {
        recentlyAdded += 1;
        const day = new Date(created).toISOString().slice(0, 10);
        recentByDay.set(day, (recentByDay.get(day) ?? 0) + 1);
      }
    }

    const tracked = owned + wanted; // for completion %
    const completionPct = tracked === 0 ? 0 : (owned / tracked) * 100;

    const topCountries = Array.from(byCountry.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    const topSeries = Array.from(bySeries.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    const decadeEntries = Array.from(byDecade.entries()).sort((a, b) => a[0] - b[0]);

    return {
      total: stamps.length,
      owned,
      wanted,
      notCollecting,
      tracked,
      completionPct,
      withImages,
      withCert,
      tradeable,
      totalQty,
      oldestYear,
      newestYear,
      oldestStamp,
      newestStamp,
      totalSpent,
      stampsWithPrice,
      avgPrice: stampsWithPrice === 0 ? 0 : totalSpent / stampsWithPrice,
      topCountries,
      topSeries,
      byCatalogSystem,
      decadeEntries,
      recentlyAdded,
    };
  }, [stamps, albumsById, collectionsById, countriesById, seriesById]);

  const fmt = (n: number) => n.toLocaleString();
  const fmtPrice = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Bar chart by decade
  const maxDecade = stats.decadeEntries.reduce((m, [, n]) => Math.max(m, n), 0);

  // Bar chart for top countries / series
  const maxTopCountry = stats.topCountries.reduce((m, [, c]) => Math.max(m, c.total), 0);
  const maxTopSeries = stats.topSeries.reduce((m, [, c]) => Math.max(m, c.total), 0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Statistics"
      footer={<Button variant="primary" onClick={onClose}>Done</Button>}
    >
      <div className="stats-grid">
        <StatCard label="Total entries" value={fmt(stats.total)} />
        <StatCard label="Owned" value={fmt(stats.owned)} color="var(--owned)" />
        <StatCard label="Wanted" value={fmt(stats.wanted)} color="var(--wanted)" />
        <StatCard
          label="Completion"
          value={`${stats.completionPct.toFixed(1)}%`}
          hint={`of ${fmt(stats.tracked)} tracked`}
        />
        <StatCard label="With images" value={fmt(stats.withImages)} />
        <StatCard label="Trading stock" value={fmt(stats.tradeable)} hint="duplicates + tradeable" />
        <StatCard label="With certs" value={fmt(stats.withCert)} />
        <StatCard label="Added in last 30 days" value={fmt(stats.recentlyAdded)} />
      </div>

      <div className="completion-bar" style={{ marginTop: '0.4rem' }}>
        <div
          className="completion-bar-fill"
          style={{ width: `${stats.completionPct}%` }}
        />
      </div>

      {(stats.oldestStamp || stats.newestStamp) && (
        <>
          <div className="stats-section-header">Range</div>
          <div className="stats-grid">
            {stats.oldestStamp && (
              <StatCard
                label="Oldest"
                value={String(stats.oldestYear)}
                hint={
                  stats.oldestStamp.catalogNumber
                    ? `${stats.oldestStamp.catalogNumber} · ${stats.oldestStamp.denomination || '—'}`
                    : '—'
                }
              />
            )}
            {stats.newestStamp && (
              <StatCard
                label="Newest"
                value={String(stats.newestYear)}
                hint={
                  stats.newestStamp.catalogNumber
                    ? `${stats.newestStamp.catalogNumber} · ${stats.newestStamp.denomination || '—'}`
                    : '—'
                }
              />
            )}
            <StatCard
              label="Span"
              value={
                stats.oldestYear != null && stats.newestYear != null
                  ? `${stats.newestYear - stats.oldestYear} yrs`
                  : '—'
              }
            />
          </div>
        </>
      )}

      {stats.stampsWithPrice > 0 && (
        <>
          <div className="stats-section-header">Spending</div>
          <div className="stats-grid">
            <StatCard label="Total spent" value={fmtPrice(stats.totalSpent)} />
            <StatCard label="Stamps with price" value={fmt(stats.stampsWithPrice)} />
            <StatCard label="Average per stamp" value={fmtPrice(stats.avgPrice)} />
          </div>
        </>
      )}

      {stats.decadeEntries.length > 0 && (
        <>
          <div className="stats-section-header">By decade</div>
          <div className="stats-bars">
            {stats.decadeEntries.map(([decade, count]) => (
              <div key={decade} className="stats-bar-row">
                <span className="stats-bar-label mono small">{decade}s</span>
                <div className="stats-bar-track">
                  <div
                    className="stats-bar-fill"
                    style={{ width: `${(count / maxDecade) * 100}%` }}
                  />
                </div>
                <span className="stats-bar-value mono small">{fmt(count)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {stats.topCountries.length > 0 && (
        <>
          <div className="stats-section-header">Top countries</div>
          <div className="stats-bars">
            {stats.topCountries.map(([name, c]) => (
              <div key={name} className="stats-bar-row">
                <span className="stats-bar-label">{name}</span>
                <div className="stats-bar-track">
                  <div
                    className="stats-bar-fill"
                    style={{ width: `${(c.total / maxTopCountry) * 100}%` }}
                  />
                  <div
                    className="stats-bar-fill stats-bar-fill-owned"
                    style={{ width: `${(c.owned / maxTopCountry) * 100}%` }}
                  />
                </div>
                <span className="stats-bar-value mono small">
                  {fmt(c.owned)}/{fmt(c.total)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {stats.topSeries.length > 0 && (
        <>
          <div className="stats-section-header">Top series</div>
          <div className="stats-bars">
            {stats.topSeries.map(([name, c]) => (
              <div key={name} className="stats-bar-row">
                <span className="stats-bar-label">{name}</span>
                <div className="stats-bar-track">
                  <div
                    className="stats-bar-fill"
                    style={{ width: `${(c.total / maxTopSeries) * 100}%` }}
                  />
                  <div
                    className="stats-bar-fill stats-bar-fill-owned"
                    style={{ width: `${(c.owned / maxTopSeries) * 100}%` }}
                  />
                </div>
                <span className="stats-bar-value mono small">
                  {fmt(c.owned)}/{fmt(c.total)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {stats.byCatalogSystem.size > 0 && (
        <>
          <div className="stats-section-header">By catalog system</div>
          <div className="stats-bars">
            {Array.from(stats.byCatalogSystem.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([sys, count]) => (
                <div key={sys} className="stats-bar-row">
                  <span className="stats-bar-label">
                    {catalogSystemLabel[sys] ?? sys}
                  </span>
                  <div className="stats-bar-track">
                    <div
                      className="stats-bar-fill"
                      style={{
                        width: `${(count / Math.max(1, ...Array.from(stats.byCatalogSystem.values()))) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="stats-bar-value mono small">{fmt(count)}</span>
                </div>
              ))}
          </div>
        </>
      )}

      {stats.total === 0 && (
        <div className="empty-state">
          Add some stamps and your collection statistics will appear here.
        </div>
      )}
    </Dialog>
  );
}

function StatCard({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: string;
  color?: string;
  hint?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-label subtle small">{label}</div>
      <div className="stat-card-value" style={color ? { color } : undefined}>
        {value}
      </div>
      {hint && <div className="stat-card-hint subtle small">{hint}</div>}
    </div>
  );
}
