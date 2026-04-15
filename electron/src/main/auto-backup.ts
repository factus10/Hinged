// Auto-backup on app launch. Writes a timestamped .hinged file to the
// user-configured directory and rotates old backups so we keep only the
// most recent N.

import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { writeBackupFile } from './backup.js';
import type { DB } from './db/connection.js';

const PREFIX = 'hinged-autobackup-';
const EXT = '.hinged';

export interface AutoBackupResult {
  ok: boolean;
  path?: string;
  error?: string;
  rotatedCount?: number;
}

export function runAutoBackup(db: DB, dir: string, keep: number): AutoBackupResult {
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace(/Z$/, 'Z');
    const filename = `${PREFIX}${timestamp}${EXT}`;
    const path = join(dir, filename);
    writeBackupFile(db, path);
    const rotatedCount = rotate(dir, Math.max(1, keep));
    return { ok: true, path, rotatedCount };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function rotate(dir: string, keep: number): number {
  const entries = readdirSync(dir)
    .filter((f) => f.startsWith(PREFIX) && f.endsWith(EXT))
    .sort(); // lexicographic sort on ISO timestamps is chronological
  // Oldest first, remove all but the last `keep`.
  const toRemove = entries.slice(0, Math.max(0, entries.length - keep));
  let removed = 0;
  for (const name of toRemove) {
    try {
      unlinkSync(join(dir, name));
      removed += 1;
    } catch {
      // swallow
    }
  }
  return removed;
}
