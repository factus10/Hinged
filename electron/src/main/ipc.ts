import { BrowserWindow, dialog, ipcMain } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { IpcChannels } from '@shared/ipc-contract.js';
import type {
  AlbumPatchPayload,
  AppSettings,
  CollectionPatchPayload,
  CountryPatchPayload,
  NewAlbumPayload,
  NewCollectionPayload,
  NewCountryPayload,
  NewSeriesPayload,
  NewStampPayload,
  SeriesPatchPayload,
  Stamp,
  StampPatchPayload,
} from '@shared/types.js';
import { getDatabase, getDatabasePath } from './db/connection.js';
import {
  deleteCountry,
  insertCountry,
  listCountries,
  updateCountry,
} from './db/repositories/countries.js';
import {
  deleteCollection,
  insertCollection,
  listCollections,
  updateCollection,
} from './db/repositories/collections.js';
import {
  deleteAlbum,
  insertAlbum,
  listAlbums,
  updateAlbum,
} from './db/repositories/albums.js';
import {
  bulkUpdateStamps,
  emptyTrash,
  insertStamp,
  listStamps,
  listTrashedStamps,
  restoreStamps,
  softDeleteStamp,
  softDeleteStamps,
  updateStamp,
  type StampPatch,
} from './db/repositories/stamps.js';
import { getAllSettings, setSettings } from './db/repositories/settings.js';
import {
  deleteCustomCatalog,
  insertCustomCatalog,
  listCustomCatalogs,
  updateCustomCatalog,
} from './db/repositories/custom-catalogs.js';
import {
  deleteSeries,
  insertSeries,
  listSeries,
  listSeriesWithCounts,
  updateSeries,
} from './db/repositories/series.js';
import {
  deleteImage,
  detectExtension,
  generateFilename,
  loadImageBuffer,
  saveImageBuffer,
} from './images.js';
import {
  generateCsv,
  importCsvWithMapping,
  previewCsv,
  type CsvFieldMapping,
} from './csv.js';
import { runCsvImport } from './menu.js';
import {
  applyTemplate,
  parseTemplateJson,
  writeTemplateFile,
  type ApplyTemplateOptions,
} from './template.js';
import { readFileSync as fsReadFileSync } from 'node:fs';
import type {
  CsvDuplicateAction,
  CsvPreviewPayload,
  TemplatePreview,
} from '@shared/types.js';

