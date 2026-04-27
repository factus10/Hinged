import type { DB } from '../connection.js';
import type { Series, SeriesWithCount } from '@shared/types.js';
import { randomUUID } from 'node:crypto';

interface Row {
  id: number;
  uuid: string;
  name: string;
  description: string;
  country_id: number | null;
  year_start: number | null;
  year_end: number | null;
  created_at: string;
}

const toSeries = (r: Row): Series => ({
  id: r.id,
  uuid: r.uuid,
  name: r.name,
  description: r.description,
  countryId: r.country_id,
  yearStart: r.year_start,
  yearEnd: r.year_end,
  createdAt: r.created_at,
});

export function listSeries(db: DB): Series[] {
  const rows = db
    .prepare('SELECT * FROM series ORDER BY name COLLATE NOCASE')
    .all() as Row[];
  return rows.map(toSeries);
}

/** List with a per-series stamp count (excludes trashed stamps). */
export function listSeriesWithCounts(db: DB): SeriesWithCount[] {
  const rows = db
    .prepare(
      `SELECT s.*, COALESCE(c.cnt, 0) AS cnt FROM series s
       LEFT JOIN (
         SELECT series_id, COUNT(*) AS cnt FROM stamps
         WHERE deleted_at IS NULL AND series_id IS NOT NULL
         GROUP BY series_id
       ) c ON c.series_id = s.id
       ORDER BY s.name COLLATE NOCASE`,
    )
    .all() as Array<Row & { cnt: number }>;
  return rows.map((r) => ({ ...toSeries(r), stampCount: r.cnt }));
}

export function getSeriesById(db: DB, id: number): Series | null {
  const row = db.prepare('SELECT * FROM series WHERE id = ?').get(id) as Row | undefined;
  return row ? toSeries(row) : null;
}

export function findSeriesByNameCI(db: DB, name: string): Series | null {
  const row = db
    .prepare('SELECT * FROM series WHERE name COLLATE NOCASE = ? COLLATE NOCASE LIMIT 1')
    .get(name) as Row | undefined;
  return row ? toSeries(row) : null;
}

export interface NewSeriesInput {
  name: string;
  description?: string;
  countryId?: number | null;
  yearStart?: number | null;
  yearEnd?: number | null;
  createdAt?: string;
  uuid?: string;
}

export function insertSeries(db: DB, input: NewSeriesInput): Series {
  const uuid = input.uuid ?? randomUUID();
  const createdAt = input.createdAt ?? nowIso();
  const info = db
    .prepare(
      `INSERT INTO series (uuid, name, description, country_id, year_start, year_end, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      uuid,
      input.name,
      input.description ?? '',
      input.countryId ?? null,
      input.yearStart ?? null,
      input.yearEnd ?? null,
      createdAt,
    );
  return {
    id: Number(info.lastInsertRowid),
    uuid,
    name: input.name,
    description: input.description ?? '',
    countryId: input.countryId ?? null,
    yearStart: input.yearStart ?? null,
    yearEnd: input.yearEnd ?? null,
    createdAt,
  };
}

export interface SeriesPatch {
  name?: string;
  description?: string;
  countryId?: number | null;
  yearStart?: number | null;
  yearEnd?: number | null;
}

export function updateSeries(db: DB, id: number, patch: SeriesPatch): void {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.name !== undefined) {
    sets.push('name = ?');
    values.push(patch.name);
  }
  if (patch.description !== undefined) {
    sets.push('description = ?');
    values.push(patch.description);
  }
  if (patch.countryId !== undefined) {
    sets.push('country_id = ?');
    values.push(patch.countryId);
  }
  if (patch.yearStart !== undefined) {
    sets.push('year_start = ?');
    values.push(patch.yearStart);
  }
  if (patch.yearEnd !== undefined) {
    sets.push('year_end = ?');
    values.push(patch.yearEnd);
  }
  if (sets.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE series SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteSeries(db: DB, id: number): void {
  db.prepare('DELETE FROM series WHERE id = ?').run(id);
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}
