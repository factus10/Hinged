import type { DB } from '../connection.js';
import type { Collection } from '@shared/types.js';
import { randomUUID } from 'node:crypto';

interface Row {
  id: number;
  uuid: string;
  name: string;
  description: string;
  catalog_system_raw: string;
  country_id: number | null;
  sort_order: number;
  created_at: string;
}

const toCollection = (r: Row): Collection => ({
  id: r.id,
  uuid: r.uuid,
  name: r.name,
  description: r.description,
  catalogSystemRaw: r.catalog_system_raw,
  countryId: r.country_id,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
});

export function listCollections(db: DB): Collection[] {
  const rows = db
    .prepare('SELECT * FROM collections ORDER BY sort_order, name COLLATE NOCASE')
    .all() as Row[];
  return rows.map(toCollection);
}

export function getCollectionById(db: DB, id: number): Collection | null {
  const row = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as Row | undefined;
  return row ? toCollection(row) : null;
}

export interface NewCollectionInput {
  name: string;
  description?: string;
  catalogSystemRaw: string;
  countryId?: number | null;
  sortOrder?: number;
  createdAt?: string;
  uuid?: string;
}

export function insertCollection(db: DB, input: NewCollectionInput): Collection {
  const uuid = input.uuid ?? randomUUID();
  const createdAt = input.createdAt ?? nowIso();
  const info = db
    .prepare(
      `INSERT INTO collections
       (uuid, name, description, catalog_system_raw, country_id, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      uuid,
      input.name,
      input.description ?? '',
      input.catalogSystemRaw,
      input.countryId ?? null,
      input.sortOrder ?? 0,
      createdAt,
    );
  return {
    id: Number(info.lastInsertRowid),
    uuid,
    name: input.name,
    description: input.description ?? '',
    catalogSystemRaw: input.catalogSystemRaw,
    countryId: input.countryId ?? null,
    sortOrder: input.sortOrder ?? 0,
    createdAt,
  };
}

export interface CollectionPatch {
  name?: string;
  description?: string;
  catalogSystemRaw?: string;
  countryId?: number | null;
  sortOrder?: number;
}

export function updateCollection(db: DB, id: number, patch: CollectionPatch): void {
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
  if (patch.catalogSystemRaw !== undefined) {
    sets.push('catalog_system_raw = ?');
    values.push(patch.catalogSystemRaw);
  }
  if (patch.countryId !== undefined) {
    sets.push('country_id = ?');
    values.push(patch.countryId);
  }
  if (patch.sortOrder !== undefined) {
    sets.push('sort_order = ?');
    values.push(patch.sortOrder);
  }
  if (sets.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE collections SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteCollection(db: DB, id: number): void {
  db.prepare('DELETE FROM collections WHERE id = ?').run(id);
}

export function deleteAllCollections(db: DB): void {
  db.prepare('DELETE FROM collections').run();
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}
