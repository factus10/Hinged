// CSV import/export for stamps. Column format matches
// src/Views/StampListView.swift so .csv files round-trip between apps:
//   Catalog Number, Country, Year, Denomination, Color, Gum Condition,
//   Centering Grade, Status, Quantity, Tradeable, Notes
//
// In addition to the standard column-name-based import, this module exposes
// a generic mapping-based importer (importCsvWithMapping) that accepts an
// arbitrary CSV — even tab-separated text pasted from a spreadsheet — plus
// an explicit map of "source column index → Hinged field". The mapping
// flow lets the user import any CSV layout without first editing the
// header row.

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
  'Quantity',
  'Tradeable',
  'Notes',
];

export type CsvDuplicateAction = 'skip' | 'update' | 'createNew' | 'updateOnly';

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
      String(s.quantity ?? 1),
      s.tradeable ? 'TRUE' : 'FALSE',
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
  const quantityIdx = idx('Quantity', 'quantity');
  const tradeableIdx = idx('Tradeable', 'tradeable');

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

      const rawQuantity = getField(fields, quantityIdx);
      const quantity = rawQuantity ? Math.max(1, Number(rawQuantity) || 1) : 1;
      const tradeable = parseBoolean(getField(fields, tradeableIdx));

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
            quantity,
            tradeable,
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
        quantity,
        tradeable,
      });
      result.imported += 1;
    }

    return result;
  });
}

function parseBoolean(value: string): boolean {
  const up = value.trim().toUpperCase();
  return up === 'TRUE' || up === 'YES' || up === '1' || up === 'T' || up === 'Y';
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

// ---------- Generic mapping-based import ----------

/** All Hinged stamp fields that can be imported from a CSV column. */
export const MAPPABLE_FIELDS = [
  'catalogNumber',
  'country',
  'year',
  'denomination',
  'color',
  'gumCondition',
  'centeringGrade',
  'status',
  'quantity',
  'tradeable',
  'notes',
  'perforationGauge',
  'watermark',
  'purchasePrice',
  'purchaseDate',
  'acquisitionSource',
] as const;

export type MappableField = (typeof MAPPABLE_FIELDS)[number];

export interface CsvFieldMapping {
  /** Map of Hinged field name → source column index, or null to skip. */
  fields: Partial<Record<MappableField, number | null>>;
}

const FIELD_LABELS: Record<MappableField, string> = {
  catalogNumber: 'Catalog Number',
  country: 'Country',
  year: 'Year',
  denomination: 'Denomination',
  color: 'Color',
  gumCondition: 'Gum Condition',
  centeringGrade: 'Centering Grade',
  status: 'Status',
  quantity: 'Quantity',
  tradeable: 'Tradeable',
  notes: 'Notes',
  perforationGauge: 'Perforation',
  watermark: 'Watermark',
  purchasePrice: 'Purchase Price',
  purchaseDate: 'Purchase Date',
  acquisitionSource: 'Source',
};

export function fieldLabel(f: MappableField): string {
  return FIELD_LABELS[f];
}

/**
 * Parse the header row + first few data rows from a CSV string. Used to
 * power the column-mapping UI: the user sees the source columns and a few
 * sample values, then maps each source column to a Hinged field.
 *
 * Auto-detects whether the delimiter is comma or tab (common when pasting
 * from Excel or Numbers). Returns the detected delimiter so subsequent
 * import calls can use the same one.
 */
export interface CsvPreview {
  delimiter: ',' | '\t';
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
  /** Best-guess mapping inferred from the header names. */
  guessedMapping: CsvFieldMapping;
}

export function previewCsv(text: string, sampleSize = 5): CsvPreview {
  const delimiter = detectDelimiter(text);
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return {
      delimiter,
      headers: [],
      sampleRows: [],
      totalRows: 0,
      guessedMapping: { fields: {} },
    };
  }
  const headers = parseLine(lines[0]!, delimiter);
  const sampleRows: string[][] = [];
  for (let i = 1; i < Math.min(lines.length, sampleSize + 1); i += 1) {
    sampleRows.push(parseLine(lines[i]!, delimiter));
  }
  return {
    delimiter,
    headers,
    sampleRows,
    totalRows: lines.length - 1,
    guessedMapping: guessMapping(headers),
  };
}

