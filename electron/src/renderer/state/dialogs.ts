import { create } from 'zustand';
import type { Album, Collection, CsvPreviewPayload, TemplatePreview } from '@shared/types';

export interface PendingTemplate {
  preview: TemplatePreview;
  rawJson: string;
}

export interface PendingCsvImport {
  preview: CsvPreviewPayload;
  /** Album ID the import will land in. */
  albumId: number;
  albumName: string;
}

interface DialogsState {
  showNewCollection: boolean;
  newAlbumForCollection: Collection | null;
  editCollection: Collection | null;
  editAlbum: Album | null;
  showCountryManagement: boolean;
  showSeriesManagement: boolean;
  showGapAnalysis: boolean;
  showStatistics: boolean;
  showWantListExport: boolean;
  showSettings: boolean;
  showHelp: boolean;
  showAbout: boolean;
  pendingTemplate: PendingTemplate | null;
  pendingCsvImport: PendingCsvImport | null;
  bulkAssignSeriesIds: number[] | null;

  openNewCollection: () => void;
  openNewAlbum: (c: Collection) => void;
  openEditCollection: (c: Collection) => void;
  openEditAlbum: (a: Album) => void;
  openCountryManagement: () => void;
  openSeriesManagement: () => void;
  openGapAnalysis: () => void;
  openStatistics: () => void;
  openWantListExport: () => void;
  openAbout: () => void;
  openBulkAssignSeries: (ids: number[]) => void;
  openSettings: () => void;
  openHelp: () => void;
  openApplyTemplate: (t: PendingTemplate) => void;
  openCsvImport: (p: PendingCsvImport) => void;
  closeAll: () => void;
}

export const useDialogs = create<DialogsState>((set) => ({
  showNewCollection: false,
  newAlbumForCollection: null,
  editCollection: null,
  editAlbum: null,
  showCountryManagement: false,
  showSeriesManagement: false,
  showGapAnalysis: false,
  showStatistics: false,
  showWantListExport: false,
  showSettings: false,
  showHelp: false,
  showAbout: false,
  pendingTemplate: null,
  pendingCsvImport: null,
  bulkAssignSeriesIds: null,

  openNewCollection: () => set({ showNewCollection: true }),
  openNewAlbum: (c) => set({ newAlbumForCollection: c }),
  openEditCollection: (c) => set({ editCollection: c }),
  openEditAlbum: (a) => set({ editAlbum: a }),
  openCountryManagement: () => set({ showCountryManagement: true }),
  openSeriesManagement: () => set({ showSeriesManagement: true }),
  openGapAnalysis: () => set({ showGapAnalysis: true }),
  openStatistics: () => set({ showStatistics: true }),
  openWantListExport: () => set({ showWantListExport: true }),
  openAbout: () => set({ showAbout: true }),
  openBulkAssignSeries: (ids) => set({ bulkAssignSeriesIds: ids }),
  openSettings: () => set({ showSettings: true }),
  openHelp: () => set({ showHelp: true }),
  openApplyTemplate: (t) => set({ pendingTemplate: t }),
  openCsvImport: (p) => set({ pendingCsvImport: p }),
  closeAll: () =>
    set({
      showNewCollection: false,
      newAlbumForCollection: null,
      editCollection: null,
      editAlbum: null,
      showCountryManagement: false,
      showSeriesManagement: false,
      showGapAnalysis: false,
      showStatistics: false,
      showWantListExport: false,
      showSettings: false,
      showHelp: false,
      showAbout: false,
      pendingTemplate: null,
      pendingCsvImport: null,
      bulkAssignSeriesIds: null,
    }),
}));
