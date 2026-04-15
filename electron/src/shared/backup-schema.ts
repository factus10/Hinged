// Zod schema for the .hinged backup file format.
// Must stay compatible with src/Models/BackupRestore.swift (version 1),
// including the legacy `yearOfIssue` field from pre-year-range backups.

import { z } from 'zod';

export const BACKUP_VERSION = 1;

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
});

export type HingedBackup = z.infer<typeof hingedBackupSchema>;
export type CountryBackup = z.infer<typeof countryBackupSchema>;
export type CollectionBackup = z.infer<typeof collectionBackupSchema>;
export type AlbumBackup = z.infer<typeof albumBackupSchema>;
export type StampBackup = z.infer<typeof stampBackupSchema>;
