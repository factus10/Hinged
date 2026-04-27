// Template generate / parse / apply.
// See shared/template-schema.ts for the format and the rationale.

import { readFileSync, writeFileSync } from 'node:fs';
import {
  hingedTemplateSchema,
  TEMPLATE_KIND,
  TEMPLATE_VERSION,
  type HingedTemplate,
  type TemplateStamp,
} from '@shared/template-schema.js';
import type { DB } from './db/connection.js';
import { transact } from './db/connection.js';
import { getAlbumById, insertAlbum } from './db/repositories/albums.js';
import { getCollectionById, insertCollection } from './db/repositories/collections.js';
import {
  findCountryByNameCI,
  insertCountry,
} from './db/repositories/countries.js';
import {
  insertStamp,
  listStampsForAlbum,
} from './db/repositories/stamps.js';

const APP_USER = 'hinged';

// ---------- Generate ----------

/**
 * Build a template from an album. Strips all personal fields:
 *   - status (gum / centering / collection status)
 *   - acquisition (price / date / source)
 *   - notes
 *   - images
 *   - timestamps
 * Keeps only the descriptive catalog data.
 */
export function generateTemplateForAlbum(
  db: DB,
  albumId: number,
  meta?: { name?: string; description?: string; createdBy?: string },
): HingedTemplate {
  const album = getAlbumById(db, albumId);
  if (!album) throw new Error('Album not found');

  const collection = getCollectionById(db, album.collectionId);
  if (!collection) throw new Error('Album has no parent collection');

  // Optional country description from the collection
  let country: HingedTemplate['country'];
  if (collection.countryId != null) {
    const c = listStampsForAlbum(db, albumId).length > 0 ? null : null;
    void c; // placeholder; the actual lookup is below
    const row = db
      .prepare('SELECT * FROM countries WHERE id = ?')
      .get(collection.countryId) as
      | { id: number; uuid: string; name: string; catalog_prefixes: string }
      | undefined;
    if (row) {
      country = {
        name: row.name,
        catalogPrefixes: row.catalog_prefixes ? JSON.parse(row.catalog_prefixes) : {},
      };
    }
  }

  const stamps = listStampsForAlbum(db, albumId).map((s): TemplateStamp => ({
    catalogNumber: s.catalogNumber,
    yearStart: s.yearStart,
    yearEnd: s.yearEnd,
    denomination: s.denomination,
    color: s.color,
    perforationGauge: s.perforationGauge,
    watermark: s.watermark,
  }));

  return {
    version: TEMPLATE_VERSION,
    kind: TEMPLATE_KIND,
    name: meta?.name ?? album.name,
    description: meta?.description ?? album.description ?? '',
    createdAt: isoNow(),
    createdBy: meta?.createdBy ?? APP_USER,
    catalogSystemRaw: collection.catalogSystemRaw,
    country,
    stamps,
  };
}

export function templateToJson(template: HingedTemplate): string {
  return stringifySorted(template, 2);
}

export function writeTemplateFile(
  db: DB,
  filePath: string,
  albumId: number,
  meta?: { name?: string; description?: string; createdBy?: string },
): { stampsExported: number } {
  const template = generateTemplateForAlbum(db, albumId, meta);
  writeFileSync(filePath, templateToJson(template), 'utf8');
  return { stampsExported: template.stamps.length };
}

// ---------- Parse ----------

export function parseTemplateJson(json: string): HingedTemplate {
  const raw = JSON.parse(json);
  if (!raw || raw.kind !== TEMPLATE_KIND) {
    throw new Error(
      'This file is not a Hinged template. Expected `kind: "hinged-template"`.',
    );
  }
  const parsed = hingedTemplateSchema.parse(raw);
  if (parsed.version > TEMPLATE_VERSION) {
    throw new Error(
      `Template was created by a newer version of Hinged (template version ${parsed.version}). Please update.`,
    );
  }
  return parsed;
}

export function readTemplateFile(filePath: string): HingedTemplate {
  return parseTemplateJson(readFileSync(filePath, 'utf8'));
}

// ---------- Apply ----------

export interface ApplyTemplateOptions {
  /** Existing collection to add the new album under, or null to create one. */
  targetCollectionId: number | null;
  /** Name for the newly-created album. */
  albumName: string;
  /** If targetCollectionId is null, name the new collection this. */
  newCollectionName?: string;
}

export interface ApplyTemplateResult {
  collectionId: number;
  albumId: number;
  countryId: number | null;
  stampsCreated: number;
}

/**
 * Apply a template into the database, creating a new album (and optionally
 * a new collection) populated with the template's stamps. New stamps are
 * marked Wanted and have unspecified gum / centering, ready for the user
 * to flip to Owned as they acquire them.
 */
export function applyTemplate(
  db: DB,
  template: HingedTemplate,
  opts: ApplyTemplateOptions,
): ApplyTemplateResult {
  return transact(db, (tx) => {
    // Resolve or create the country described in the template
    let countryId: number | null = null;
    if (template.country) {
      const existing = findCountryByNameCI(tx, template.country.name);
      if (existing) {
        countryId = existing.id;
      } else {
        const created = insertCountry(tx, {
          name: template.country.name,
          catalogPrefixes: template.country.catalogPrefixes,
        });
        countryId = created.id;
      }
    }

    // Resolve or create the collection
    let collectionId: number;
    if (opts.targetCollectionId != null) {
      const c = getCollectionById(tx, opts.targetCollectionId);
      if (!c) throw new Error('Target collection not found');
      collectionId = c.id;
    } else {
      const newName =
        opts.newCollectionName ??
        deriveCollectionName(template, template.catalogSystemRaw);
      const created = insertCollection(tx, {
        name: newName,
        description: template.description,
        catalogSystemRaw: template.catalogSystemRaw,
        countryId,
      });
      collectionId = created.id;
    }

    // Create the album
    const album = insertAlbum(tx, {
      collectionId,
      name: opts.albumName || template.name,
      description: template.description,
    });

    // Insert all stamps as wanted, with unspecified condition
    let stampsCreated = 0;
    for (const ts of template.stamps) {
      insertStamp(tx, {
        albumId: album.id,
        catalogNumber: ts.catalogNumber,
        yearStart: ts.yearStart ?? null,
        yearEnd: ts.yearEnd ?? null,
        denomination: ts.denomination ?? '',
        color: ts.color ?? '',
        perforationGauge: ts.perforationGauge ?? null,
        watermark: ts.watermark ?? null,
        gumConditionRaw: 'unspecified',
        centeringGradeRaw: 'unspecified',
        collectionStatusRaw: 'wanted',
      });
      stampsCreated += 1;
    }

    return {
      collectionId,
      albumId: album.id,
      countryId,
      stampsCreated,
    };
  });
}

function deriveCollectionName(template: HingedTemplate, catalogSystemRaw: string): string {
  const parts: string[] = [];
  if (template.country?.name) parts.push(template.country.name);
  parts.push(`(${catalogSystemRaw})`);
  return parts.join(' ');
}

// ---------- Helpers ----------

function isoNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

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
