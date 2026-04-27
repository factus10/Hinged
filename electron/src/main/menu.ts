// Native application menu. Backup + CSV import live under File; UI triggers
// for dialogs are sent back to the renderer via the renderer-events channels.

import {
  BrowserWindow,
  Menu,
  type MenuItemConstructorOptions,
  dialog,
} from 'electron';
import { readFileSync } from 'node:fs';
import { parseBackupJson, restoreBackup, writeBackupFile } from './backup.js';
import { getDatabase } from './db/connection.js';
import { importCsvIntoAlbum, type CsvDuplicateAction } from './csv.js';
import { RendererEvents } from '@shared/ipc-contract.js';
import type { ImportMode } from '@shared/types.js';

function focusedWin(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
}

function sendTo(win: BrowserWindow | null, channel: string, payload?: unknown): void {
  if (!win) return;
  win.webContents.send(channel, payload);
}

async function importBackup(win: BrowserWindow, mode: ImportMode): Promise<void> {
  const result = await dialog.showOpenDialog(win, {
    title: 'Import Hinged Backup',
    filters: [{ name: 'Hinged Backup', extensions: ['hinged', 'json'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return;
  const path = result.filePaths[0]!;
  try {
    const json = readFileSync(path, 'utf8');
    const backup = parseBackupJson(json);
    const importResult = restoreBackup(getDatabase(), backup, mode);
    sendTo(win, RendererEvents.backupImported, { path, result: importResult });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await dialog.showMessageBox(win, {
      type: 'error',
      message: 'Failed to import backup',
      detail: message,
    });
  }
}

async function exportBackup(win: BrowserWindow): Promise<void> {
  const result = await dialog.showSaveDialog(win, {
    title: 'Export Hinged Backup',
    defaultPath: `hinged-backup-${new Date().toISOString().slice(0, 10)}.hinged`,
    filters: [{ name: 'Hinged Backup', extensions: ['hinged', 'json'] }],
  });
  if (result.canceled || !result.filePath) return;
  try {
    writeBackupFile(getDatabase(), result.filePath);
    sendTo(win, RendererEvents.backupExported, { path: result.filePath });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await dialog.showMessageBox(win, {
      type: 'error',
      message: 'Failed to export backup',
      detail: message,
    });
  }
}

/**
 * Import a CSV file into the currently-selected album. The renderer tells us
 * the album via `ui:importCsv` event which it responds to by asking for a
 * selection if needed. We ship a simpler flow: ask the renderer for the album
 * ID up-front, and only start the dialog if one is selected.
 *
 * In practice, the menu click routes through the renderer which already knows
 * the selected album. Here we just show the open dialog + prompt for mode.
 */
async function importCsvForAlbum(
  win: BrowserWindow,
  albumId: number,
  albumName: string,
): Promise<void> {
  const file = await dialog.showOpenDialog(win, {
    title: `Import CSV into "${albumName}"`,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
    properties: ['openFile'],
  });
  if (file.canceled || file.filePaths.length === 0) return;
  const path = file.filePaths[0]!;

  const modeBox = await dialog.showMessageBox(win, {
    type: 'question',
    message: 'Duplicate handling',
    detail:
      'How should stamps with catalog numbers that already exist in this album be handled?',
    buttons: [
      'Skip duplicates',
      'Update existing',
      'Update existing only (ignore unmatched)',
      'Create new entries',
      'Cancel',
    ],
    defaultId: 0,
    cancelId: 4,
  });
  if (modeBox.response === 4) return;
  const action: CsvDuplicateAction =
    modeBox.response === 0
      ? 'skip'
      : modeBox.response === 1
        ? 'update'
        : modeBox.response === 2
          ? 'updateOnly'
          : 'createNew';

  try {
    const csv = readFileSync(path, 'utf8');
    const result = importCsvIntoAlbum(getDatabase(), albumId, csv, action);
    sendTo(win, RendererEvents.csvImported, { path, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await dialog.showMessageBox(win, {
      type: 'error',
      message: 'Failed to import CSV',
      detail: message,
    });
  }
}

export function buildAppMenu(): void {
  const isMac = process.platform === 'darwin';

  const fileSubmenu: MenuItemConstructorOptions[] = [
    {
      label: 'New Collection…',
      accelerator: 'CmdOrCtrl+Shift+N',
      click: () => sendTo(focusedWin(), RendererEvents.uiShowNewCollection),
    },
    {
      label: 'New Album…',
      accelerator: 'CmdOrCtrl+Alt+N',
      click: () => sendTo(focusedWin(), RendererEvents.uiShowNewAlbum),
    },
    { type: 'separator' },
    {
      label: 'Import Backup (Merge)…',
      click: async () => {
        const w = focusedWin();
        if (w) await importBackup(w, 'merge');
      },
    },
    {
      label: 'Import Backup (Replace)…',
      click: async () => {
        const w = focusedWin();
        if (w) await importBackup(w, 'replace');
      },
    },
    {
      label: 'Export Backup…',
      accelerator: 'CmdOrCtrl+Shift+E',
      click: async () => {
        const w = focusedWin();
        if (w) await exportBackup(w);
      },
    },
    { type: 'separator' },
    {
      label: 'Import CSV into Selected Album…',
      // The renderer listens for this and replies with a direct IPC call
      // once it knows which album is selected.
      click: () => sendTo(focusedWin(), RendererEvents.uiImportCsv),
    },
    {
      label: 'Export CSV (Current View)…',
      click: () => sendTo(focusedWin(), RendererEvents.uiExportCsv),
    },
    { type: 'separator' },
    {
      label: 'Apply Template…',
      click: () => sendTo(focusedWin(), RendererEvents.uiApplyTemplate),
    },
    {
      label: 'Export Selected Album as Template…',
      click: () => sendTo(focusedWin(), RendererEvents.uiExportAlbumAsTemplate),
    },
    { type: 'separator' },
    isMac ? { role: 'close' } : { role: 'quit' },
  ];

  const toolsSubmenu: MenuItemConstructorOptions[] = [
    {
      label: 'Countries…',
      click: () => sendTo(focusedWin(), RendererEvents.uiShowCountryManagement),
    },
    {
      label: 'Gap Analysis…',
      click: () => sendTo(focusedWin(), RendererEvents.uiShowGapAnalysis),
    },
    { type: 'separator' },
    {
      label: 'Settings…',
      accelerator: 'CmdOrCtrl+,',
      click: () => sendTo(focusedWin(), RendererEvents.uiShowSettings),
    },
  ];

  const helpSubmenu: MenuItemConstructorOptions[] = [
    {
      label: 'Hinged Help',
      accelerator: isMac ? 'Cmd+?' : 'F1',
      click: () => sendTo(focusedWin(), RendererEvents.uiShowHelp),
    },
  ];

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? ([{ role: 'appMenu' }] as MenuItemConstructorOptions[]) : []),
    { label: 'File', submenu: fileSubmenu },
    { role: 'editMenu' },
    { label: 'Tools', submenu: toolsSubmenu },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    { role: 'help', submenu: helpSubmenu },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/**
 * Called by the renderer once the user actually has an album selected and
 * triggers CSV import. Keeps the dialog flow in the main process but lets the
 * renderer own "which album is selected".
 */
export async function runCsvImport(albumId: number, albumName: string): Promise<void> {
  const win = focusedWin();
  if (!win) return;
  await importCsvForAlbum(win, albumId, albumName);
}
