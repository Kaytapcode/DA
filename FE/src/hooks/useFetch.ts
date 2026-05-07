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
  isEmpty: boolean;
}

interface UseFetchReturn<T> extends UseFetchState<T> {
  fetch: (url: string, method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', payload?: any) => Promise<T | null>;
  refetch: () => Promise<T | null>;
  reset: () => void;
}

export const useFetch = <T = any>(
  initialUrl?: string,
  options: UseFetchOptions = { immediate: true, manual: false }
): UseFetchReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState(initialUrl || '');

  const fetch = useCallback(
    async (
      fetchUrl: string,
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
      payload?: any
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

        if (response.success && response.data) {
          setData(response.data);
          return response.data;
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
    setIsLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (options.immediate && !options.manual && initialUrl) {
      setLastUrl(initialUrl);
      fetch(initialUrl, 'GET');
    }
  }, [initialUrl, options.immediate, options.manual, fetch]);

  return {
    data,
    isLoading,
    error,
    isEmpty: !data,
    fetch: async (fetchUrl, method = 'GET', payload) => {
      setLastUrl(fetchUrl);
      return fetch(fetchUrl, method, payload);
    },
    refetch,
    reset,
  };
};
