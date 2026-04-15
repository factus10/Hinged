import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';

import { initImagesDir } from './images.js';
import { parseBackupJson, backupToJson, createBackup, restoreBackup } from './backup.js';
import { insertCountry } from './db/repositories/countries.js';
import { insertCollection } from './db/repositories/collections.js';
import { insertAlbum } from './db/repositories/albums.js';
import { insertStamp } from './db/repositories/stamps.js';

// We deliberately don't use openDatabase() here since it reads schema.sql from
// disk via import.meta.url, which requires a more complex test setup. Inline
// the schema for tests instead.
const SCHEMA_SQL = readFileSync(join(__dirname, 'db', 'schema.sql'), 'utf8');

function makeTempDb(): { db: Database.Database; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), 'hinged-test-'));
  initImagesDir(join(dir, 'Images'));
  const db = new Database(join(dir, 'test.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);
  return { db, dir };
}

describe('backup', () => {
  let db: Database.Database;
  let dir: string;

  beforeEach(() => {
    ({ db, dir } = makeTempDb());
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('round-trips countries, collections, albums, and stamps', () => {
    const usa = insertCountry(db, {
      name: 'United States',
      catalogPrefixes: { scott: 'US', michel: 'USA' },
    });
    const col = insertCollection(db, {
      name: 'US Classics',
      catalogSystemRaw: 'scott',
      countryId: usa.id,
      sortOrder: 0,
      description: 'Pre-1900 US issues',
    });
    const album = insertAlbum(db, { collectionId: col.id, name: '1847-1860' });
    insertStamp(db, {
      albumId: album.id,
      catalogNumber: '1',
      yearStart: 1847,
      denomination: '5c',
      color: 'red brown',
      perforationGauge: '12.5',
      gumConditionRaw: 'used',
      centeringGradeRaw: 'fine',
      collectionStatusRaw: 'owned',
      purchasePrice: '2500.00',
    });

    const backup = createBackup(db);
    const json = backupToJson(backup);

    // Deterministic emission: pretty-printed with sorted keys
    expect(json.startsWith('{')).toBe(true);
    expect(json).toContain('"version": 1');

    // Re-parse is lossless
    const parsed = parseBackupJson(json);
    expect(parsed.countries).toHaveLength(1);
    expect(parsed.collections).toHaveLength(1);
    expect(parsed.albums).toHaveLength(1);
    expect(parsed.stamps).toHaveLength(1);

    // Restore into a fresh DB and verify the data is intact
    const fresh = makeTempDb();
    try {
      const result = restoreBackup(fresh.db, parsed, 'replace');
      expect(result.countriesImported).toBe(1);
      expect(result.collectionsImported).toBe(1);
      expect(result.albumsImported).toBe(1);
      expect(result.stampsImported).toBe(1);

      const rows = fresh.db.prepare('SELECT catalog_number, year_start, purchase_price FROM stamps').all() as Array<{
        catalog_number: string;
        year_start: number | null;
        purchase_price: string | null;
      }>;
      expect(rows).toHaveLength(1);
      expect(rows[0]!.catalog_number).toBe('1');
      expect(rows[0]!.year_start).toBe(1847);
      // Note: export converts decimal string → JSON number → string on re-import.
      // Value is preserved numerically even if trailing zeros differ.
      expect(Number(rows[0]!.purchase_price)).toBe(2500);
    } finally {
      fresh.db.close();
      rmSync(fresh.dir, { recursive: true, force: true });
    }
  });

  it('accepts legacy yearOfIssue field from old Swift backups', () => {
    const legacyJson = JSON.stringify({
      version: 1,
      exportDate: '2024-01-01T00:00:00Z',
      appVersion: '1.0.0',
      countries: [],
      collections: [
        {
          id: 'c1',
          name: 'Legacy',
          description: '',
          catalogSystemRaw: 'scott',
          createdAt: '2024-01-01T00:00:00Z',
          sortOrder: 0,
          countryId: null,
        },
      ],
      albums: [
        {
          id: 'a1',
          name: 'Main',
          description: '',
          createdAt: '2024-01-01T00:00:00Z',
          sortOrder: 0,
          collectionId: 'c1',
        },
      ],
      stamps: [
        {
          id: 's1',
          catalogNumber: '42',
          yearOfIssue: 1950, // legacy field, not yearStart
          denomination: '3c',
          color: 'blue',
          gumConditionRaw: 'mintNeverHinged',
          centeringGradeRaw: 'veryFine',
          collectionStatusRaw: 'owned',
          notes: '',
          acquisitionSource: '',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          albumId: 'a1',
        },
      ],
    });

    const parsed = parseBackupJson(legacyJson);
    expect(parsed.stamps[0]!.yearStart).toBe(1950);
    expect(parsed.stamps[0]!.yearEnd).toBeNull();

    const result = restoreBackup(db, parsed, 'replace');
    expect(result.stampsImported).toBe(1);

    const row = db.prepare('SELECT year_start FROM stamps').get() as { year_start: number };
    expect(row.year_start).toBe(1950);
  });

  it('merge mode dedupes countries by case-insensitive name', () => {
    insertCountry(db, { name: 'Germany', catalogPrefixes: { scott: 'GER' } });

    const backup = parseBackupJson(
      JSON.stringify({
        version: 1,
        exportDate: '2024-01-01T00:00:00Z',
        appVersion: '1.0.0',
        countries: [
          { id: 'g', name: 'germany', catalogPrefixes: { scott: 'DE' } }, // different case
          { id: 'f', name: 'France', catalogPrefixes: {} },
        ],
        collections: [],
        albums: [],
        stamps: [],
      }),
    );

    const result = restoreBackup(db, backup, 'merge');
    expect(result.countriesImported).toBe(1); // France
    expect(result.countriesSkipped).toBe(1); // Germany skipped
    const count = db.prepare('SELECT COUNT(*) as c FROM countries').get() as { c: number };
    expect(count.c).toBe(2);
  });
});
