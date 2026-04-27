import { create } from 'zustand';

export type SmartCollectionKind =
  | 'allOwned'
  | 'wantList'
  | 'notCollecting'
  | 'recentAdditions'
  | 'tradingStock'
  | 'trash';

export type Selection =
  | { type: 'none' }
  | { type: 'smart'; kind: SmartCollectionKind }
  | { type: 'collection'; id: number }
  | { type: 'album'; id: number };

interface SelectionState {
  selection: Selection;
  /** Multi-selection of stamp IDs (size 1 is the common case). */
  selectedStampIds: Set<number>;
  /** The stamp whose details show in the right pane (last single-clicked). */
  focusedStampId: number | null;

  setSelection: (s: Selection) => void;
  setSingleStamp: (id: number | null) => void;
  toggleStamp: (id: number) => void;
  setSelectedStamps: (ids: number[], focused: number | null) => void;
  clearStampSelection: () => void;
}

export const useSelection = create<SelectionState>((set) => ({
  selection: { type: 'none' },
  selectedStampIds: new Set<number>(),
  focusedStampId: null,

  setSelection: (s) =>
    set({ selection: s, selectedStampIds: new Set<number>(), focusedStampId: null }),

  setSingleStamp: (id) =>
    set({
      selectedStampIds: id == null ? new Set<number>() : new Set<number>([id]),
      focusedStampId: id,
    }),

  toggleStamp: (id) =>
    set((state) => {
      const next = new Set(state.selectedStampIds);
      let focused: number | null;
      if (next.has(id)) {
        next.delete(id);
        focused = state.focusedStampId === id ? (next.size > 0 ? [...next][next.size - 1]! : null) : state.focusedStampId;
      } else {
        next.add(id);
        focused = id;
      }
      return { selectedStampIds: next, focusedStampId: focused };
    }),

  setSelectedStamps: (ids, focused) =>
    set({ selectedStampIds: new Set(ids), focusedStampId: focused }),

  clearStampSelection: () => set({ selectedStampIds: new Set<number>(), focusedStampId: null }),
}));
