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