function detectDelimiter(text: string): ',' | '\t' {
  // Check the first non-empty line. If it has more tabs than commas, treat
  // as TSV. Excel / Numbers paste uses tabs by default.
  const firstLine = text.split(/\r?\n/).find((l) => l.length > 0) ?? '';
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return tabs > commas ? '\t' : ',';
}

function guessMapping(headers: string[]): CsvFieldMapping {
  const fields: Partial<Record<MappableField, number | null>> = {};
  const lower = headers.map((h) => h.toLowerCase().trim());

  const tryAssign = (field: MappableField, ...patterns: (string | RegExp)[]): void => {
    for (const p of patterns) {
      const idx = lower.findIndex((h) => (typeof p === 'string' ? h === p : p.test(h)));
      if (idx >= 0) {
        fields[field] = idx;
        return;
      }
    }
  };

  tryAssign('catalogNumber', 'catalog number', 'catalog #', 'cat #', 'cat. no.', 'sg #', 'scott #', 'scott number', /\bcatalog\b/, /^cat\b/, /\bnumber\b/);
  tryAssign('country', 'country', /\bcountry\b/);
  tryAssign('year', 'year', 'year of issue', /\byear\b/);
  tryAssign('denomination', 'denomination', 'value', 'face value', /\bdenom/);
  tryAssign('color', 'color', 'colour', /\bcolou?r\b/);
  tryAssign('gumCondition', 'gum condition', 'gum', 'condition', /\bgum\b/);
  tryAssign('centeringGrade', 'centering grade', 'centering', 'grade', /\bgrade\b/);
  tryAssign('status', 'status', 'collection status', /\bstatus\b/, /\bowned\b/);
  tryAssign('quantity', 'quantity', 'qty', /\bqty\b/);
  tryAssign('tradeable', 'tradeable', 'tradable', 'for trade', 'for sale');
  tryAssign('notes', 'notes', 'comments', 'remarks', /\bnotes?\b/);
  tryAssign('perforationGauge', 'perforation', 'perforation gauge', 'perf', /\bperf/);
  tryAssign('watermark', 'watermark', 'wmk', /\bwmk\b/);
  tryAssign('purchasePrice', 'price', 'purchase price', 'cost', /\bprice\b/);
  tryAssign('purchaseDate', 'purchase date', 'date', 'date acquired');
  tryAssign('acquisitionSource', 'source', 'dealer', 'acquired from');

  return { fields };
}

function parseLine(line: string, delimiter: ',' | '\t'): string[] {
  if (delimiter === '\t') {
    // TSV — tabs aren't quoted, so simple split is correct
    return line.split('\t').map((f) => f.trim());
  }
  return parseCsvLine(line);
}

/**
 * Import a CSV / TSV string into an album with an explicit column mapping.
 * Used both by the file-picker flow (with a preview + map dialog) and by
 * the paste-from-clipboard flow (which feeds clipboard text directly).
 */
