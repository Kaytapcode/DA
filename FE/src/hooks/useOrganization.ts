import { useState, useCallback } from 'react';
import { apiClient, ApiResponse, PaginatedResponse } from '@/utils/apiClient';

export interface Organization {
  id: string;
  name: string;
  address?: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  memberCount?: number;
}

export interface OrganizationList {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
  createdAt: string;
}

export interface CreateOrganizationPayload {
  name: string;
  address?: string;
  slug: string;
}

export interface UpdateOrganizationPayload {
  id: string;
  name: string;
  address?: string;
  slug?: string;
}

interface UseOrganizationReturn {
  organizations: OrganizationList[];
  currentOrganization: Organization | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchOrganizations: (pageIndex?: number, pageSize?: number) => Promise<void>;
  fetchOrganization: (id: string) => Promise<void>;
  createOrganization: (data: CreateOrganizationPayload) => Promise<Organization | null>;
  updateOrganization: (data: UpdateOrganizationPayload) => Promise<Organization | null>;
  deleteOrganization: (id: string) => Promise<boolean>;
  setCurrentOrganization: (org: Organization | null) => void;
  clearError: () => void;
}

export const useOrganization = (): UseOrganizationReturn => {
  const [organizations, setOrganizations] = useState<OrganizationList[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((err: unknown) => {
    const message =
      (err instanceof Error ? err.message : null) ||
      (typeof err === 'string' ? err : 'An error occurred');
    setError(message);
    console.error('Organization error:', message);
  }, []);

  const fetchOrganizations = useCallback(
    async (pageIndex = 0, pageSize = 10) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.get<PaginatedResponse<OrganizationList>>(
          `/organizations?pageIndex=${pageIndex}&pageSize=${pageSize}`
        );

        if (response.success) {
          setOrganizations(response.data?.data ?? []);
        } else {
          throw new Error(response.message || 'Failed to fetch organizations');
        }
      } catch (err) {
        handleError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [handleError]
  );

  const fetchOrganization = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.get<Organization>(
          `/organizations/${id}`
        );

        if (response.success) {
          setCurrentOrganization(response.data ?? null);
        } else {
          throw new Error(response.message || 'Failed to fetch organization');
        }
      } catch (err) {
        handleError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [handleError]
  );

  const createOrganization = useCallback(
    async (data: CreateOrganizationPayload): Promise<Organization | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.post<Organization>(
          '/organizations',
          data
        );

        if (response.success && response.data) {
          setCurrentOrganization(response.data ?? null);
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to create organization');
        }
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError]
  );

  const updateOrganization = useCallback(
    async (data: UpdateOrganizationPayload): Promise<Organization | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.put<Organization>(
          `/organizations/${data.id}`,
          {
            name: data.name,
            address: data.address,
            slug: data.slug,
          }
        );

        if (response.success && response.data) {
          setCurrentOrganization(response.data);
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to update organization');
        }
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError]
  );

  const deleteOrganization = useCallback(
    async (id: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.delete<ApiResponse>(
          `/organizations/${id}`
        );

        if (response.success) {
          if (currentOrganization?.id === id) {
            setCurrentOrganization(null);
          }
          return true;
        } else {
          throw new Error(response.message || 'Failed to delete organization');
        }
      } catch (err) {
        handleError(err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError, currentOrganization?.id]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    organizations,
    currentOrganization,
    isLoading,
    error,
    fetchOrganizations,
    fetchOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    setCurrentOrganization,
    clearError,
  };
};
