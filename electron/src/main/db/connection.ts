import Database from 'better-sqlite3';
// Vite inlines the .sql file contents at build time, so packaged builds
// don't need to ship schema.sql as a separate asset.
import schemaSql from './schema.sql?raw';

export type DB = Database.Database;

const CURRENT_SCHEMA_VERSION = 1;

let dbInstance: DB | null = null;
let dbPath: string | null = null;

export function openDatabase(filePath: string): DB {
  if (dbInstance && dbPath === filePath) return dbInstance;
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }

  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  applySchema(db);

  dbInstance = db;
  dbPath = filePath;
  return db;
}

export function getDatabase(): DB {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call openDatabase() first.');
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    dbPath = null;
  }
}

export function getDatabasePath(): string | null {
  return dbPath;
}

function applySchema(db: DB): void {
  db.exec(schemaSql);
  runMigrations(db);

  const currentVersion = getSchemaVersion(db);
  if (currentVersion === null) {
    db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(
      CURRENT_SCHEMA_VERSION,
      new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    );
  }
}

/**
 * Idempotent column-add migrations for databases created before a given
 * column existed. Cheaper than versioned migrations for a few additive
 * changes, and safe to run on every launch.
 */
function runMigrations(db: DB): void {
  ensureColumn(db, 'stamps', 'deleted_at', 'TEXT');
  db.exec('CREATE INDEX IF NOT EXISTS stamps_deleted_at ON stamps(deleted_at)');
  ensureColumn(db, 'stamps', 'quantity', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn(db, 'stamps', 'tradeable', 'INTEGER NOT NULL DEFAULT 0');
  db.exec('CREATE INDEX IF NOT EXISTS stamps_tradeable ON stamps(tradeable)');
  ensureColumn(db, 'stamps', 'series_id', 'INTEGER REFERENCES series(id) ON DELETE SET NULL');
  db.exec('CREATE INDEX IF NOT EXISTS stamps_series ON stamps(series_id)');
  ensureColumn(db, 'stamps', 'cert_number', 'TEXT');
  ensureColumn(db, 'stamps', 'cert_issuer', 'TEXT');
  ensureColumn(db, 'stamps', 'cert_date', 'TEXT');

  // Backfill stamp_images for any stamp that has stamps.image_filename
  // set but no row in stamp_images. We do this on every launch and
  // gate per-stamp via NOT EXISTS so it's safe to repeat: stamps that
  // were created via the old single-image flow (or that picked up an
  // image while the new schema wasn't loaded) get their primary row
  // backfilled, and stamps that already have gallery data are
  // untouched.
  db.prepare(
    `INSERT INTO stamp_images (stamp_id, filename, caption, sort_order, created_at)
     SELECT s.id, s.image_filename, NULL, 0, ?
     FROM stamps s
     WHERE s.image_filename IS NOT NULL
       AND s.image_filename <> ''
       AND NOT EXISTS (SELECT 1 FROM stamp_images si WHERE si.stamp_id = s.id)`,
  ).run(new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'));
}

function ensureColumn(db: DB, table: string, column: string, type: string): void {
  const rows = db
    .prepare(`SELECT name FROM pragma_table_info(?)`)
    .all(table) as Array<{ name: string }>;
  if (rows.some((r) => r.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}

function getSchemaVersion(db: DB): number | null {
  const row = db
    .prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1')
    .get() as { version: number } | undefined;
  return row?.version ?? null;
}

/** Run `fn` inside a transaction. Throws from `fn` roll back. */
export function transact<T>(db: DB, fn: (db: DB) => T): T {
  const tx = db.transaction(fn);
  return tx(db);
}
