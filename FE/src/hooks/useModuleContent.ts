import { useState, useCallback } from 'react';
import { apiClient } from '@/utils/apiClient';

export interface ContentItem {
  id: string;
  title: string;
  contentType: string;
  status: string;
  orderIndex: number;
  createdAt: string;
  quizId?: string | null;
  deckId?: string | null;
  documentId?: string | null;
  videoId?: string | null;
}

export interface ModuleItem {
  id: string;
  title: string;
  description?: string;
  orderIndex: number;
  createdAt: string;
  contents?: ContentItem[];
}

interface UseModuleContentReturn {
  modules: ModuleItem[];
  isLoading: boolean;
  error: string | null;
  fetchModules: (courseId: string) => Promise<void>;
  fetchContents: (courseId: string, moduleId: string) => Promise<ContentItem[]>;
  createModule: (courseId: string, title: string, description?: string) => Promise<ModuleItem | null>;
  deleteModule: (courseId: string, moduleId: string) => Promise<void>;
  moveModule: (courseId: string, moduleId: string, newIndex: number) => Promise<void>;
  createContent: (courseId: string, moduleId: string, title: string, contentType: string) => Promise<ContentItem | null>;
  deleteContent: (courseId: string, moduleId: string, contentId: string) => Promise<void>;
  moveContent: (courseId: string, moduleId: string, contentId: string, newIndex: number) => Promise<void>;
  setContentStatus: (courseId: string, moduleId: string, contentId: string, status: 'DRAFT' | 'PUBLISHED') => Promise<void>;
  linkContent: (courseId: string, moduleId: string, contentId: string) => Promise<ContentItem | null>;
}

export const useModuleContent = (): UseModuleContentReturn => {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModules = useCallback(async (courseId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ModuleItem[]>(`/courses/${courseId}/modules`);
      if (res.success && res.data) setModules(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load modules');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchContents = useCallback(async (courseId: string, moduleId: string): Promise<ContentItem[]> => {
    try {
      const res = await apiClient.get<ContentItem[]>(`/courses/${courseId}/modules/${moduleId}/contents`);
      if (res.success && res.data) {
        setModules(prev => prev.map(m => m.id === moduleId ? { ...m, contents: res.data } : m));
        return res.data!;
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  const createModule = useCallback(async (courseId: string, title: string, description?: string): Promise<ModuleItem | null> => {
    setError(null);
    try {
      const res = await apiClient.post<ModuleItem>(`/courses/${courseId}/modules`, { title, description });
      if (res.success && res.data) {
        setModules(prev => [...prev, res.data!]);
        return res.data;
      }
      // Surface a server "success:false" instead of vanishing silently.
      setError(res.message || 'Failed to create module');
      return null;
    } catch (err: any) {
      // Surface 4xx (e.g. "Title must be between 3 and 255 characters") instead of swallowing it.
      setError(err?.message || err?.data?.message || err?.errors?.[0] || 'Failed to create module');
      return null;
    }
  }, []);

  const deleteModule = useCallback(async (courseId: string, moduleId: string) => {
    try {
      await apiClient.delete(`/courses/${courseId}/modules/${moduleId}`);
      setModules(prev => prev.filter(m => m.id !== moduleId));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete module');
    }
  }, []);

  const moveModule = useCallback(async (courseId: string, moduleId: string, newIndex: number) => {
    try {
      await apiClient.patch(`/courses/${courseId}/modules/${moduleId}/order`, { newIndex });
      setModules(prev => {
        const arr = [...prev];
        const idx = arr.findIndex(m => m.id === moduleId);
        if (idx === -1) return prev;
        const [item] = arr.splice(idx, 1);
        arr.splice(newIndex, 0, item);
        return arr.map((m, i) => ({ ...m, orderIndex: i }));
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to reorder module');
    }
  }, []);

  const createContent = useCallback(async (
    courseId: string, moduleId: string, title: string, contentType: string
  ): Promise<ContentItem | null> => {
    try {
      const res = await apiClient.post<ContentItem>(
        `/courses/${courseId}/modules/${moduleId}/contents`,
        { title, contentType }
      );
      if (res.success && res.data) {
        setModules(prev => prev.map(m => m.id === moduleId
          ? { ...m, contents: [...(m.contents ?? []), res.data!] }
          : m
        ));
        return res.data;
      }
      setError(res.message || 'Failed to create content');
      return null;
    } catch (err: any) {
      setError(err?.message || err?.data?.message || 'Failed to create content');
      return null;
    }
  }, []);

  const deleteContent = useCallback(async (courseId: string, moduleId: string, contentId: string) => {
    try {
      await apiClient.delete(`/courses/${courseId}/modules/${moduleId}/contents/${contentId}`);
      setModules(prev => prev.map(m => m.id === moduleId
        ? { ...m, contents: (m.contents ?? []).filter(c => c.id !== contentId) }
        : m
      ));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete content');
    }
  }, []);

  const moveContent = useCallback(async (courseId: string, moduleId: string, contentId: string, newIndex: number) => {
    try {
      await apiClient.patch(
        `/courses/${courseId}/modules/${moduleId}/contents/${contentId}/order`,
        { newIndex }
      );
      setModules(prev => prev.map(m => {
        if (m.id !== moduleId) return m;
        const arr = [...(m.contents ?? [])];
        const idx = arr.findIndex(c => c.id === contentId);
        if (idx === -1) return m;
        const [item] = arr.splice(idx, 1);
        arr.splice(newIndex, 0, item);
        return { ...m, contents: arr.map((c, i) => ({ ...c, orderIndex: i })) };
      }));
    } catch (err: any) {
      setError(err?.message || 'Failed to reorder content');
    }
  }, []);

  const setContentStatus = useCallback(async (
    courseId: string, moduleId: string, contentId: string, status: 'DRAFT' | 'PUBLISHED'
  ) => {
    try {
      await apiClient.patch(
        `/courses/${courseId}/modules/${moduleId}/contents/${contentId}/status`,
        { status }
      );
      setModules(prev => prev.map(m => m.id === moduleId
        ? { ...m, contents: (m.contents ?? []).map(c => c.id === contentId ? { ...c, status } : c) }
        : m
      ));
    } catch (err: any) {
      setError(err?.message || 'Failed to update status');
    }
  }, []);

  const linkContent = useCallback(async (
    courseId: string, moduleId: string, contentId: string
  ): Promise<ContentItem | null> => {
    try {
      const res = await apiClient.post<ContentItem>(
        `/courses/${courseId}/modules/${moduleId}/contents/link`,
        { contentId }
      );
      if (res.success && res.data) {
        setModules(prev => prev.map(m => m.id === moduleId
          ? { ...m, contents: [...(m.contents ?? []), res.data!] }
          : m
        ));
        return res.data;
      }
      setError(res.message || 'Failed to link content');
      return null;
    } catch (err: any) {
      setError(err?.message || err?.data?.message || 'Failed to link content');
      return null;
    }
  }, []);

  return {
    modules, isLoading, error,
    fetchModules, fetchContents,
    createModule, deleteModule, moveModule,
    createContent, deleteContent, moveContent, setContentStatus, linkContent,
  };
};
