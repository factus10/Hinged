import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';

import { initImagesDir } from './images.js';
import {
  applyTemplate,
  generateTemplateForAlbum,
  parseTemplateJson,
  templateToJson,
} from './template.js';
import { insertCountry } from './db/repositories/countries.js';
import { insertCollection } from './db/repositories/collections.js';
import { insertAlbum } from './db/repositories/albums.js';
import { insertStamp, listStampsForAlbum } from './db/repositories/stamps.js';

const SCHEMA_SQL = readFileSync(join(__dirname, 'db', 'schema.sql'), 'utf8');

function makeTempDb(): { db: Database.Database; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), 'hinged-template-test-'));
  initImagesDir(join(dir, 'Images'));
  const db = new Database(join(dir, 'test.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);
  return { db, dir };
}

describe('templates', () => {
  let db: Database.Database;
  let dir: string;

  beforeEach(() => {
    ({ db, dir } = makeTempDb());
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('generates a template, parses it back, applies cleanly', () => {
    const usa = insertCountry(db, {
      name: 'United States',
      catalogPrefixes: { scott: 'US', michel: 'USA' },
    });
    const col = insertCollection(db, {
      name: 'US Classics',
      catalogSystemRaw: 'scott',
      countryId: usa.id,
    });
    const album = insertAlbum(db, { collectionId: col.id, name: '1847-1860' });

    insertStamp(db, {
      albumId: album.id,
      catalogNumber: '1',
      yearStart: 1847,
      denomination: '5c',
      color: 'red brown',
      gumConditionRaw: 'used',
      centeringGradeRaw: 'fine',
      collectionStatusRaw: 'owned',
      purchasePrice: '2500.00',
      notes: 'private detail I do NOT want shared',
    });
    insertStamp(db, {
      albumId: album.id,
      catalogNumber: '2',
      yearStart: 1847,
      denomination: '10c',
      color: 'black',
      gumConditionRaw: 'unspecified',
      centeringGradeRaw: 'unspecified',
      collectionStatusRaw: 'wanted',
    });

    // Generate a template
    const template = generateTemplateForAlbum(db, album.id);
    expect(template.kind).toBe('hinged-template');
    expect(template.stamps).toHaveLength(2);
    expect(template.country?.name).toBe('United States');
    expect(template.catalogSystemRaw).toBe('scott');

    // Personal data must NOT be in the template
    const json = templateToJson(template);
    expect(json).not.toContain('private detail');
    expect(json).not.toContain('purchasePrice');
    expect(json).not.toContain('collectionStatusRaw');
    expect(json).not.toContain('gumConditionRaw');

    // Round-trip parse
    const parsed = parseTemplateJson(json);
    expect(parsed.stamps[0]!.catalogNumber).toBe('1');
    expect(parsed.stamps[0]!.yearStart).toBe(1847);

    // Apply into a fresh DB; new collection should be auto-created
    const fresh = makeTempDb();
    try {
      const result = applyTemplate(fresh.db, parsed, {
        targetCollectionId: null,
        albumName: 'Imported',
      });
      expect(result.stampsCreated).toBe(2);

      const stamps = listStampsForAlbum(fresh.db, result.albumId);
      expect(stamps).toHaveLength(2);
      // All applied stamps should be Wanted with unspecified condition
      for (const s of stamps) {
        expect(s.collectionStatusRaw).toBe('wanted');
        expect(s.gumConditionRaw).toBe('unspecified');
        expect(s.centeringGradeRaw).toBe('unspecified');
        expect(s.purchasePrice).toBeNull();
        expect(s.notes).toBe('');
      }
      // Country was created from the template
      const country = fresh.db
        .prepare('SELECT * FROM countries WHERE id = ?')
        .get(result.countryId!) as { name: string } | undefined;
      expect(country?.name).toBe('United States');
    } finally {
      fresh.db.close();
      rmSync(fresh.dir, { recursive: true, force: true });
    }
  });

  it('refuses to parse files that are not Hinged templates', () => {
    expect(() => parseTemplateJson('{"foo":"bar"}')).toThrow(/not a Hinged template/);
    expect(() => parseTemplateJson('{"kind":"hinged-backup"}')).toThrow(
      /not a Hinged template/,
    );
  });

  it('matches existing country by case-insensitive name on apply', () => {
    insertCountry(db, {
      name: 'United States',
      catalogPrefixes: { scott: 'US-EXISTING' },
    });

    const template = parseTemplateJson(
      JSON.stringify({
        version: 1,
        kind: 'hinged-template',
        name: 'Test',
        createdAt: '2026-04-27T00:00:00Z',
        catalogSystemRaw: 'scott',
        country: {
          name: 'united states',
          catalogPrefixes: { scott: 'US-FROM-TEMPLATE' },
        },
        stamps: [
          { catalogNumber: '1', yearStart: 1847, denomination: '5c', color: 'rb' },
        ],
      }),
    );

    const result = applyTemplate(db, template, {
      targetCollectionId: null,
      albumName: 'A',
    });

    // Existing country reused — its prefixes should NOT be overwritten
    const country = db
      .prepare('SELECT * FROM countries WHERE id = ?')
      .get(result.countryId!) as { catalog_prefixes: string };
    expect(JSON.parse(country.catalog_prefixes).scott).toBe('US-EXISTING');
  });
});
