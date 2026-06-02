import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { Input } from '@components/ui/Input'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { MainLayout } from '@layouts/MainLayout'
import { useUserLanguage } from './UserShell'
import { apiClient } from '@/utils/apiClient'

// Requirement #5: a User browses the courses of an organization they belong to and requests to
// enroll; an OrgAdmin approves. We resolve the user's orgs from GET /api/organizations/mine (no
// reliance on a globally-selected org), let them pick one, and load that org's courses with an
// explicit X-Org-Id header so the request works regardless of global org context.

interface MyOrg { id: string; name: string; slug: string; role: string }
interface BrowseCourse { id: string; title: string; description?: string | null; courseCode?: string | null }
type Status = 'Pending' | 'Approved' | 'Rejected' | 'None'

export const CourseBrowsePage: React.FC = () => {
  const isVi = useUserLanguage()
  const [orgs, setOrgs] = useState<MyOrg[]>([])
  const [orgId, setOrgId] = useState<string>('')
  const [courses, setCourses] = useState<BrowseCourse[]>([])
  const [statuses, setStatuses] = useState<Record<string, Status>>({})
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  // Per-request org header so this page never depends on the global OrgContext.
  const orgHeader = useCallback((id: string) => ({ headers: { 'X-Org-Id': id } }), [])

  useEffect(() => {
    setIsLoadingOrgs(true)
    apiClient.get<MyOrg[]>('/organizations/mine')
      .then((res) => {
        const list = res.success && res.data ? res.data : []
        setOrgs(list)
        if (list.length > 0) setOrgId(list[0].id)
      })
      .catch(() => setError(isVi ? 'Không thể tải tổ chức của bạn.' : 'Failed to load your organizations.'))
      .finally(() => setIsLoadingOrgs(false))
  }, [isVi])

  const loadStatus = useCallback(async (id: string, courseId: string): Promise<Status> => {
    try {
      const res = await apiClient.get<Array<{ userId: string; status: Status }>>(
        `/courses/${courseId}/enrollments`, orgHeader(id)
      )
      const mine = res.success && res.data && res.data.length > 0 ? res.data[0] : null
      return (mine?.status as Status) ?? 'None'
    } catch {
      return 'None'
    }
  }, [orgHeader])

  const loadCourses = useCallback(async (id: string) => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const res = (await apiClient.get<BrowseCourse[]>(`/courses?pageIndex=0&pageSize=100`, orgHeader(id))) as { data?: BrowseCourse[] }
      const list = res.data ?? []
      setCourses(list)
      const entries = await Promise.all(list.map(async (c) => [c.id, await loadStatus(id, c.id)] as const))
      setStatuses(Object.fromEntries(entries))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses')
    } finally {
      setIsLoading(false)
    }
  }, [orgHeader, loadStatus])

  useEffect(() => { if (orgId) void loadCourses(orgId) }, [orgId, loadCourses])

  const requestEnroll = async (courseId: string) => {
    setBusyId(courseId)
    setError(null)
    try {
      const res = await apiClient.post<{ status: Status }>(`/courses/${courseId}/enrollments/request`, {}, orgHeader(orgId))
      if (!res.success) throw new Error(res.message || 'Request failed')
      setStatuses((s) => ({ ...s, [courseId]: (res.data?.status as Status) ?? 'Pending' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusyId(null)
    }
  }

  const filtered = courses.filter((c) => {
    const t = search.trim().toLowerCase()
    if (!t) return true
    return c.title.toLowerCase().includes(t) || (c.courseCode ?? '').toLowerCase().includes(t)
  })

  const statusBadge = (s: Status) => {
    if (s === 'Approved') return <Badge variant="success" size="sm">{isVi ? 'Đã ghi danh' : 'Enrolled'}</Badge>
    if (s === 'Pending') return <Badge variant="warning" size="sm">{isVi ? 'Đang chờ duyệt' : 'Pending approval'}</Badge>
    if (s === 'Rejected') return <Badge variant="secondary" size="sm">{isVi ? 'Đã bị từ chối' : 'Rejected'}</Badge>
    return null
  }

  return (
    <MainLayout
      navbar={<UserNavbar title={isVi ? 'Khám phá khoá học' : 'Browse Courses'} />}
      sidebar={<UserSidebar />}
    >
      <div className="p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-on-surface font-headline">
              {isVi ? 'Khám phá khoá học' : 'Browse Courses'}
            </h2>
            <p className="mt-2 text-on-surface-variant">
              {isVi
                ? 'Tìm khoá học trong tổ chức của bạn và gửi yêu cầu ghi danh. Quản trị viên sẽ duyệt yêu cầu.'
                : 'Find courses in your organization and request to enroll. An OrgAdmin will approve your request.'}
            </p>
          </div>

          {isLoadingOrgs && (
            <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>
          )}

          {!isLoadingOrgs && orgs.length === 0 && (
            <Card className="p-8 text-center" data-testid="browse-no-org">
              <MaterialIcon icon="domain" className="mb-3 text-5xl text-on-surface-variant" />
              <p className="text-on-surface-variant">
                {isVi ? 'Bạn chưa tham gia tổ chức nào.' : 'You have not joined any organization yet.'}
              </p>
              <Link to="/user/organizations" data-testid="browse-join-org-link" className="mt-4 inline-block text-primary underline">
                {isVi ? 'Tham gia một tổ chức' : 'Join an organization'}
              </Link>
            </Card>
          )}

          {!isLoadingOrgs && orgs.length > 0 && (
            <>
              <Card className="flex flex-wrap items-center gap-4 p-4">
                {orgs.length > 1 && (
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-on-surface-variant">{isVi ? 'Tổ chức:' : 'Organization:'}</span>
                    <select
                      data-testid="browse-org-select"
                      className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                      value={orgId}
                      onChange={(e) => setOrgId(e.target.value)}
                    >
                      {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </label>
                )}
                <Input
                  data-testid="course-browse-search"
                  placeholder={isVi ? 'Tìm theo tên hoặc mã khoá học...' : 'Search by title or course code...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 min-w-[220px]"
                />
              </Card>

              {error && (
                <Card className="border border-error/30 p-4"><p className="text-sm text-error" data-testid="browse-error">{error}</p></Card>
              )}

              {isLoading && (
                <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>
              )}

              {!isLoading && filtered.length === 0 && (
                <Card className="p-8 text-center">
                  <MaterialIcon icon="school" className="mb-3 text-5xl text-on-surface-variant" />
                  <p className="text-on-surface-variant" data-testid="course-browse-empty">
                    {isVi ? 'Không có khoá học nào trong tổ chức này.' : 'No courses available in this organization.'}
                  </p>
                </Card>
              )}

              {!isLoading && filtered.length > 0 && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((course) => {
                    const status = statuses[course.id] ?? 'None'
                    const canRequest = status === 'None' || status === 'Rejected'
                    return (
                      <Card key={course.id} data-testid={`course-browse-card-${course.id}`} className="flex flex-col">
                        <div className="mb-3 flex h-28 items-center justify-center rounded-xl bg-gradient-to-br from-[#eef2ff] to-[#f8fbff]">
                          <MaterialIcon icon="menu_book" className="text-4xl text-[#4f6cf7]" />
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-lg font-bold text-on-surface" data-testid="course-browse-title">{course.title}</h3>
                          <span data-testid={`course-enroll-status-${course.id}`}>{statusBadge(status)}</span>
                        </div>
                        {course.courseCode && <p className="mt-1 font-mono text-xs text-on-surface-variant">{course.courseCode}</p>}
                        <p className="mt-2 line-clamp-3 flex-1 text-sm text-on-surface-variant">
                          {course.description || (isVi ? 'Chưa có mô tả.' : 'No description.')}
                        </p>
                        <div className="mt-4 border-t border-outline-variant pt-4">
                          {canRequest ? (
                            <Button
                              size="sm"
                              className="w-full justify-center"
                              data-testid={`course-request-enroll-${course.id}`}
                              onClick={() => void requestEnroll(course.id)}
                              disabled={busyId === course.id}
                            >
                              {busyId === course.id
                                ? (isVi ? 'Đang gửi...' : 'Requesting...')
                                : (isVi ? 'Yêu cầu ghi danh' : 'Request to enroll')}
                            </Button>
                          ) : (
                            <p className="text-center text-sm text-on-surface-variant" data-testid={`course-enroll-state-${course.id}`}>
                              {status === 'Approved'
                                ? (isVi ? 'Bạn đã ghi danh khoá học này.' : 'You are enrolled in this course.')
                                : (isVi ? 'Yêu cầu đang chờ quản trị viên duyệt.' : 'Request awaiting OrgAdmin approval.')}
                            </p>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
