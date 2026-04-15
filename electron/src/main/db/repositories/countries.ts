import type { DB } from '../connection.js';
import type { Country } from '@shared/types.js';
import { randomUUID } from 'node:crypto';

interface Row {
  id: number;
  uuid: string;
  name: string;
  catalog_prefixes: string;
}

const toCountry = (r: Row): Country => ({
  id: r.id,
  uuid: r.uuid,
  name: r.name,
  catalogPrefixes: r.catalog_prefixes ? JSON.parse(r.catalog_prefixes) : {},
});

export function listCountries(db: DB): Country[] {
  const rows = db.prepare('SELECT * FROM countries ORDER BY name COLLATE NOCASE').all() as Row[];
  return rows.map(toCountry);
}

export function getCountryById(db: DB, id: number): Country | null {
  const row = db.prepare('SELECT * FROM countries WHERE id = ?').get(id) as Row | undefined;
  return row ? toCountry(row) : null;
}

export function findCountryByNameCI(db: DB, name: string): Country | null {
  const row = db
    .prepare('SELECT * FROM countries WHERE name COLLATE NOCASE = ? COLLATE NOCASE')
    .get(name) as Row | undefined;
  return row ? toCountry(row) : null;
}

export function countCountries(db: DB): number {
  const row = db.prepare('SELECT COUNT(*) as c FROM countries').get() as { c: number };
  return row.c;
}

export interface NewCountryInput {
  name: string;
  catalogPrefixes?: Record<string, string>;
  uuid?: string;
}

export function insertCountry(db: DB, input: NewCountryInput): Country {
  const uuid = input.uuid ?? randomUUID();
  const prefixes = JSON.stringify(input.catalogPrefixes ?? {});
  const info = db
    .prepare('INSERT INTO countries (uuid, name, catalog_prefixes) VALUES (?, ?, ?)')
    .run(uuid, input.name, prefixes);
  const id = Number(info.lastInsertRowid);
  return { id, uuid, name: input.name, catalogPrefixes: input.catalogPrefixes ?? {} };
}

export interface CountryPatch {
  name?: string;
  catalogPrefixes?: Record<string, string>;
}

export function updateCountry(db: DB, id: number, patch: CountryPatch): void {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.name !== undefined) {
    sets.push('name = ?');
    values.push(patch.name);
  }
  if (patch.catalogPrefixes !== undefined) {
    sets.push('catalog_prefixes = ?');
    values.push(JSON.stringify(patch.catalogPrefixes));
  }
  if (sets.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE countries SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteCountry(db: DB, id: number): void {
  db.prepare('DELETE FROM countries WHERE id = ?').run(id);
}

export function deleteAllCountries(db: DB): void {
  db.prepare('DELETE FROM countries').run();
}
