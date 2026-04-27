-- Hinged SQLite schema. Mirrors the SwiftData model in src/Models/.
-- Dates are ISO-8601 strings (no fractional seconds) for Swift compatibility.
-- Decimals stored as TEXT to preserve precision on prices and perforation gauges.

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS schema_version (
  version    INTEGER NOT NULL,
  applied_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS countries (
  id               INTEGER PRIMARY KEY,
  uuid             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  catalog_prefixes TEXT NOT NULL DEFAULT '{}'
);
CREATE UNIQUE INDEX IF NOT EXISTS countries_name_nocase ON countries(name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS collections (
  id                 INTEGER PRIMARY KEY,
  uuid               TEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL,
  description        TEXT NOT NULL DEFAULT '',
  catalog_system_raw TEXT NOT NULL,
  country_id         INTEGER REFERENCES countries(id) ON DELETE SET NULL,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS collections_sort ON collections(sort_order);

CREATE TABLE IF NOT EXISTS albums (
  id            INTEGER PRIMARY KEY,
  uuid          TEXT NOT NULL UNIQUE,
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS albums_collection ON albums(collection_id, sort_order);

CREATE TABLE IF NOT EXISTS stamps (
  id                    INTEGER PRIMARY KEY,
  uuid                  TEXT NOT NULL UNIQUE,
  album_id              INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  country_id            INTEGER REFERENCES countries(id) ON DELETE SET NULL,
  catalog_number        TEXT NOT NULL,
  year_start            INTEGER,
  year_end              INTEGER,
  denomination          TEXT NOT NULL DEFAULT '',
  color                 TEXT NOT NULL DEFAULT '',
  perforation_gauge     TEXT,
  watermark             TEXT,
  gum_condition_raw     TEXT NOT NULL,
  centering_grade_raw   TEXT NOT NULL,
  collection_status_raw TEXT NOT NULL,
  notes                 TEXT NOT NULL DEFAULT '',
  purchase_price        TEXT,
  purchase_date         TEXT,
  acquisition_source    TEXT NOT NULL DEFAULT '',
  image_filename        TEXT,
  quantity              INTEGER NOT NULL DEFAULT 1,
  tradeable             INTEGER NOT NULL DEFAULT 0,
  series_id             INTEGER,
  cert_number           TEXT,
  cert_issuer           TEXT,
  cert_date             TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  deleted_at            TEXT
);
CREATE INDEX IF NOT EXISTS stamps_album          ON stamps(album_id);
CREATE INDEX IF NOT EXISTS stamps_country        ON stamps(country_id);
CREATE INDEX IF NOT EXISTS stamps_catalog_number ON stamps(catalog_number);
CREATE INDEX IF NOT EXISTS stamps_year_start     ON stamps(year_start);
CREATE INDEX IF NOT EXISTS stamps_status         ON stamps(collection_status_raw);
-- stamps_deleted_at index is created by runMigrations() in connection.ts
-- so it works on both fresh and migrated databases.

CREATE TABLE IF NOT EXISTS custom_catalogs (
  id   INTEGER PRIMARY KEY,
  key  TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS series (
  id          INTEGER PRIMARY KEY,
  uuid        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  country_id  INTEGER REFERENCES countries(id) ON DELETE SET NULL,
  year_start  INTEGER,
  year_end    INTEGER,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS series_country     ON series(country_id);
CREATE INDEX IF NOT EXISTS series_name_nocase ON series(name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
