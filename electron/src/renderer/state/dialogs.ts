import { create } from 'zustand';
import type { Album, Collection, TemplatePreview } from '@shared/types';

export interface PendingTemplate {
  preview: TemplatePreview;
  rawJson: string;
}

interface DialogsState {
  showNewCollection: boolean;
  newAlbumForCollection: Collection | null;
  editCollection: Collection | null;
  editAlbum: Album | null;
  showCountryManagement: boolean;
  showGapAnalysis: boolean;
  showSettings: boolean;
  showHelp: boolean;
  pendingTemplate: PendingTemplate | null;

  openNewCollection: () => void;
  openNewAlbum: (c: Collection) => void;
  openEditCollection: (c: Collection) => void;
  openEditAlbum: (a: Album) => void;
  openCountryManagement: () => void;
  openGapAnalysis: () => void;
  openSettings: () => void;
  openHelp: () => void;
  openApplyTemplate: (t: PendingTemplate) => void;
  closeAll: () => void;
}

export const useDialogs = create<DialogsState>((set) => ({
  showNewCollection: false,
  newAlbumForCollection: null,
  editCollection: null,
  editAlbum: null,
  showCountryManagement: false,
  showGapAnalysis: false,
  showSettings: false,
  showHelp: false,
  pendingTemplate: null,

  openNewCollection: () => set({ showNewCollection: true }),
  openNewAlbum: (c) => set({ newAlbumForCollection: c }),
  openEditCollection: (c) => set({ editCollection: c }),
  openEditAlbum: (a) => set({ editAlbum: a }),
  openCountryManagement: () => set({ showCountryManagement: true }),
  openGapAnalysis: () => set({ showGapAnalysis: true }),
  openSettings: () => set({ showSettings: true }),
  openHelp: () => set({ showHelp: true }),
  openApplyTemplate: (t) => set({ pendingTemplate: t }),
  closeAll: () =>
    set({
      showNewCollection: false,
      newAlbumForCollection: null,
      editCollection: null,
      editAlbum: null,
      showCountryManagement: false,
      showGapAnalysis: false,
      showSettings: false,
      showHelp: false,
      pendingTemplate: null,
    }),
}));
