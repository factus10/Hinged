// Thin key/value wrapper over the `settings` table.

import type { DB } from '../connection.js';
import type { AppSettings } from '@shared/types.js';

const DEFAULTS: AppSettings = {
  defaultCatalogSystemRaw: 'builtin:scott',
  defaultCollectionStatusRaw: 'wanted',
  defaultGumConditionRaw: '',
  defaultCenteringGradeRaw: '',
  currencySymbol: '$',
  autoBackupDir: '',
  autoBackupKeep: '5',
};

export function getAllSettings(db: DB): AppSettings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{
    key: string;
    value: string;
  }>;
  const record: Record<string, string> = {};
  for (const r of rows) record[r.key] = r.value;
  return {
    defaultCatalogSystemRaw:
      record.defaultCatalogSystemRaw ?? DEFAULTS.defaultCatalogSystemRaw,
    defaultCollectionStatusRaw:
      record.defaultCollectionStatusRaw ?? DEFAULTS.defaultCollectionStatusRaw,
    defaultGumConditionRaw:
      record.defaultGumConditionRaw ?? DEFAULTS.defaultGumConditionRaw,
    defaultCenteringGradeRaw:
      record.defaultCenteringGradeRaw ?? DEFAULTS.defaultCenteringGradeRaw,
    currencySymbol: record.currencySymbol ?? DEFAULTS.currencySymbol,
    autoBackupDir: record.autoBackupDir ?? DEFAULTS.autoBackupDir,
    autoBackupKeep: record.autoBackupKeep ?? DEFAULTS.autoBackupKeep,
  };
}

export function setSettings(db: DB, patch: Partial<AppSettings>): void {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const tx = db.transaction((entries: Array<[string, string]>) => {
    for (const [key, value] of entries) stmt.run(key, value);
  });
  const entries: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    entries.push([k, String(v)]);
  }
  if (entries.length > 0) tx(entries);
}
