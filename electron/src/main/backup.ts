// Port of src/Models/BackupRestore.swift. Round-trips the .hinged JSON format:
//   - version 1
//   - iso8601 dates without fractional seconds
//   - pretty printed with sorted keys
//   - image data base64-encoded inline
//
// IMPORTANT: keep this compatible in both directions so the native Swift app
// can still read backups produced here.

import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import {
  BACKUP_VERSION,
  hingedBackupSchema,
  type AlbumBackup,
  type CollectionBackup,
  type CountryBackup,
  type HingedBackup,
  type StampBackup,
} from '@shared/backup-schema.js';
import type { ImportMode, ImportResult } from '@shared/types.js';
import { emptyImportResult } from '@shared/types.js';
import type { DB } from './db/connection.js';
import { transact } from './db/connection.js';
import {
  findCountryByNameCI,
  insertCountry,
  listCountries,
  deleteAllCountries,
} from './db/repositories/countries.js';
import {
  insertCollection,
  listCollections,
  deleteAllCollections,
} from './db/repositories/collections.js';
import { insertAlbum, listAlbums } from './db/repositories/albums.js';
import { insertStamp, listStamps, deleteAllStamps } from './db/repositories/stamps.js';
import {
  detectExtension,
  generateFilename,
  loadImageBuffer,
  saveImageBuffer,
} from './images.js';

const APP_VERSION = '0.1.0';

// ---------- Export ----------

export function createBackup(db: DB): HingedBackup {
  const countries = listCountries(db);
  const collections = listCollections(db);
  const albums = listAlbums(db);
  const stamps = listStamps(db);

  // Stable backup-scoped IDs (the Swift exporter mints fresh UUIDs too).
  const countryBackupId = new Map<number, string>();
  const collectionBackupId = new Map<number, string>();
  const albumBackupId = new Map<number, string>();

  const countryBackups: CountryBackup[] = countries.map((c) => {
    const id = randomUUID();
    countryBackupId.set(c.id, id);
    return { id, name: c.name, catalogPrefixes: c.catalogPrefixes };
  });

  const collectionBackups: CollectionBackup[] = collections.map((c) => {
    const id = randomUUID();
    collectionBackupId.set(c.id, id);
    return {
      id,
      name: c.name,
      description: c.description,
      catalogSystemRaw: c.catalogSystemRaw,
      createdAt: c.createdAt,
      sortOrder: c.sortOrder,
      countryId: c.countryId != null ? (countryBackupId.get(c.countryId) ?? null) : null,
    };
  });

  const albumBackups: AlbumBackup[] = [];
  for (const a of albums) {
    const collectionId = collectionBackupId.get(a.collectionId);
    if (!collectionId) continue; // orphan skip, matches Swift
    const id = randomUUID();
    albumBackupId.set(a.id, id);
    albumBackups.push({
      id,
      name: a.name,
      description: a.description,
      createdAt: a.createdAt,
      sortOrder: a.sortOrder,
      collectionId,
    });
  }

  const stampBackups: StampBackup[] = [];
  for (const s of stamps) {
    const albumId = albumBackupId.get(s.albumId);
    if (!albumId) continue;

    let imageData: string | null = null;
    if (s.imageFilename) {
      const buf = loadImageBuffer(s.imageFilename);
      if (buf) imageData = buf.toString('base64');
    }

    stampBackups.push({
      id: randomUUID(),
      catalogNumber: s.catalogNumber,
      yearStart: s.yearStart,
      yearEnd: s.yearEnd,
      // yearOfIssue is a legacy-read-only field; not emitted on write
      denomination: s.denomination,
      color: s.color,
      perforationGauge: s.perforationGauge,
      watermark: s.watermark,
      gumConditionRaw: s.gumConditionRaw,
      centeringGradeRaw: s.centeringGradeRaw,
      collectionStatusRaw: s.collectionStatusRaw,
      notes: s.notes,
      purchasePrice: s.purchasePrice,
      purchaseDate: s.purchaseDate,
      acquisitionSource: s.acquisitionSource,
      imageData,
      quantity: s.quantity,
      tradeable: s.tradeable,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      albumId,
      countryId: s.countryId != null ? (countryBackupId.get(s.countryId) ?? null) : null,
    });
  }

  return {
    version: BACKUP_VERSION,
    exportDate: isoNow(),
    appVersion: APP_VERSION,
    countries: countryBackups,
    collections: collectionBackups,
    albums: albumBackups,
    stamps: stampBackups,
  };
}

