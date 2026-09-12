import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de stale time por defecto
      gcTime: 1000 * 60 * 60 * 24, // 24 horas en cache para persistencia offline
      retry: (failureCount, error: any) => {
        // No reintentar en errores 401, 403 o 404
        if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 0
    }
  }
});
