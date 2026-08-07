import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { apiClient } from '@/utils/apiClient';

export interface OrgInfo {
  id: string;
  slug: string;
  name: string;
}

export interface OrgContextType {
  org: OrgInfo | null;
  isLoading: boolean;
  setOrg: (org: OrgInfo | null) => void;
  resolveBySlug: (slug: string) => Promise<OrgInfo | null>;
  clearOrg: () => void;
}

const OrgContext = createContext<OrgContextType | null>(null);

const ORG_STORAGE_KEY = 'current_org';

export const OrgProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [org, setOrgState] = useState<OrgInfo | null>(() => {
    try {
      const stored = localStorage.getItem(ORG_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (org) {
      localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(org));
      localStorage.setItem('org_id', org.id);
      localStorage.setItem('org_slug', org.slug);
    }
    // Don't clear on null here — clearOrg() handles explicit removal.
    // Clearing on null caused a race: login() sets org_id, then this effect
    // (org=null at init) would immediately remove it before pages could read it.
  }, [org]);

  const setOrg = useCallback((newOrg: OrgInfo | null) => {
    setOrgState(newOrg);
  }, []);

  const resolveBySlug = useCallback(async (slug: string): Promise<OrgInfo | null> => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<{ id: string; name: string; slug: string }>(
        `/organizations/slug/${slug}`
      );
      if (response.success && response.data) {
        const orgInfo: OrgInfo = {
          id: response.data.id,
          slug: response.data.slug,
          name: response.data.name,
        };
        setOrgState(orgInfo);
        return orgInfo;
      }
      return null;
    } catch {
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearOrg = useCallback(() => {
    setOrgState(null);
    localStorage.removeItem(ORG_STORAGE_KEY);
    localStorage.removeItem('org_id');
    localStorage.removeItem('org_slug');
  }, []);

  return (
    <OrgContext.Provider value={{ org, isLoading, setOrg, resolveBySlug, clearOrg }}>
      {children}
    </OrgContext.Provider>
  );
};

export const useOrgContext = (): OrgContextType => {
  const context = useContext(OrgContext);
  if (!context) throw new Error('useOrgContext must be used within OrgProvider');
  return context;
};

export default OrgContext;