/** Serialize to pretty-printed JSON with sorted keys (byte-compatible with Swift). */
export function backupToJson(backup: HingedBackup): string {
  return stringifySorted(serializeForSwift(backup), 2);
}

export function writeBackupFile(db: DB, filePath: string): void {
  const backup = createBackup(db);
  writeFileSync(filePath, backupToJson(backup), 'utf8');
}

// ---------- Import ----------

export function parseBackupJson(json: string): HingedBackup {
  const raw = JSON.parse(json);
  const parsed = hingedBackupSchema.parse(raw);
  if (parsed.version > BACKUP_VERSION) {
    throw new Error(
      `Backup was created by a newer version of Hinged (version ${parsed.version}). Please update.`,
    );
  }
  return parsed;
}

export function readBackupFile(filePath: string): HingedBackup {
  return parseBackupJson(readFileSync(filePath, 'utf8'));
}

export function restoreBackup(db: DB, backup: HingedBackup, mode: ImportMode): ImportResult {
  return transact(db, (tx) => {
    const result = emptyImportResult();

    if (mode === 'replace') {
      // FK cascades will clear albums+stamps, but explicit order keeps intent obvious.
      deleteAllStamps(tx);
      deleteAllCollections(tx);
      deleteAllCountries(tx);
    }

    // Backup-id -> row-id maps
    const countryMap = new Map<string, number>();
    const collectionMap = new Map<string, number>();
    const albumMap = new Map<string, number>();

    // Merge mode: pre-populate countryMap with existing countries matched by
    // case-insensitive name (same rule as BackupManager.restoreBackup).
    const existingNames = new Set<string>();
    if (mode === 'merge') {
      for (const existing of listCountries(tx)) {
        existingNames.add(existing.name.toLowerCase());
        for (const bc of backup.countries) {
          if (bc.name.toLowerCase() === existing.name.toLowerCase()) {
            countryMap.set(bc.id, existing.id);
          }
        }
      }
    }

    // Countries
    for (const bc of backup.countries) {
      if (mode === 'merge' && existingNames.has(bc.name.toLowerCase())) {
        result.countriesSkipped += 1;
        continue;
      }
      const existing = findCountryByNameCI(tx, bc.name);
      if (existing) {
        countryMap.set(bc.id, existing.id);
        result.countriesSkipped += 1;
        continue;
      }
      const country = insertCountry(tx, {
        name: bc.name,
        catalogPrefixes: bc.catalogPrefixes,
      });
      countryMap.set(bc.id, country.id);
      result.countriesImported += 1;
    }

    // Collections
    for (const bc of backup.collections) {
      const countryId = bc.countryId ? (countryMap.get(bc.countryId) ?? null) : null;
      const collection = insertCollection(tx, {
        name: bc.name,
        description: bc.description,
        catalogSystemRaw: bc.catalogSystemRaw,
        countryId,
        sortOrder: bc.sortOrder,
        createdAt: bc.createdAt,
      });
      collectionMap.set(bc.id, collection.id);
      result.collectionsImported += 1;
    }

    // Albums
    for (const ba of backup.albums) {
      const collectionId = collectionMap.get(ba.collectionId);
      if (collectionId == null) {
        result.albumsSkipped += 1;
        continue;
      }
      const album = insertAlbum(tx, {
        collectionId,
        name: ba.name,
        description: ba.description,
        sortOrder: ba.sortOrder,
        createdAt: ba.createdAt,
      });
      albumMap.set(ba.id, album.id);
      result.albumsImported += 1;
    }

    // Stamps
    for (const bs of backup.stamps) {
      const albumId = albumMap.get(bs.albumId);
      if (albumId == null) {
        result.stampsSkipped += 1;
        continue;
      }

      let imageFilename: string | null = null;
      if (bs.imageData) {
        try {
          const buf = Buffer.from(bs.imageData, 'base64');
          const name = generateFilename(detectExtension(buf));
          saveImageBuffer(buf, name);
          imageFilename = name;
        } catch {
          // swallow corrupt image data, keep the stamp
        }
      }

      insertStamp(tx, {
        albumId,
        countryId: bs.countryId ? (countryMap.get(bs.countryId) ?? null) : null,
        catalogNumber: bs.catalogNumber,
        yearStart: bs.yearStart ?? null,
        yearEnd: bs.yearEnd ?? null,
        denomination: bs.denomination,
        color: bs.color,
        perforationGauge: bs.perforationGauge,
        watermark: bs.watermark ?? null,
        gumConditionRaw: bs.gumConditionRaw,
        centeringGradeRaw: bs.centeringGradeRaw,
        collectionStatusRaw: bs.collectionStatusRaw,
        notes: bs.notes,
        purchasePrice: bs.purchasePrice,
        purchaseDate: bs.purchaseDate ?? null,
        acquisitionSource: bs.acquisitionSource,
        imageFilename,
        quantity: bs.quantity ?? 1,
        tradeable: bs.tradeable ?? false,
        createdAt: bs.createdAt,
        updatedAt: bs.updatedAt,
      });
      result.stampsImported += 1;
    }

    return result;
  });
}

