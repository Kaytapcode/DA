import { useState, useCallback } from 'react';
import { apiClient, ApiResponse, PaginatedResponse } from '@/utils/apiClient';

export interface Course {
  id: string;
  orgId: string;
  title: string;
  description?: string;
  courseCode?: string;
  createdBy: string;
  createdAt: string;
}

export interface CourseList {
  id: string;
  title: string;
  description?: string;
  courseCode?: string;
  createdAt: string;
  moduleCount?: number;
}

export interface CreateCoursePayload {
  orgId: string;
  title: string;
  description?: string;
  courseCode?: string;
}

export interface UpdateCoursePayload {
  id: string;
  title: string;
  description?: string;
  courseCode?: string;
}

interface UseCourseReturn {
  courses: CourseList[];
  currentCourse: Course | null;
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  
  // Actions
  fetchCourses: (pageIndex?: number, pageSize?: number) => Promise<void>;
  fetchCourse: (id: string) => Promise<void>;
  createCourse: (data: CreateCoursePayload) => Promise<Course | null>;
  updateCourse: (data: UpdateCoursePayload) => Promise<Course | null>;
  deleteCourse: (id: string) => Promise<boolean>;
  setCurrentCourse: (course: Course | null) => void;
  clearError: () => void;
  reset: () => void;
}

export const useCourse = (): UseCourseReturn => {
  const [courses, setCourses] = useState<CourseList[]>([]);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const handleError = useCallback((err: unknown) => {
    const message =
      (err instanceof Error ? err.message : null) ||
      (typeof err === 'string' ? err : 'An error occurred');
    setError(message);
    console.error('Course error:', message);
  }, []);

  const fetchCourses = useCallback(
    async (newPageIndex = 0, newPageSize = 10) => {
      setIsLoading(true);
      setError(null);
      setPageIndex(newPageIndex);
      setPageSize(newPageSize);

      try {
        const response = await apiClient.get<PaginatedResponse<CourseList>>(
          `/courses?pageIndex=${newPageIndex}&pageSize=${newPageSize}`
        );

        if (response.success) {
          setCourses(response.data?.data ?? []);
          setTotalCount(response.data?.totalCount ?? 0);
        } else {
          throw new Error(response.message || 'Failed to fetch courses');
        }
      } catch (err) {
        handleError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [handleError]
  );

  const fetchCourse = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.get<Course>(
          `/courses/${id}`
        );

        if (response.success) {
          setCurrentCourse(response.data ?? null);
        } else {
          throw new Error(response.message || 'Failed to fetch course');
        }
      } catch (err) {
        handleError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [handleError]
  );

  const createCourse = useCallback(
    async (data: CreateCoursePayload): Promise<Course | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.post<Course>(
          '/courses',
          data
        );

        if (response.success && response.data) {
          setCurrentCourse(response.data);
          // Refresh the courses list
          await fetchCourses(0, pageSize);
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to create course');
        }
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError, fetchCourses, pageSize]
  );

  const updateCourse = useCallback(
    async (data: UpdateCoursePayload): Promise<Course | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.put<Course>(
          `/courses/${data.id}`,
          {
            title: data.title,
            description: data.description,
            courseCode: data.courseCode,
          }
        );

        if (response.success && response.data) {
          setCurrentCourse(response.data);
          // Refresh the courses list
          await fetchCourses(pageIndex, pageSize);
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to update course');
        }
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError, fetchCourses, pageIndex, pageSize]
  );

  const deleteCourse = useCallback(
    async (id: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.delete<ApiResponse>(
          `/courses/${id}`
        );

        if (response.success) {
          if (currentCourse?.id === id) {
            setCurrentCourse(null);
          }
          // Refresh the courses list
          await fetchCourses(pageIndex, pageSize);
          return true;
        } else {
          throw new Error(response.message || 'Failed to delete course');
        }
      } catch (err) {
        handleError(err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError, currentCourse?.id, fetchCourses, pageIndex, pageSize]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setCourses([]);
    setCurrentCourse(null);
    setIsLoading(false);
    setError(null);
    setTotalCount(0);
    setPageIndex(0);
    setPageSize(10);
  }, []);

  return {
    courses,
    currentCourse,
    isLoading,
    error,
    totalCount,
    pageIndex,
    pageSize,
    fetchCourses,
    fetchCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    setCurrentCourse,
    clearError,
    reset,
  };
};
