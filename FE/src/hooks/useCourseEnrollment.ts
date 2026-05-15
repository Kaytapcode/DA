import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/utils/apiClient'

// Mirrors Shared.Contracts.Responses.CourseEnrollmentResponseDto.
export interface CourseEnrollment {
  id: string
  courseId: string
  userId: string
  role: 'Teacher' | 'Student'
  enrolledAt: string
}

export const useCourseEnrollment = (courseId: string | null) => {
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!courseId) {
      setEnrollments([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<CourseEnrollment[]>(`/courses/${courseId}/enrollments`)
      if (res.success && res.data) setEnrollments(res.data)
      else throw new Error(res.message || 'Failed to load enrollments')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load enrollments')
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  useEffect(() => { void refresh() }, [refresh])

  const create = useCallback(
    async (userId: string, role: 'Teacher' | 'Student') => {
      if (!courseId) return false
      try {
        const res = await apiClient.post(`/courses/${courseId}/enrollments`, { userId, role })
        if (!res.success) throw new Error(res.message || 'Failed to enroll user')
        await refresh()
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to enroll user')
        return false
      }
    },
    [courseId, refresh]
  )

  const updateRole = useCallback(
    async (userId: string, role: 'Teacher' | 'Student') => {
      if (!courseId) return false
      try {
        const res = await apiClient.patch(`/courses/${courseId}/enrollments/${userId}`, { role })
        if (!res.success) throw new Error(res.message || 'Failed to update role')
        await refresh()
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update role')
        return false
      }
    },
    [courseId, refresh]
  )

  const remove = useCallback(
    async (userId: string) => {
      if (!courseId) return false
      try {
        const res = await apiClient.delete(`/courses/${courseId}/enrollments/${userId}`)
        if (!res.success) throw new Error(res.message || 'Failed to remove enrollment')
        await refresh()
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove enrollment')
        return false
      }
    },
    [courseId, refresh]
  )

  return { enrollments, isLoading, error, refresh, create, updateRole, remove }
}
