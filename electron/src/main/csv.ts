// CSV import/export for stamps. Column format matches
// src/Views/StampListView.swift so .csv files round-trip between apps:
//   Catalog Number, Country, Year, Denomination, Color, Gum Condition,
//   Centering Grade, Status, Notes

import type { DB } from './db/connection.js';
import { transact } from './db/connection.js';
import { getAlbumById } from './db/repositories/albums.js';
import { findCountryByNameCI, listCountries } from './db/repositories/countries.js';
import { listCollections } from './db/repositories/collections.js';
import { insertStamp, listStampsForAlbum, updateStamp } from './db/repositories/stamps.js';
import type { Stamp } from '@shared/types.js';

const HEADER = [
  'Catalog Number',
  'Country',
  'Year',
  'Denomination',
  'Color',
  'Gum Condition',
  'Centering Grade',
  'Status',
  'Notes',
];

export type CsvDuplicateAction = 'skip' | 'update' | 'createNew';

export interface CsvImportResult {
  imported: number;
  updated: number;
  skipped: number;
}

// ---------- Export ----------

export function generateCsv(db: DB, stamps: Stamp[]): string {
  const countriesById = new Map(listCountries(db).map((c) => [c.id, c]));
  const collectionsById = new Map(listCollections(db).map((c) => [c.id, c]));
  const lines: string[] = [HEADER.join(',')];

  for (const s of stamps) {
    // collectionCountry: per Swift, prefer stamp.country, else collection.country
    let countryName = '';
    if (s.countryId != null) {
      countryName = countriesById.get(s.countryId)?.name ?? '';
    }
    if (!countryName) {
      // Look up album → collection to find inherited country
      // The album is not available here; fall back to empty.
    }
    const year =
      s.yearStart == null
        ? ''
        : s.yearEnd != null && s.yearEnd !== s.yearStart
          ? `${s.yearStart}-${s.yearEnd}`
          : String(s.yearStart);

    const fields = [
      escapeCsv(s.catalogNumber),
      escapeCsv(countryName),
      year,
      escapeCsv(s.denomination),
      escapeCsv(s.color),
      s.gumConditionRaw,
      s.centeringGradeRaw,
      s.collectionStatusRaw,
      escapeCsv(s.notes),
    ];
    lines.push(fields.join(','));
  }
  void collectionsById; // reserved for future use
  return lines.join('\n');
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ---------- Import ----------

export function importCsvIntoAlbum(
  db: DB,
  albumId: number,
  csv: string,
  duplicateAction: CsvDuplicateAction,
): CsvImportResult {
  const album = getAlbumById(db, albumId);
  if (!album) throw new Error('Album not found');

  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) {
    return { imported: 0, updated: 0, skipped: 0 };
  }

  const header = parseCsvLine(lines[0]!);
  const idx = (...names: string[]): number | null => {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i >= 0) return i;
    }
    return null;
  };

  const catalogIdx = idx('Catalog Number', 'catalogNumber');
  if (catalogIdx == null) throw new Error('No "Catalog Number" column found in CSV');

  const yearIdx = idx('Year', 'yearOfIssue');
  const denomIdx = idx('Denomination', 'denomination');
  const colorIdx = idx('Color', 'color');
  const countryIdx = idx('Country', 'country');
  const statusIdx = idx('Status', 'collectionStatus');
  const gumIdx = idx('Gum Condition', 'gumCondition');
  const gradeIdx = idx('Centering Grade', 'centeringGrade');
  const notesIdx = idx('Notes', 'notes');

  const existingStamps = listStampsForAlbum(db, albumId);
  const existingByCatalog = new Map<string, Stamp>();
  for (const s of existingStamps) existingByCatalog.set(s.catalogNumber, s);

  return transact(db, (tx) => {
    const result: CsvImportResult = { imported: 0, updated: 0, skipped: 0 };

    for (let i = 1; i < lines.length; i += 1) {
      const fields = parseCsvLine(lines[i]!);
      const catalogNumber = (fields[catalogIdx] ?? '').trim();
      if (!catalogNumber) continue;

      const yearValue = getField(fields, yearIdx);
      const [yearStart, yearEnd] = parseYearRange(yearValue);

      const denomination = getField(fields, denomIdx);
      const color = getField(fields, colorIdx);
      const notes = getField(fields, notesIdx);
      const countryName = getField(fields, countryIdx);
      const countryRow = countryName ? findCountryByNameCI(tx, countryName) : null;

      const gumRaw = getField(fields, gumIdx) || 'unspecified';
      const gradeRaw = getField(fields, gradeIdx) || 'unspecified';

      const statusRaw = parseStatus(getField(fields, statusIdx));

      const existing = existingByCatalog.get(catalogNumber);
      if (existing) {
        if (duplicateAction === 'skip') {
          result.skipped += 1;
          continue;
        }
        if (duplicateAction === 'update') {
          updateStamp(tx, existing.id, {
            yearStart,
            yearEnd,
            denomination,
            color,
            gumConditionRaw: gumRaw,
            centeringGradeRaw: gradeRaw,
            collectionStatusRaw: statusRaw,
            notes,
            countryId: countryRow?.id ?? null,
          });
          result.updated += 1;
          continue;
        }
      }

      insertStamp(tx, {
        albumId,
        countryId: countryRow?.id ?? null,
        catalogNumber,
        yearStart,
        yearEnd,
        denomination,
        color,
        gumConditionRaw: gumRaw,
        centeringGradeRaw: gradeRaw,
        collectionStatusRaw: statusRaw,
        notes,
      });
      result.imported += 1;
    }

    return result;
  });
}

function getField(fields: string[], i: number | null): string {
  if (i == null || i >= fields.length) return '';
  return (fields[i] ?? '').trim();
}

function parseYearRange(value: string): [number | null, number | null] {
  const trimmed = value.trim();
  if (!trimmed) return [null, null];
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-').map((p) => p.trim());
    if (parts.length === 2) {
      const a = Number(parts[0]);
      const b = Number(parts[1]);
      if (Number.isFinite(a) && Number.isFinite(b)) return [a, b];
      if (Number.isFinite(a)) return [a, null];
    }
  }
  const n = Number(trimmed);
  return Number.isFinite(n) ? [n, null] : [null, null];
}

function parseStatus(value: string): string {
  const up = value.trim().toUpperCase();
  switch (up) {
    case 'TRUE':
    case 'YES':
    case '1':
    case 'OWNED':
      return 'owned';
    case 'FALSE':
    case 'NO':
    case '0':
    case 'WANTED':
      return 'wanted';
    case 'NOTCOLLECTING':
    case 'SKIP':
      return 'notCollecting';
    default: {
      // Accept canonical raw values too
      if (value === 'owned' || value === 'wanted' || value === 'notCollecting') return value;
      return 'wanted';
    }
  }
}

export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}