export function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannels.diagDbPath, () => getDatabasePath());

  // ----- Countries -----
  ipcMain.handle(IpcChannels.countriesList, () => listCountries(getDatabase()));
  ipcMain.handle(IpcChannels.countriesCreate, (_e, input: NewCountryPayload) =>
    insertCountry(getDatabase(), input),
  );
  ipcMain.handle(
    IpcChannels.countriesUpdate,
    (_e, id: number, patch: CountryPatchPayload) => {
      updateCountry(getDatabase(), id, patch);
      return true;
    },
  );
  ipcMain.handle(IpcChannels.countriesDelete, (_e, id: number) => {
    deleteCountry(getDatabase(), id);
    return true;
  });

  // ----- Collections -----
  ipcMain.handle(IpcChannels.collectionsList, () => listCollections(getDatabase()));
  ipcMain.handle(IpcChannels.collectionsCreate, (_e, input: NewCollectionPayload) =>
    insertCollection(getDatabase(), input),
  );
  ipcMain.handle(
    IpcChannels.collectionsUpdate,
    (_e, id: number, patch: CollectionPatchPayload) => {
      updateCollection(getDatabase(), id, patch);
      return true;
    },
  );
  ipcMain.handle(IpcChannels.collectionsDelete, (_e, id: number) => {
    deleteCollection(getDatabase(), id);
    return true;
  });

  // ----- Albums -----
  ipcMain.handle(IpcChannels.albumsList, () => listAlbums(getDatabase()));
  ipcMain.handle(IpcChannels.albumsCreate, (_e, input: NewAlbumPayload) =>
    insertAlbum(getDatabase(), input),
  );
  ipcMain.handle(IpcChannels.albumsUpdate, (_e, id: number, patch: AlbumPatchPayload) => {
    updateAlbum(getDatabase(), id, patch);
    return true;
  });
  ipcMain.handle(IpcChannels.albumsDelete, (_e, id: number) => {
    deleteAlbum(getDatabase(), id);
    return true;
  });

  // ----- Stamps -----
  ipcMain.handle(IpcChannels.stampsList, () => listStamps(getDatabase()));
  ipcMain.handle(IpcChannels.stampsListTrashed, () => listTrashedStamps(getDatabase()));
  ipcMain.handle(IpcChannels.stampsCreate, (_e, input: NewStampPayload) => {
    const required = {
      gumConditionRaw: input.gumConditionRaw ?? 'unspecified',
      centeringGradeRaw: input.centeringGradeRaw ?? 'unspecified',
      collectionStatusRaw: input.collectionStatusRaw ?? 'owned',
    };
    return insertStamp(getDatabase(), { ...input, ...required });
  });
  ipcMain.handle(IpcChannels.stampsUpdate, (_e, id: number, patch: StampPatchPayload) => {
    updateStamp(getDatabase(), id, patch);
    return true;
  });
  ipcMain.handle(
    IpcChannels.stampsBulkUpdate,
    (_e, ids: number[], patch: StampPatchPayload) => {
      bulkUpdateStamps(getDatabase(), ids, patch as StampPatch);
      return true;
    },
  );
  ipcMain.handle(IpcChannels.stampsDelete, (_e, id: number) => {
    softDeleteStamp(getDatabase(), id);
    return true;
  });
  ipcMain.handle(IpcChannels.stampsBulkDelete, (_e, ids: number[]) => {
    softDeleteStamps(getDatabase(), ids);
    return true;
  });
  ipcMain.handle(IpcChannels.stampsRestore, (_e, ids: number[]) => {
    restoreStamps(getDatabase(), ids);
    return true;
  });
  ipcMain.handle(IpcChannels.stampsEmptyTrash, () => {
    return emptyTrash(getDatabase());
  });

  // ----- Images -----
  ipcMain.handle(IpcChannels.imagesPickAndSave, async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    const args = {
      title: 'Choose Image',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'heic', 'tiff'] }],
      properties: ['openFile' as const],
    };
    const result = win
      ? await dialog.showOpenDialog(win, args)
      : await dialog.showOpenDialog(args);
    if (result.canceled || result.filePaths.length === 0) return { ok: false as const };
    const path = result.filePaths[0]!;
    const buf = readFileSync(path);
    const filename = generateFilename(detectExtension(buf));
    saveImageBuffer(buf, filename);
    return { ok: true as const, filename };
  });

  ipcMain.handle(
    IpcChannels.imagesSaveBuffer,
    (_e, data: { bytes: ArrayBuffer | Uint8Array; previousFilename?: string | null }) => {
      if (data.previousFilename) {
        try {
          deleteImage(data.previousFilename);
        } catch {
          // swallow
        }
      }
      const buf = Buffer.from(data.bytes as Uint8Array);
      const filename = generateFilename(detectExtension(buf));
      saveImageBuffer(buf, filename);
      return filename;
    },
  );

  ipcMain.handle(IpcChannels.imagesDataUrl, (_e, filename: string) => {
    const buf = loadImageBuffer(filename);
    if (!buf) return null;
    const ext = detectExtension(buf);
    const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    return `data:${mime};base64,${buf.toString('base64')}`;
  });

  ipcMain.handle(IpcChannels.imagesDelete, (_e, filename: string) => {
    try {
      deleteImage(filename);
      return true;
    } catch {
      return false;
    }
  });

  // ----- Settings -----
  ipcMain.handle(IpcChannels.settingsGet, () => getAllSettings(getDatabase()));
  ipcMain.handle(IpcChannels.settingsSet, (_e, patch: Partial<AppSettings>) => {
    setSettings(getDatabase(), patch);
    return getAllSettings(getDatabase());
  });

  // ----- Custom Catalogs -----
  ipcMain.handle(IpcChannels.customCatalogsList, () => listCustomCatalogs(getDatabase()));
  ipcMain.handle(IpcChannels.customCatalogsCreate, (_e, name: string) =>
    insertCustomCatalog(getDatabase(), name),
  );
  ipcMain.handle(IpcChannels.customCatalogsUpdate, (_e, id: number, name: string) => {
    updateCustomCatalog(getDatabase(), id, name);
    return true;
  });
  ipcMain.handle(IpcChannels.customCatalogsDelete, (_e, id: number) => {
    deleteCustomCatalog(getDatabase(), id);
    return true;
  });

  // ----- Series -----
  ipcMain.handle(IpcChannels.seriesList, () => listSeries(getDatabase()));
  ipcMain.handle(IpcChannels.seriesListWithCounts, () => listSeriesWithCounts(getDatabase()));
  ipcMain.handle(IpcChannels.seriesCreate, (_e, input: NewSeriesPayload) =>
    insertSeries(getDatabase(), input),
  );
  ipcMain.handle(IpcChannels.seriesUpdate, (_e, id: number, patch: SeriesPatchPayload) => {
    updateSeries(getDatabase(), id, patch);
    return true;
  });
  ipcMain.handle(IpcChannels.seriesDelete, (_e, id: number) => {
    deleteSeries(getDatabase(), id);
    return true;
  });

  // ----- CSV Export -----
  // The renderer passes in the exact set of filtered stamps it wants to
  // export (so "Export CSV" exports what's currently visible).
  ipcMain.handle(
    IpcChannels.csvExportStamps,
    async (e, args: { stamps: Stamp[]; suggestedName?: string }) => {
      const win = BrowserWindow.fromWebContents(e.sender);
      const opts = {
        title: 'Export Stamps to CSV',
        defaultPath: args.suggestedName ?? `hinged-stamps-${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      };
      const result = win
        ? await dialog.showSaveDialog(win, opts)
        : await dialog.showSaveDialog(opts);
      if (result.canceled || !result.filePath) return { ok: false as const };
      const csv = generateCsv(getDatabase(), args.stamps);
      writeFileSync(result.filePath, csv, 'utf8');
      return { ok: true as const, path: result.filePath, count: args.stamps.length };
    },
  );

  ipcMain.handle(
    IpcChannels.csvImportForAlbum,
    async (_e, args: { albumId: number; albumName: string }) => {
      await runCsvImport(args.albumId, args.albumName);
      return true;
    },
  );

  // Open a file picker, read the chosen CSV, return a preview payload that
  // the renderer can pass through the column-mapping dialog.
  ipcMain.handle(
    IpcChannels.csvPickAndPreview,
    async (e): Promise<{ ok: true; preview: CsvPreviewPayload } | { ok: false }> => {
      const win = BrowserWindow.fromWebContents(e.sender);
      const opts = {
        title: 'Import CSV',
        filters: [
          { name: 'CSV / TSV', extensions: ['csv', 'tsv', 'txt'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile' as const],
      };
      const result = win
        ? await dialog.showOpenDialog(win, opts)
        : await dialog.showOpenDialog(opts);
      if (result.canceled || result.filePaths.length === 0) return { ok: false };
      const path = result.filePaths[0]!;
      try {
        const text = readFileSync(path, 'utf8');
        const p = previewCsv(text);
        return {
          ok: true,
          preview: {
            source: 'file',
            path,
            text,
            delimiter: p.delimiter,
            headers: p.headers,
            sampleRows: p.sampleRows,
            totalRows: p.totalRows,
            guessedMapping: p.guessedMapping,
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (win) {
          await dialog.showMessageBox(win, {
            type: 'error',
            message: 'Failed to read CSV',
            detail: message,
          });
        }
        return { ok: false };
      }
    },
  );

  // Preview text passed in directly (e.g. clipboard contents).
  ipcMain.handle(
    IpcChannels.csvPreviewText,
    (_e, args: { text: string }): { ok: true; preview: CsvPreviewPayload } | { ok: false } => {
      try {
        const p = previewCsv(args.text);
        if (p.headers.length === 0) return { ok: false };
        return {
          ok: true,
          preview: {
            source: 'clipboard',
            path: null,
            text: args.text,
            delimiter: p.delimiter,
            headers: p.headers,
            sampleRows: p.sampleRows,
            totalRows: p.totalRows,
            guessedMapping: p.guessedMapping,
          },
        };
      } catch {
        return { ok: false };
      }
    },
  );

  // Run an import with an explicit mapping. Used by the column-mapping
  // dialog after the user confirms.
  ipcMain.handle(
    IpcChannels.csvImportWithMapping,
    (
      _e,
      args: {
        albumId: number;
        text: string;
        mapping: CsvFieldMapping;
        delimiter: ',' | '\t';
        duplicateAction: CsvDuplicateAction;
        hasHeader: boolean;
      },
    ) => {
      return importCsvWithMapping(getDatabase(), {
        albumId: args.albumId,
        text: args.text,
        mapping: args.mapping,
        delimiter: args.delimiter,
        duplicateAction: args.duplicateAction,
        hasHeader: args.hasHeader,
      });
    },
  );

  // ----- Templates -----
  ipcMain.handle(
    IpcChannels.templateExportAlbum,
    async (e, args: { albumId: number; albumName: string }) => {
      const win = BrowserWindow.fromWebContents(e.sender);
      const opts = {
        title: 'Export Album as Template',
        defaultPath: `${args.albumName.replace(/[/\\?%*:|"<>]/g, '_')}.hinged-template.json`,
        filters: [
          { name: 'Hinged Template', extensions: ['hinged-template.json', 'json'] },
        ],
      };
      const result = win
        ? await dialog.showSaveDialog(win, opts)
        : await dialog.showSaveDialog(opts);
      if (result.canceled || !result.filePath) return { ok: false as const };
      const out = writeTemplateFile(getDatabase(), result.filePath, args.albumId);
      return { ok: true as const, path: result.filePath, stampsExported: out.stampsExported };
    },
  );

  ipcMain.handle(
    IpcChannels.templatePeek,
    async (e): Promise<{ ok: true; preview: TemplatePreview; rawJson: string } | { ok: false }> => {
      const win = BrowserWindow.fromWebContents(e.sender);
      const opts = {
        title: 'Apply Template',
        filters: [
          { name: 'Hinged Template', extensions: ['hinged-template.json', 'json'] },
        ],
        properties: ['openFile' as const],
      };
      const result = win
        ? await dialog.showOpenDialog(win, opts)
        : await dialog.showOpenDialog(opts);
      if (result.canceled || result.filePaths.length === 0) return { ok: false };
      const path = result.filePaths[0]!;
      try {
        const raw = fsReadFileSync(path, 'utf8');
        const t = parseTemplateJson(raw);
        const preview: TemplatePreview = {
          path,
          name: t.name,
          description: t.description ?? '',
          catalogSystemRaw: t.catalogSystemRaw,
          countryName: t.country?.name ?? null,
          stampCount: t.stamps.length,
          createdBy: t.createdBy ?? null,
          createdAt: t.createdAt,
        };
        return { ok: true, preview, rawJson: raw };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (win) {
          await dialog.showMessageBox(win, {
            type: 'error',
            message: 'Failed to read template',
            detail: message,
          });
        }
        return { ok: false };
      }
    },
  );

  ipcMain.handle(
    IpcChannels.templateApply,
    (_e, args: { rawJson: string; options: ApplyTemplateOptions }) => {
      const template = parseTemplateJson(args.rawJson);
      const result = applyTemplate(getDatabase(), template, args.options);
      return result;
    },
  );

  // ----- Directory picker (used by Settings for auto-backup) -----
  ipcMain.handle(IpcChannels.dialogChooseDirectory, async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    const opts = {
      title: 'Choose folder',
      properties: ['openDirectory' as const, 'createDirectory' as const],
    };
    const result = win
      ? await dialog.showOpenDialog(win, opts)
      : await dialog.showOpenDialog(opts);
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0] ?? null;
  });

  // Backup import/export live in the File menu — see src/main/menu.ts.
}
