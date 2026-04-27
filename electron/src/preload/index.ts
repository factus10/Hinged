import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IpcChannels, RendererEvents } from '@shared/ipc-contract.js';
import type {
  Album,
  AlbumPatchPayload,
  AppSettings,
  Collection,
  CollectionPatchPayload,
  Country,
  CountryPatchPayload,
  CsvImportResult,
  CustomCatalog,
  ImportResult,
  NewAlbumPayload,
  NewCollectionPayload,
  NewCountryPayload,
  NewSeriesPayload,
  NewStampPayload,
  Series,
  SeriesPatchPayload,
  SeriesWithCount,
  Stamp,
  StampPatchPayload,
  TemplatePreview,
} from '@shared/types.js';

function onEvent<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T): void => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

const api = {
  diag: {
    dbPath: (): Promise<string | null> => ipcRenderer.invoke(IpcChannels.diagDbPath),
  },
  countries: {
    list: (): Promise<Country[]> => ipcRenderer.invoke(IpcChannels.countriesList),
    create: (input: NewCountryPayload): Promise<Country> =>
      ipcRenderer.invoke(IpcChannels.countriesCreate, input),
    update: (id: number, patch: CountryPatchPayload): Promise<true> =>
      ipcRenderer.invoke(IpcChannels.countriesUpdate, id, patch),
    delete: (id: number): Promise<true> => ipcRenderer.invoke(IpcChannels.countriesDelete, id),
  },
  collections: {
    list: (): Promise<Collection[]> => ipcRenderer.invoke(IpcChannels.collectionsList),
    create: (input: NewCollectionPayload): Promise<Collection> =>
      ipcRenderer.invoke(IpcChannels.collectionsCreate, input),
    update: (id: number, patch: CollectionPatchPayload): Promise<true> =>
      ipcRenderer.invoke(IpcChannels.collectionsUpdate, id, patch),
    delete: (id: number): Promise<true> =>
      ipcRenderer.invoke(IpcChannels.collectionsDelete, id),
  },
  albums: {
    list: (): Promise<Album[]> => ipcRenderer.invoke(IpcChannels.albumsList),
    create: (input: NewAlbumPayload): Promise<Album> =>
      ipcRenderer.invoke(IpcChannels.albumsCreate, input),
    update: (id: number, patch: AlbumPatchPayload): Promise<true> =>
      ipcRenderer.invoke(IpcChannels.albumsUpdate, id, patch),
    delete: (id: number): Promise<true> => ipcRenderer.invoke(IpcChannels.albumsDelete, id),
  },
  stamps: {
    list: (): Promise<Stamp[]> => ipcRenderer.invoke(IpcChannels.stampsList),
    listTrashed: (): Promise<Stamp[]> => ipcRenderer.invoke(IpcChannels.stampsListTrashed),
    create: (input: NewStampPayload): Promise<Stamp> =>
      ipcRenderer.invoke(IpcChannels.stampsCreate, input),
    update: (id: number, patch: StampPatchPayload): Promise<true> =>
      ipcRenderer.invoke(IpcChannels.stampsUpdate, id, patch),
    bulkUpdate: (ids: number[], patch: StampPatchPayload): Promise<true> =>
      ipcRenderer.invoke(IpcChannels.stampsBulkUpdate, ids, patch),
    delete: (id: number): Promise<true> => ipcRenderer.invoke(IpcChannels.stampsDelete, id),
    bulkDelete: (ids: number[]): Promise<true> =>
      ipcRenderer.invoke(IpcChannels.stampsBulkDelete, ids),
    restore: (ids: number[]): Promise<true> =>
      ipcRenderer.invoke(IpcChannels.stampsRestore, ids),
    emptyTrash: (): Promise<number> => ipcRenderer.invoke(IpcChannels.stampsEmptyTrash),
  },
  dialog: {
    chooseDirectory: (): Promise<string | null> =>
      ipcRenderer.invoke(IpcChannels.dialogChooseDirectory),
  },
  images: {
    pickAndSave: (): Promise<{ ok: true; filename: string } | { ok: false }> =>
      ipcRenderer.invoke(IpcChannels.imagesPickAndSave),
    saveBuffer: (bytes: Uint8Array, previousFilename?: string | null): Promise<string> =>
      ipcRenderer.invoke(IpcChannels.imagesSaveBuffer, { bytes, previousFilename: previousFilename ?? null }),
    dataUrl: (filename: string): Promise<string | null> =>
      ipcRenderer.invoke(IpcChannels.imagesDataUrl, filename),
    delete: (filename: string): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.imagesDelete, filename),
  },
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke(IpcChannels.settingsGet),
    set: (patch: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke(IpcChannels.settingsSet, patch),
  },
  customCatalogs: {
    list: (): Promise<CustomCatalog[]> =>
      ipcRenderer.invoke(IpcChannels.customCatalogsList),
    create: (name: string): Promise<CustomCatalog> =>
      ipcRenderer.invoke(IpcChannels.customCatalogsCreate, name),
    update: (id: number, name: string): Promise<true> =>
      ipcRenderer.invoke(IpcChannels.customCatalogsUpdate, id, name),
    delete: (id: number): Promise<true> =>
      ipcRenderer.invoke(IpcChannels.customCatalogsDelete, id),
  },
  series: {
    list: (): Promise<Series[]> => ipcRenderer.invoke(IpcChannels.seriesList),
    listWithCounts: (): Promise<SeriesWithCount[]> =>
      ipcRenderer.invoke(IpcChannels.seriesListWithCounts),
    create: (input: NewSeriesPayload): Promise<Series> =>
      ipcRenderer.invoke(IpcChannels.seriesCreate, input),
    update: (id: number, patch: SeriesPatchPayload): Promise<true> =>
      ipcRenderer.invoke(IpcChannels.seriesUpdate, id, patch),
    delete: (id: number): Promise<true> =>
      ipcRenderer.invoke(IpcChannels.seriesDelete, id),
  },
  csv: {
    exportStamps: (
      stamps: Stamp[],
      suggestedName?: string,
    ): Promise<{ ok: true; path: string; count: number } | { ok: false }> =>
      ipcRenderer.invoke(IpcChannels.csvExportStamps, { stamps, suggestedName }),
    importForAlbum: (albumId: number, albumName: string): Promise<true> =>
      ipcRenderer.invoke(IpcChannels.csvImportForAlbum, { albumId, albumName }),
    pickAndPreview: (): Promise<
      { ok: true; preview: import('@shared/types').CsvPreviewPayload } | { ok: false }
    > => ipcRenderer.invoke(IpcChannels.csvPickAndPreview),
    previewText: (
      text: string,
    ): Promise<
      { ok: true; preview: import('@shared/types').CsvPreviewPayload } | { ok: false }
    > => ipcRenderer.invoke(IpcChannels.csvPreviewText, { text }),
    importWithMapping: (args: {
      albumId: number;
      text: string;
      mapping: import('@shared/types').CsvFieldMapping;
      delimiter: ',' | '\t';
      duplicateAction: import('@shared/types').CsvDuplicateAction;
      hasHeader: boolean;
    }): Promise<import('@shared/types').CsvImportResult> =>
      ipcRenderer.invoke(IpcChannels.csvImportWithMapping, args),
  },
  templates: {
    exportAlbum: (
      albumId: number,
      albumName: string,
    ): Promise<{ ok: true; path: string; stampsExported: number } | { ok: false }> =>
      ipcRenderer.invoke(IpcChannels.templateExportAlbum, { albumId, albumName }),
    peek: (): Promise<{ ok: true; preview: TemplatePreview; rawJson: string } | { ok: false }> =>
      ipcRenderer.invoke(IpcChannels.templatePeek),
    apply: (
      rawJson: string,
      options: {
        targetCollectionId: number | null;
        albumName: string;
        newCollectionName?: string;
      },
    ): Promise<{
      collectionId: number;
      albumId: number;
      countryId: number | null;
      stampsCreated: number;
    }> => ipcRenderer.invoke(IpcChannels.templateApply, { rawJson, options }),
  },
  events: {
    onBackupImported: (
      cb: (payload: { path: string; result: ImportResult }) => void,
    ): (() => void) => onEvent(RendererEvents.backupImported, cb),
    onBackupExported: (cb: (payload: { path: string }) => void): (() => void) =>
      onEvent(RendererEvents.backupExported, cb),
    onCsvImported: (
      cb: (payload: { path: string; result: CsvImportResult }) => void,
    ): (() => void) => onEvent(RendererEvents.csvImported, cb),
    onCsvExported: (
      cb: (payload: { path: string; count: number }) => void,
    ): (() => void) => onEvent(RendererEvents.csvExported, cb),
    onShowNewCollection: (cb: () => void): (() => void) =>
      onEvent(RendererEvents.uiShowNewCollection, cb),
    onShowNewAlbum: (cb: () => void): (() => void) =>
      onEvent(RendererEvents.uiShowNewAlbum, cb),
    onShowSettings: (cb: () => void): (() => void) =>
      onEvent(RendererEvents.uiShowSettings, cb),
    onShowCountryManagement: (cb: () => void): (() => void) =>
      onEvent(RendererEvents.uiShowCountryManagement, cb),
    onShowGapAnalysis: (cb: () => void): (() => void) =>
      onEvent(RendererEvents.uiShowGapAnalysis, cb),
    onShowHelp: (cb: () => void): (() => void) => onEvent(RendererEvents.uiShowHelp, cb),
    onImportCsv: (cb: () => void): (() => void) => onEvent(RendererEvents.uiImportCsv, cb),
    onExportCsv: (cb: () => void): (() => void) => onEvent(RendererEvents.uiExportCsv, cb),
    onApplyTemplate: (cb: () => void): (() => void) =>
      onEvent(RendererEvents.uiApplyTemplate, cb),
    onExportAlbumAsTemplate: (cb: () => void): (() => void) =>
      onEvent(RendererEvents.uiExportAlbumAsTemplate, cb),
    onShowSeriesManagement: (cb: () => void): (() => void) =>
      onEvent(RendererEvents.uiShowSeriesManagement, cb),
    onShowStatistics: (cb: () => void): (() => void) =>
      onEvent(RendererEvents.uiShowStatistics, cb),
  },
};

contextBridge.exposeInMainWorld('hinged', api);

export type HingedApi = typeof api;
