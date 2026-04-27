import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Album,
  AlbumPatchPayload,
  AppSettings,
  Collection,
  CollectionPatchPayload,
  Country,
  CountryPatchPayload,
  CustomCatalog,
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
} from '@shared/types';
import { qk } from './query';

// ---------- Queries ----------

export function useCountries() {
  return useQuery<Country[]>({
    queryKey: qk.countries,
    queryFn: () => window.hinged.countries.list(),
  });
}

export function useCollections() {
  return useQuery<Collection[]>({
    queryKey: qk.collections,
    queryFn: () => window.hinged.collections.list(),
  });
}

export function useAlbums() {
  return useQuery<Album[]>({
    queryKey: qk.albums,
    queryFn: () => window.hinged.albums.list(),
  });
}

export function useStamps() {
  return useQuery<Stamp[]>({
    queryKey: qk.stamps,
    queryFn: () => window.hinged.stamps.list(),
  });
}

// ---------- Mutations ----------

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewCollectionPayload) => window.hinged.collections.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.collections });
    },
  });
}

export function useUpdateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; patch: CollectionPatchPayload }) =>
      window.hinged.collections.update(args.id, args.patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.collections });
    },
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => window.hinged.collections.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.collections });
      void qc.invalidateQueries({ queryKey: qk.albums });
      void qc.invalidateQueries({ queryKey: qk.stamps });
    },
  });
}

export function useCreateAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewAlbumPayload) => window.hinged.albums.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.albums });
    },
  });
}

export function useUpdateAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; patch: AlbumPatchPayload }) =>
      window.hinged.albums.update(args.id, args.patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.albums });
    },
  });
}

export function useDeleteAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => window.hinged.albums.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.albums });
      void qc.invalidateQueries({ queryKey: qk.stamps });
    },
  });
}

export function useCreateStamp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewStampPayload) => window.hinged.stamps.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.stamps });
    },
  });
}

export function useUpdateStamp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; patch: StampPatchPayload }) =>
      window.hinged.stamps.update(args.id, args.patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.stamps });
    },
  });
}

export function useDeleteStamp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => window.hinged.stamps.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.stamps });
      void qc.invalidateQueries({ queryKey: qk.trashedStamps });
    },
  });
}

export function useBulkUpdateStamps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { ids: number[]; patch: StampPatchPayload }) =>
      window.hinged.stamps.bulkUpdate(args.ids, args.patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.stamps });
    },
  });
}

export function useBulkDeleteStamps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => window.hinged.stamps.bulkDelete(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.stamps });
      void qc.invalidateQueries({ queryKey: qk.trashedStamps });
    },
  });
}

export function useTrashedStamps() {
  return useQuery<Stamp[]>({
    queryKey: qk.trashedStamps,
    queryFn: () => window.hinged.stamps.listTrashed(),
  });
}

export function useRestoreStamps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => window.hinged.stamps.restore(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.stamps });
      void qc.invalidateQueries({ queryKey: qk.trashedStamps });
    },
  });
}

export function useEmptyTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => window.hinged.stamps.emptyTrash(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.trashedStamps });
    },
  });
}

// ---------- Countries ----------

export function useCreateCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewCountryPayload) => window.hinged.countries.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.countries });
    },
  });
}

export function useUpdateCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; patch: CountryPatchPayload }) =>
      window.hinged.countries.update(args.id, args.patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.countries });
    },
  });
}

export function useDeleteCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => window.hinged.countries.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.countries });
      void qc.invalidateQueries({ queryKey: qk.collections });
      void qc.invalidateQueries({ queryKey: qk.stamps });
    },
  });
}

// ---------- Settings ----------

export function useSettings() {
  return useQuery<AppSettings>({
    queryKey: qk.settings,
    queryFn: () => window.hinged.settings.get(),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<AppSettings>) => window.hinged.settings.set(patch),
    onSuccess: (next) => {
      qc.setQueryData(qk.settings, next);
    },
  });
}

// ---------- Custom Catalogs ----------

export function useCustomCatalogs() {
  return useQuery<CustomCatalog[]>({
    queryKey: qk.customCatalogs,
    queryFn: () => window.hinged.customCatalogs.list(),
  });
}

export function useCreateCustomCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => window.hinged.customCatalogs.create(name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.customCatalogs });
    },
  });
}

export function useUpdateCustomCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; name: string }) =>
      window.hinged.customCatalogs.update(args.id, args.name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.customCatalogs });
    },
  });
}

export function useDeleteCustomCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => window.hinged.customCatalogs.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.customCatalogs });
    },
  });
}

// ---------- Series ----------

export function useSeries() {
  return useQuery<Series[]>({
    queryKey: qk.series,
    queryFn: () => window.hinged.series.list(),
  });
}

export function useSeriesWithCounts() {
  return useQuery<SeriesWithCount[]>({
    queryKey: qk.seriesWithCounts,
    queryFn: () => window.hinged.series.listWithCounts(),
  });
}

export function useCreateSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewSeriesPayload) => window.hinged.series.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.series });
      void qc.invalidateQueries({ queryKey: qk.seriesWithCounts });
    },
  });
}

export function useUpdateSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; patch: SeriesPatchPayload }) =>
      window.hinged.series.update(args.id, args.patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.series });
      void qc.invalidateQueries({ queryKey: qk.seriesWithCounts });
    },
  });
}

export function useDeleteSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => window.hinged.series.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.series });
      void qc.invalidateQueries({ queryKey: qk.seriesWithCounts });
      // Stamps that referenced the deleted series now have null seriesId
      void qc.invalidateQueries({ queryKey: qk.stamps });
    },
  });
}
