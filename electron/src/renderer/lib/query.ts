import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const qk = {
  countries: ['countries'] as const,
  collections: ['collections'] as const,
  albums: ['albums'] as const,
  stamps: ['stamps'] as const,
  trashedStamps: ['stamps', 'trashed'] as const,
  settings: ['settings'] as const,
  customCatalogs: ['customCatalogs'] as const,
};
