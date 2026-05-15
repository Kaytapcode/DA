import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/utils/apiClient'

// Mirrors Content.Api/Controllers/AnalyticsController.SysAdminOverviewDto
export interface SysAdminContentOverview {
  totalCourses: number
  totalModules: number
  totalQuizzes: number
  totalFlashcardDecks: number
  totalVideos: number
  totalDocuments: number
  totalQuizAttempts: number
}

// Mirrors Organization.Api/Controllers/AnalyticsController.SysAdminOrgsOverviewDto
export interface SysAdminOrgsOverview {
  totalOrgs: number
  totalMembers: number
  recentJoins: number
}

// Mirrors Content.Api/Controllers/AnalyticsController.OrgOverviewDto
export interface OrgContentOverview {
  orgId: string
  courseCount: number
  activeCourseCount: number
  moduleCount: number
  completedAttempts: number
  recentEnrollments: number
}

// Mirrors Organization.Api/Controllers/AnalyticsController.OrgMembersOverviewDto
export interface OrgMembersOverview {
  orgId: string
  totalMembers: number
  teacherCount: number
  studentCount: number
  recentJoins: number
}

export interface SysAdminCombined {
  content: SysAdminContentOverview | null
  orgs: SysAdminOrgsOverview | null
}

export interface OrgCombined {
  content: OrgContentOverview | null
  members: OrgMembersOverview | null
}

// Fan-out helper so the FE can render the SysAdmin dashboard with one hook.
export const useSysAdminAnalytics = () => {
  const [data, setData] = useState<SysAdminCombined>({ content: null, orgs: null })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [contentRes, orgsRes] = await Promise.all([
        apiClient.get<SysAdminContentOverview>('/analytics/sysadmin'),
        apiClient.get<SysAdminOrgsOverview>('/analytics/sysadmin/orgs'),
      ])
      setData({
        content: contentRes.success ? contentRes.data ?? null : null,
        orgs: orgsRes.success ? orgsRes.data ?? null : null,
      })
      if (!contentRes.success && !orgsRes.success) {
        throw new Error(contentRes.message || orgsRes.message || 'Failed to load analytics')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])
  return { data, isLoading, error, refresh }
}

export const useOrgAnalytics = (orgId: string | null) => {
  const [data, setData] = useState<OrgCombined>({ content: null, members: null })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!orgId) return
    setIsLoading(true)
    setError(null)
    try {
      const [contentRes, membersRes] = await Promise.all([
        apiClient.get<OrgContentOverview>(`/analytics/orgs/${orgId}`),
        apiClient.get<OrgMembersOverview>(`/analytics/orgs/${orgId}/members`),
      ])
      setData({
        content: contentRes.success ? contentRes.data ?? null : null,
        members: membersRes.success ? membersRes.data ?? null : null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load org analytics')
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => { void refresh() }, [refresh])
  return { data, isLoading, error, refresh }
}