// ---------- Helpers ----------

function isoNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Strip fields that should not appear in an emitted v1 backup, and
 * convert decimal strings back to JSON numbers to match Swift's encoding.
 */
function serializeForSwift(backup: HingedBackup): unknown {
  const decimalOrNull = (v: string | number | null | undefined): number | null => {
    if (v == null) return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return {
    version: backup.version,
    exportDate: backup.exportDate,
    appVersion: backup.appVersion,
    countries: backup.countries.map((c) => ({
      id: c.id,
      name: c.name,
      catalogPrefixes: c.catalogPrefixes,
    })),
    collections: backup.collections.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      catalogSystemRaw: c.catalogSystemRaw,
      createdAt: c.createdAt,
      sortOrder: c.sortOrder,
      countryId: c.countryId ?? null,
    })),
    albums: backup.albums.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      createdAt: a.createdAt,
      sortOrder: a.sortOrder,
      collectionId: a.collectionId,
    })),
    stamps: backup.stamps.map((s) => ({
      id: s.id,
      catalogNumber: s.catalogNumber,
      yearStart: s.yearStart ?? null,
      yearEnd: s.yearEnd ?? null,
      denomination: s.denomination,
      color: s.color,
      perforationGauge: decimalOrNull(s.perforationGauge ?? null),
      watermark: s.watermark ?? null,
      gumConditionRaw: s.gumConditionRaw,
      centeringGradeRaw: s.centeringGradeRaw,
      collectionStatusRaw: s.collectionStatusRaw,
      notes: s.notes,
      purchasePrice: decimalOrNull(s.purchasePrice ?? null),
      purchaseDate: s.purchaseDate ?? null,
      acquisitionSource: s.acquisitionSource,
      imageData: s.imageData ?? null,
      quantity: s.quantity ?? 1,
      tradeable: s.tradeable ?? false,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      albumId: s.albumId,
      countryId: s.countryId ?? null,
    })),
  };
}

/** JSON.stringify with alphabetical key ordering at every object level. */
function stringifySorted(value: unknown, indent: number): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object') {
      const entries = Object.entries(v as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, vv]) => [k, sort(vv)] as const);
      return Object.fromEntries(entries);
    }
    return v;
  };
  return JSON.stringify(sort(value), null, indent);
}
