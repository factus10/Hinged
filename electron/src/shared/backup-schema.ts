// Zod schema for the .hinged backup file format.
// Must stay compatible with src/Models/BackupRestore.swift (version 1),
// including the legacy `yearOfIssue` field from pre-year-range backups.

import { z } from 'zod';

// Bumped to 2 in v0.2.0 — adds a per-stamp `images` array (multi-image
// gallery). v1 backups remain importable; the legacy `imageData` field
// still parses and is treated as the single primary image.
export const BACKUP_VERSION = 2;

const countryBackupSchema = z.object({
  id: z.string(),
  name: z.string(),
  catalogPrefixes: z.record(z.string(), z.string()),
});

const collectionBackupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  catalogSystemRaw: z.string(),
  createdAt: z.string(),
  sortOrder: z.number().int(),
  countryId: z.string().nullable().optional(),
});

const albumBackupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  createdAt: z.string(),
  sortOrder: z.number().int(),
  collectionId: z.string(),
});

const seriesBackupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().default(''),
  countryId: z.string().nullable().optional(),
  yearStart: z.number().int().nullable().optional(),
  yearEnd: z.number().int().nullable().optional(),
  createdAt: z.string(),
});

// Decimal values come across as JSON numbers from the Swift encoder.
// Accept number or string so we can normalize to string internally.
const decimalLike = z
  .union([z.number(), z.string()])
  .nullable()
  .optional()
  .transform((v) => (v == null ? null : typeof v === 'number' ? String(v) : v));

const stampBackupSchema = z
  .object({
    id: z.string(),
    catalogNumber: z.string(),
    yearStart: z.number().int().nullable().optional(),
    yearEnd: z.number().int().nullable().optional(),
    // Legacy field from pre-year-range backups (matches Swift's CodingKeys fallback)
    yearOfIssue: z.number().int().nullable().optional(),
    denomination: z.string(),
    color: z.string(),
    perforationGauge: decimalLike,
    watermark: z.string().nullable().optional(),
    gumConditionRaw: z.string(),
    centeringGradeRaw: z.string(),
    collectionStatusRaw: z.string(),
    notes: z.string(),
    purchasePrice: decimalLike,
    purchaseDate: z.string().nullable().optional(),
    acquisitionSource: z.string(),
    imageData: z.string().nullable().optional(),
    // v2: gallery of additional images. Each entry is base64-encoded
    // raw bytes (no data: prefix), with an optional caption. The first
    // entry corresponds to the primary image and the legacy
    // imageData field — exporter writes both for back-compat.
    images: z
      .array(
        z.object({
          base64: z.string(),
          caption: z.string().nullable().optional(),
          sortOrder: z.number().int(),
        }),
      )
      .optional(),
    quantity: z.number().int().optional(),
    tradeable: z.boolean().optional(),
    seriesId: z.string().nullable().optional(),
    certNumber: z.string().nullable().optional(),
    certIssuer: z.string().nullable().optional(),
    certDate: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    albumId: z.string(),
    countryId: z.string().nullable().optional(),
  })
  .transform((s) => {
    // Collapse yearOfIssue → yearStart (matches Swift's init(from:) migration)
    if (s.yearOfIssue != null && s.yearStart == null) {
      return { ...s, yearStart: s.yearOfIssue, yearEnd: null };
    }
    return s;
  });

export const hingedBackupSchema = z.object({
  version: z.number().int(),
  exportDate: z.string(),
  appVersion: z.string(),
  countries: z.array(countryBackupSchema),
  collections: z.array(collectionBackupSchema),
  albums: z.array(albumBackupSchema),
  stamps: z.array(stampBackupSchema),
  // Series is optional so older backups (which lack it) still parse.
  series: z.array(seriesBackupSchema).optional().default([]),
});

export type HingedBackup = z.infer<typeof hingedBackupSchema>;
export type CountryBackup = z.infer<typeof countryBackupSchema>;
export type CollectionBackup = z.infer<typeof collectionBackupSchema>;
export type AlbumBackup = z.infer<typeof albumBackupSchema>;
export type StampBackup = z.infer<typeof stampBackupSchema>;
export type SeriesBackup = z.infer<typeof seriesBackupSchema>;
