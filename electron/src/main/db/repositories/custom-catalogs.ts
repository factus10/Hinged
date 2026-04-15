// User-defined catalog systems, stored in `custom_catalogs`.

import type { DB } from '../connection.js';
import type { CustomCatalog } from '@shared/types.js';

interface Row {
  id: number;
  key: string;
  name: string;
}

const toCustomCatalog = (r: Row): CustomCatalog => ({
  id: r.id,
  key: r.key,
  name: r.name,
});

export function listCustomCatalogs(db: DB): CustomCatalog[] {
  const rows = db
    .prepare('SELECT * FROM custom_catalogs ORDER BY name COLLATE NOCASE')
    .all() as Row[];
  return rows.map(toCustomCatalog);
}

export function insertCustomCatalog(db: DB, name: string): CustomCatalog {
  const key = `custom:${name}`;
  const info = db
    .prepare('INSERT INTO custom_catalogs (key, name) VALUES (?, ?)')
    .run(key, name);
  return { id: Number(info.lastInsertRowid), key, name };
}

export function updateCustomCatalog(db: DB, id: number, name: string): void {
  const key = `custom:${name}`;
  db.prepare('UPDATE custom_catalogs SET key = ?, name = ? WHERE id = ?').run(key, name, id);
}

export function deleteCustomCatalog(db: DB, id: number): void {
  db.prepare('DELETE FROM custom_catalogs WHERE id = ?').run(id);
}
