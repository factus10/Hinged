// IPC channel names. Keep in sync with src/main/ipc.ts and src/preload/index.ts.

export const IpcChannels = {
  // Countries
  countriesList: 'countries:list',
  countriesCreate: 'countries:create',
  countriesUpdate: 'countries:update',
  countriesDelete: 'countries:delete',

  // Collections
  collectionsList: 'collections:list',
  collectionsCreate: 'collections:create',
  collectionsUpdate: 'collections:update',
  collectionsDelete: 'collections:delete',

  // Albums
  albumsList: 'albums:list',
  albumsCreate: 'albums:create',
  albumsUpdate: 'albums:update',
  albumsDelete: 'albums:delete',

  // Stamps
  stampsList: 'stamps:list',
  stampsListTrashed: 'stamps:listTrashed',
  stampsCreate: 'stamps:create',
  stampsUpdate: 'stamps:update',
  stampsBulkUpdate: 'stamps:bulkUpdate',
  stampsDelete: 'stamps:delete',
  stampsBulkDelete: 'stamps:bulkDelete',
  stampsRestore: 'stamps:restore',
  stampsEmptyTrash: 'stamps:emptyTrash',

  // Images
  imagesPickAndSave: 'images:pickAndSave',
  imagesSaveBuffer: 'images:saveBuffer',
  imagesDataUrl: 'images:dataUrl',
  imagesDelete: 'images:delete',

  // Settings / custom catalogs
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  customCatalogsList: 'customCatalogs:list',
  customCatalogsCreate: 'customCatalogs:create',
  customCatalogsUpdate: 'customCatalogs:update',
  customCatalogsDelete: 'customCatalogs:delete',

  // Series
  seriesList: 'series:list',
  seriesListWithCounts: 'series:listWithCounts',
  seriesCreate: 'series:create',
  seriesUpdate: 'series:update',
  seriesDelete: 'series:delete',

  // CSV
  csvExportStamps: 'csv:exportStamps',
  csvImportForAlbum: 'csv:importForAlbum',
  csvPickAndPreview: 'csv:pickAndPreview',
  csvPreviewText: 'csv:previewText',
  csvImportWithMapping: 'csv:importWithMapping',

  // Want list export
  wantListExportPdf: 'wantList:exportPdf',
  wantListExportMarkdown: 'wantList:exportMarkdown',

  // Templates
  templateExportAlbum: 'template:exportAlbum',
  templatePeek: 'template:peek',
  templateApply: 'template:apply',

  // Dialogs
  dialogChooseDirectory: 'dialog:chooseDirectory',

  // App info (used by the About dialog)
  appGetInfo: 'app:getInfo',

  // Diagnostics
  diagDbPath: 'diag:dbPath',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];

// Renderer-facing UI events sent from the main process.
export const RendererEvents = {
  backupImported: 'backup:imported',
  backupExported: 'backup:exported',
  csvImported: 'csv:imported',
  csvExported: 'csv:exported',
  uiShowNewCollection: 'ui:showNewCollection',
  uiShowNewAlbum: 'ui:showNewAlbum',
  uiShowSettings: 'ui:showSettings',
  uiShowCountryManagement: 'ui:showCountryManagement',
  uiShowGapAnalysis: 'ui:showGapAnalysis',
  uiShowHelp: 'ui:showHelp',
  uiImportCsv: 'ui:importCsv',
  uiExportCsv: 'ui:exportCsv',
  uiApplyTemplate: 'ui:applyTemplate',
  uiExportAlbumAsTemplate: 'ui:exportAlbumAsTemplate',
  uiShowSeriesManagement: 'ui:showSeriesManagement',
  uiShowStatistics: 'ui:showStatistics',
  uiShowWantListExport: 'ui:showWantListExport',
  uiShowAbout: 'ui:showAbout',
  templateApplied: 'template:applied',
  templateExported: 'template:exported',
} as const;

export type RendererEvent = (typeof RendererEvents)[keyof typeof RendererEvents];
