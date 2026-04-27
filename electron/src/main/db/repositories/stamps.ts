import type { DB } from '../connection.js';
import type { Stamp } from '@shared/types.js';
import { randomUUID } from 'node:crypto';

interface Row {
  id: number;
  uuid: string;
  album_id: number;
  country_id: number | null;
  catalog_number: string;
  year_start: number | null;
  year_end: number | null;
  denomination: string;
  color: string;
  perforation_gauge: string | null;
  watermark: string | null;
  gum_condition_raw: string;
  centering_grade_raw: string;
  collection_status_raw: string;
  notes: string;
  purchase_price: string | null;
  purchase_date: string | null;
  acquisition_source: string;
  image_filename: string | null;
  quantity: number;
  tradeable: number;
  series_id: number | null;
  cert_number: string | null;
  cert_issuer: string | null;
  cert_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const toStamp = (r: Row): Stamp => ({
  id: r.id,
  uuid: r.uuid,
  albumId: r.album_id,
  countryId: r.country_id,
  catalogNumber: r.catalog_number,
  yearStart: r.year_start,
  yearEnd: r.year_end,
  denomination: r.denomination,
  color: r.color,
  perforationGauge: r.perforation_gauge,
  watermark: r.watermark,
  gumConditionRaw: r.gum_condition_raw,
  centeringGradeRaw: r.centering_grade_raw,
  collectionStatusRaw: r.collection_status_raw,
  notes: r.notes,
  purchasePrice: r.purchase_price,
  purchaseDate: r.purchase_date,
  acquisitionSource: r.acquisition_source,
  imageFilename: r.image_filename,
  quantity: r.quantity,
  tradeable: r.tradeable === 1,
  seriesId: r.series_id,
  certNumber: r.cert_number,
  certIssuer: r.cert_issuer,
  certDate: r.cert_date,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
});

export function listStamps(db: DB): Stamp[] {
  const rows = db
    .prepare('SELECT * FROM stamps WHERE deleted_at IS NULL ORDER BY catalog_number')
    .all() as Row[];
  return rows.map(toStamp);
}

export function listTrashedStamps(db: DB): Stamp[] {
  const rows = db
    .prepare('SELECT * FROM stamps WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC')
    .all() as Row[];
  return rows.map(toStamp);
}

export function getStampById(db: DB, id: number): Stamp | null {
  const row = db.prepare('SELECT * FROM stamps WHERE id = ?').get(id) as Row | undefined;
  return row ? toStamp(row) : null;
}

export function listStampsForAlbum(db: DB, albumId: number): Stamp[] {
  const rows = db
    .prepare(
      'SELECT * FROM stamps WHERE album_id = ? AND deleted_at IS NULL ORDER BY catalog_number',
    )
    .all(albumId) as Row[];
  return rows.map(toStamp);
}

export function countStamps(db: DB): number {
  const row = db
    .prepare('SELECT COUNT(*) as c FROM stamps WHERE deleted_at IS NULL')
    .get() as { c: number };
  return row.c;
}

export interface NewStampInput {
  albumId: number;
  countryId?: number | null;
  seriesId?: number | null;
  catalogNumber: string;
  yearStart?: number | null;
  yearEnd?: number | null;
  denomination?: string;
  color?: string;
  perforationGauge?: string | null;
  watermark?: string | null;
  gumConditionRaw: string;
  centeringGradeRaw: string;
  collectionStatusRaw: string;
  notes?: string;
  purchasePrice?: string | null;
  purchaseDate?: string | null;
  acquisitionSource?: string;
  imageFilename?: string | null;
  quantity?: number;
  tradeable?: boolean;
  certNumber?: string | null;
  certIssuer?: string | null;
  certDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  uuid?: string;
}

export function insertStamp(db: DB, input: NewStampInput): Stamp {
  const uuid = input.uuid ?? randomUUID();
  const now = nowIso();
  const createdAt = input.createdAt ?? now;
  const updatedAt = input.updatedAt ?? now;
  const quantity = input.quantity ?? 1;
  const tradeable = input.tradeable ? 1 : 0;
  const info = db
    .prepare(
      `INSERT INTO stamps (
        uuid, album_id, country_id, catalog_number, year_start, year_end,
        denomination, color, perforation_gauge, watermark,
        gum_condition_raw, centering_grade_raw, collection_status_raw,
        notes, purchase_price, purchase_date, acquisition_source,
        image_filename, quantity, tradeable, series_id,
        cert_number, cert_issuer, cert_date,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      uuid,
      input.albumId,
      input.countryId ?? null,
      input.catalogNumber,
      input.yearStart ?? null,
      input.yearEnd ?? null,
      input.denomination ?? '',
      input.color ?? '',
      input.perforationGauge ?? null,
      input.watermark ?? null,
      input.gumConditionRaw,
      input.centeringGradeRaw,
      input.collectionStatusRaw,
      input.notes ?? '',
      input.purchasePrice ?? null,
      input.purchaseDate ?? null,
      input.acquisitionSource ?? '',
      input.imageFilename ?? null,
      quantity,
      tradeable,
      input.seriesId ?? null,
      input.certNumber ?? null,
      input.certIssuer ?? null,
      input.certDate ?? null,
      createdAt,
      updatedAt,
    );
  return {
    id: Number(info.lastInsertRowid),
    uuid,
    albumId: input.albumId,
    countryId: input.countryId ?? null,
    catalogNumber: input.catalogNumber,
    yearStart: input.yearStart ?? null,
    yearEnd: input.yearEnd ?? null,
    denomination: input.denomination ?? '',
    color: input.color ?? '',
    perforationGauge: input.perforationGauge ?? null,
    watermark: input.watermark ?? null,
    gumConditionRaw: input.gumConditionRaw,
    centeringGradeRaw: input.centeringGradeRaw,
    collectionStatusRaw: input.collectionStatusRaw,
    notes: input.notes ?? '',
    purchasePrice: input.purchasePrice ?? null,
    purchaseDate: input.purchaseDate ?? null,
    acquisitionSource: input.acquisitionSource ?? '',
    imageFilename: input.imageFilename ?? null,
    quantity,
    tradeable: tradeable === 1,
    seriesId: input.seriesId ?? null,
    certNumber: input.certNumber ?? null,
    certIssuer: input.certIssuer ?? null,
    certDate: input.certDate ?? null,
    createdAt,
    updatedAt,
    deletedAt: null,
  };
}

export interface StampPatch {
  albumId?: number;
  countryId?: number | null;
  seriesId?: number | null;
  catalogNumber?: string;
  yearStart?: number | null;
  yearEnd?: number | null;
  denomination?: string;
  color?: string;
  perforationGauge?: string | null;
  watermark?: string | null;
  gumConditionRaw?: string;
  centeringGradeRaw?: string;
  collectionStatusRaw?: string;
  notes?: string;
  purchasePrice?: string | null;
  purchaseDate?: string | null;
  acquisitionSource?: string;
  imageFilename?: string | null;
  quantity?: number;
  tradeable?: boolean;
  certNumber?: string | null;
  certIssuer?: string | null;
  certDate?: string | null;
}

const PATCH_COLUMNS: Record<keyof StampPatch, string> = {
  albumId: 'album_id',
  countryId: 'country_id',
  seriesId: 'series_id',
  catalogNumber: 'catalog_number',
  yearStart: 'year_start',
  yearEnd: 'year_end',
  denomination: 'denomination',
  color: 'color',
  perforationGauge: 'perforation_gauge',
  watermark: 'watermark',
  gumConditionRaw: 'gum_condition_raw',
  centeringGradeRaw: 'centering_grade_raw',
  collectionStatusRaw: 'collection_status_raw',
  notes: 'notes',
  purchasePrice: 'purchase_price',
  purchaseDate: 'purchase_date',
  acquisitionSource: 'acquisition_source',
  imageFilename: 'image_filename',
  quantity: 'quantity',
  tradeable: 'tradeable',
  certNumber: 'cert_number',
  certIssuer: 'cert_issuer',
  certDate: 'cert_date',
};

function buildPatchSql(patch: StampPatch): { sets: string[]; values: unknown[] } | null {
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of Object.keys(patch) as Array<keyof StampPatch>) {
    const col = PATCH_COLUMNS[key];
    if (!col) continue;
    sets.push(`${col} = ?`);
    let v: unknown = patch[key];
    // Booleans → INTEGER 0/1 for SQLite
    if (key === 'tradeable') v = v ? 1 : 0;
    values.push(v);
  }
  if (sets.length === 0) return null;
  sets.push('updated_at = ?');
  values.push(nowIso());
  return { sets, values };
}

export function updateStamp(db: DB, id: number, patch: StampPatch): void {
  const built = buildPatchSql(patch);
  if (!built) return;
  db.prepare(`UPDATE stamps SET ${built.sets.join(', ')} WHERE id = ?`).run(...built.values, id);
}

export function bulkUpdateStamps(db: DB, ids: number[], patch: StampPatch): void {
  if (ids.length === 0) return;
  const built = buildPatchSql(patch);
  if (!built) return;
  const stmt = db.prepare(`UPDATE stamps SET ${built.sets.join(', ')} WHERE id = ?`);
  const tx = db.transaction((idList: number[]) => {
    for (const id of idList) stmt.run(...built.values, id);
  });
  tx(ids);
}

// ---- Trash operations ----

export function softDeleteStamp(db: DB, id: number): void {
  db.prepare('UPDATE stamps SET deleted_at = ? WHERE id = ?').run(nowIso(), id);
}

export function softDeleteStamps(db: DB, ids: number[]): void {
  if (ids.length === 0) return;
  const now = nowIso();
  const stmt = db.prepare('UPDATE stamps SET deleted_at = ? WHERE id = ?');
  const tx = db.transaction((idList: number[]) => {
    for (const id of idList) stmt.run(now, id);
  });
  tx(ids);
}

export function restoreStamps(db: DB, ids: number[]): void {
  if (ids.length === 0) return;
  const stmt = db.prepare('UPDATE stamps SET deleted_at = NULL WHERE id = ?');
  const tx = db.transaction((idList: number[]) => {
    for (const id of idList) stmt.run(id);
  });
  tx(ids);
}

export function emptyTrash(db: DB): number {
  const info = db
    .prepare('DELETE FROM stamps WHERE deleted_at IS NOT NULL')
    .run();
  return Number(info.changes);
}

/** Hard-delete used only by backup restore in 'replace' mode. */
export function deleteAllStamps(db: DB): void {
  db.prepare('DELETE FROM stamps').run();
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}
