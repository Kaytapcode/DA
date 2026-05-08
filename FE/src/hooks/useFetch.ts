import { useState, useCallback, useEffect } from 'react';
import { apiClient, ApiResponse } from '@/utils/apiClient';
import { AxiosError } from 'axios';

interface UseFetchOptions {
  immediate?: boolean;
  manual?: boolean;
}

interface UseFetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  // true only when a request succeeded and returned no data (null/undefined/empty array)
  isEmpty: boolean;
}

interface UseFetchReturn<T> extends UseFetchState<T> {
  fetch: (url: string, method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', payload?: unknown) => Promise<T | null>;
  refetch: () => Promise<T | null>;
  reset: () => void;
}

export const useFetch = <T = unknown>(
  initialUrl?: string,
  options: UseFetchOptions = { immediate: true, manual: false }
): UseFetchReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lastUrl, setLastUrl] = useState(initialUrl || '');

  const fetch = useCallback(
    async (
      fetchUrl: string,
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
      payload?: unknown
    ): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        let response: ApiResponse<T>;

        switch (method) {
          case 'POST':
            response = await apiClient.post(fetchUrl, payload);
            break;
          case 'PUT':
            response = await apiClient.put(fetchUrl, payload);
            break;
          case 'PATCH':
            response = await apiClient.patch(fetchUrl, payload);
            break;
          case 'DELETE':
            response = await apiClient.delete(fetchUrl);
            break;
          case 'GET':
          default:
            response = await apiClient.get(fetchUrl);
            break;
        }

        if (response.success) {
          const result = response.data ?? null;
          setData(result as T | null);
          setHasLoaded(true);
          return result as T | null;
        } else {
          throw new Error(response.message || 'Request failed');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : (err as AxiosError)?.message || 'An error occurred';
        setError(errorMessage);
        console.error(`Fetch error from ${fetchUrl}:`, errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const refetch = useCallback(async () => {
    if (!lastUrl) return null;
    return fetch(lastUrl, 'GET');
  }, [lastUrl, fetch]);

  const reset = useCallback(() => {
    setData(null);
    setHasLoaded(false);
    setIsLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (options.immediate && !options.manual && initialUrl) {
      setLastUrl(initialUrl);
      fetch(initialUrl, 'GET');
    }
  }, [initialUrl, options.immediate, options.manual, fetch]);

  const isEmpty = hasLoaded && (
    data === null ||
    data === undefined ||
    (Array.isArray(data) && data.length === 0)
  );

  return {
    data,
    isLoading,
    error,
    isEmpty,
    fetch: async (fetchUrl, method = 'GET', fetchPayload) => {
      setLastUrl(fetchUrl);
      return fetch(fetchUrl, method, fetchPayload);
    },
    refetch,
    reset,
  };
};
