import type { DB } from '../connection.js';
import type { Album } from '@shared/types.js';
import { randomUUID } from 'node:crypto';

interface Row {
  id: number;
  uuid: string;
  collection_id: number;
  name: string;
  description: string;
  sort_order: number;
  created_at: string;
}

const toAlbum = (r: Row): Album => ({
  id: r.id,
  uuid: r.uuid,
  collectionId: r.collection_id,
  name: r.name,
  description: r.description,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
});

export function listAlbums(db: DB): Album[] {
  const rows = db
    .prepare('SELECT * FROM albums ORDER BY collection_id, sort_order, name COLLATE NOCASE')
    .all() as Row[];
  return rows.map(toAlbum);
}

export function listAlbumsForCollection(db: DB, collectionId: number): Album[] {
  const rows = db
    .prepare(
      'SELECT * FROM albums WHERE collection_id = ? ORDER BY sort_order, name COLLATE NOCASE',
    )
    .all(collectionId) as Row[];
  return rows.map(toAlbum);
}

export function getAlbumById(db: DB, id: number): Album | null {
  const row = db.prepare('SELECT * FROM albums WHERE id = ?').get(id) as Row | undefined;
  return row ? toAlbum(row) : null;
}

export interface NewAlbumInput {
  collectionId: number;
  name: string;
  description?: string;
  sortOrder?: number;
  createdAt?: string;
  uuid?: string;
}

export function insertAlbum(db: DB, input: NewAlbumInput): Album {
  const uuid = input.uuid ?? randomUUID();
  const createdAt = input.createdAt ?? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const info = db
    .prepare(
      `INSERT INTO albums (uuid, collection_id, name, description, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(uuid, input.collectionId, input.name, input.description ?? '', input.sortOrder ?? 0, createdAt);
  return {
    id: Number(info.lastInsertRowid),
    uuid,
    collectionId: input.collectionId,
    name: input.name,
    description: input.description ?? '',
    sortOrder: input.sortOrder ?? 0,
    createdAt,
  };
}

export interface AlbumPatch {
  name?: string;
  description?: string;
  collectionId?: number;
  sortOrder?: number;
}

export function updateAlbum(db: DB, id: number, patch: AlbumPatch): void {
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
  if (patch.collectionId !== undefined) {
    sets.push('collection_id = ?');
    values.push(patch.collectionId);
  }
  if (patch.sortOrder !== undefined) {
    sets.push('sort_order = ?');
    values.push(patch.sortOrder);
  }
  if (sets.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE albums SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteAlbum(db: DB, id: number): void {
  db.prepare('DELETE FROM albums WHERE id = ?').run(id);
}