export function importCsvWithMapping(
  db: DB,
  args: {
    albumId: number;
    text: string;
    mapping: CsvFieldMapping;
    delimiter: ',' | '\t';
    duplicateAction: CsvDuplicateAction;
    /** If true, skip the first row (header). */
    hasHeader: boolean;
  },
): CsvImportResult {
  const album = getAlbumById(db, args.albumId);
  if (!album) throw new Error('Album not found');

  const lines = args.text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { imported: 0, updated: 0, skipped: 0 };

  const startIdx = args.hasHeader ? 1 : 0;
  const m = args.mapping.fields;

  const catalogIdx = m.catalogNumber;
  if (catalogIdx == null) {
    throw new Error('Catalog Number column must be mapped');
  }

  const existingStamps = listStampsForAlbum(db, args.albumId);
  const existingByCatalog = new Map<string, Stamp>();
  for (const s of existingStamps) existingByCatalog.set(s.catalogNumber, s);

  return transact(db, (tx) => {
    const result: CsvImportResult = { imported: 0, updated: 0, skipped: 0 };

    for (let i = startIdx; i < lines.length; i += 1) {
      const fields = parseLine(lines[i]!, args.delimiter);
      const get = (idx: number | null | undefined): string => {
        if (idx == null || idx >= fields.length) return '';
        return (fields[idx] ?? '').trim();
      };

      const catalogNumber = get(catalogIdx);
      if (!catalogNumber) continue;

      const yearValue = get(m.year);
      const [yearStart, yearEnd] = parseYearRange(yearValue);

      const denomination = get(m.denomination);
      const color = get(m.color);
      const notes = get(m.notes);
      const countryName = get(m.country);
      const countryRow = countryName ? findCountryByNameCI(tx, countryName) : null;

      const gumRaw = get(m.gumCondition) || 'unspecified';
      const gradeRaw = get(m.centeringGrade) || 'unspecified';
      const statusRaw = parseStatus(get(m.status));

      const rawQty = get(m.quantity);
      const quantity = rawQty ? Math.max(1, Number(rawQty) || 1) : 1;
      const tradeable = parseBoolean(get(m.tradeable));

      const perfRaw = get(m.perforationGauge);
      const perforationGauge = perfRaw ? perfRaw : null;
      const watermark = get(m.watermark) || null;
      const priceRaw = get(m.purchasePrice);
      const purchasePrice = priceRaw ? priceRaw : null;
      const dateRaw = get(m.purchaseDate);
      const purchaseDate = dateRaw ? `${dateRaw}T00:00:00Z` : null;
      const source = get(m.acquisitionSource);

      const existing = existingByCatalog.get(catalogNumber);
      if (existing) {
        if (args.duplicateAction === 'skip') {
          result.skipped += 1;
          continue;
        }
        if (args.duplicateAction === 'update' || args.duplicateAction === 'updateOnly') {
          // Build a partial patch that ONLY includes fields the user mapped.
          // Skipped fields shouldn't overwrite existing data with blanks.
          // (For 'update', we still upsert; for 'updateOnly', we never insert
          // — see below.)
          const patch: Parameters<typeof updateStamp>[2] = {};
          if (m.year != null) {
            patch.yearStart = yearStart;
            patch.yearEnd = yearEnd;
          }
          if (m.denomination != null) patch.denomination = denomination;
          if (m.color != null) patch.color = color;
          if (m.gumCondition != null) patch.gumConditionRaw = gumRaw;
          if (m.centeringGrade != null) patch.centeringGradeRaw = gradeRaw;
          if (m.status != null) patch.collectionStatusRaw = statusRaw;
          if (m.notes != null) patch.notes = notes;
          if (m.country != null) patch.countryId = countryRow?.id ?? null;
          if (m.quantity != null) patch.quantity = quantity;
          if (m.tradeable != null) patch.tradeable = tradeable;
          if (m.perforationGauge != null) patch.perforationGauge = perforationGauge;
          if (m.watermark != null) patch.watermark = watermark;
          if (m.purchasePrice != null) patch.purchasePrice = purchasePrice;
          if (m.purchaseDate != null) patch.purchaseDate = purchaseDate;
          if (m.acquisitionSource != null) patch.acquisitionSource = source;
          updateStamp(tx, existing.id, patch);
          result.updated += 1;
          continue;
        }
      }

      // No matching stamp. updateOnly is "match-or-skip" — never insert.
      if (args.duplicateAction === 'updateOnly') {
        result.skipped += 1;
        continue;
      }

      insertStamp(tx, {
        albumId: args.albumId,
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
        quantity,
        tradeable,
        perforationGauge,
        watermark,
        purchasePrice,
        purchaseDate,
        acquisitionSource: source,
      });
      result.imported += 1;
    }

    return result;
  });
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
