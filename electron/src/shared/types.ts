// Domain types used across main + renderer. All dates are ISO-8601 strings
// (no fractional seconds) for Swift interop. All decimal fields are strings
// for precision.

export interface Country {
  id: number;
  uuid: string;
  name: string;
  catalogPrefixes: Record<string, string>;
}

export interface Collection {
  id: number;
  uuid: string;
  name: string;
  description: string;
  catalogSystemRaw: string;
  countryId: number | null;
  sortOrder: number;
  createdAt: string;
}

export interface Album {
  id: number;
  uuid: string;
  collectionId: number;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: string;
}

export interface Stamp {
  id: number;
  uuid: string;
  albumId: number;
  countryId: number | null;
  catalogNumber: string;
  yearStart: number | null;
  yearEnd: number | null;
  denomination: string;
  color: string;
  perforationGauge: string | null;
  watermark: string | null;
  gumConditionRaw: string;
  centeringGradeRaw: string;
  collectionStatusRaw: string;
  notes: string;
  purchasePrice: string | null;
  purchaseDate: string | null;
  acquisitionSource: string;
  imageFilename: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ---------- Create/update payloads ----------

export interface NewCountryPayload {
  name: string;
  catalogPrefixes?: Record<string, string>;
}

export interface CountryPatchPayload {
  name?: string;
  catalogPrefixes?: Record<string, string>;
}

export interface NewCollectionPayload {
  name: string;
  description?: string;
  catalogSystemRaw: string;
  countryId?: number | null;
  sortOrder?: number;
}

export interface CollectionPatchPayload {
  name?: string;
  description?: string;
  catalogSystemRaw?: string;
  countryId?: number | null;
  sortOrder?: number;
}

export interface NewAlbumPayload {
  collectionId: number;
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface AlbumPatchPayload {
  name?: string;
  description?: string;
  collectionId?: number;
  sortOrder?: number;
}

export interface NewStampPayload {
  albumId: number;
  countryId?: number | null;
  catalogNumber: string;
  yearStart?: number | null;
  yearEnd?: number | null;
  denomination?: string;
  color?: string;
  perforationGauge?: string | null;
  watermark?: string | null;
  gumConditionRaw?: string;
  centeringGradeRaw?: string;
  collectionStatusRaw?: string;
  notes?: string;
  purchasePrice?: string | null;
  purchaseDate?: string | null;
  acquisitionSource?: string;
}

export interface StampPatchPayload {
  albumId?: number;
  countryId?: number | null;
  catalogNumber?: string;
  yearStart?: number | null;
  yearEnd?: number | null;
  denomination?: string;
  color?: string;
  perforationGauge?: string | null;
  watermark?: string | null;
  gumConditionRaw?: string;
  centeringGradeRaw?: string;
  collectionStatusRaw?: string;
  notes?: string;
  purchasePrice?: string | null;
  purchaseDate?: string | null;
  acquisitionSource?: string;
  imageFilename?: string | null;
}

// ---------- Settings & custom catalogs ----------

export interface AppSettings {
  defaultCatalogSystemRaw: string; // "builtin:scott" or "custom:Name"
  defaultCollectionStatusRaw: string;
  defaultGumConditionRaw: string; // empty string = no default
  defaultCenteringGradeRaw: string;
  currencySymbol: string;
  autoBackupDir: string; // empty string = disabled
  autoBackupKeep: string; // stored as string in key/value store; parsed as int
}

export interface CustomCatalog {
  id: number;
  key: string; // "custom:Name"
  name: string;
}

// ---------- Templates ----------

export interface TemplatePreview {
  path: string;
  name: string;
  description: string;
  catalogSystemRaw: string;
  countryName: string | null;
  stampCount: number;
  createdBy: string | null;
  createdAt: string;
}

// ---------- CSV ----------

export type CsvDuplicateAction = 'skip' | 'update' | 'createNew';

export interface CsvImportResult {
  imported: number;
  updated: number;
  skipped: number;
}

// ---------- Backup ----------

export type ImportMode = 'replace' | 'merge';

export interface ImportResult {
  countriesImported: number;
  countriesSkipped: number;
  collectionsImported: number;
  collectionsSkipped: number;
  albumsImported: number;
  albumsSkipped: number;
  stampsImported: number;
  stampsSkipped: number;
}

export const emptyImportResult = (): ImportResult => ({
  countriesImported: 0,
  countriesSkipped: 0,
  collectionsImported: 0,
  collectionsSkipped: 0,
  albumsImported: 0,
  albumsSkipped: 0,
  stampsImported: 0,
  stampsSkipped: 0,
});
