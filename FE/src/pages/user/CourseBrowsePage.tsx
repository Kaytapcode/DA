import React, { useCallback, useEffect, useState } from 'react'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { Input } from '@components/ui/Input'
import { MainLayout } from '@layouts/MainLayout'
import { useUserLanguage } from './UserShell'
import { apiClient } from '@/utils/apiClient'

// A User browses the public catalog (GET /courses/catalog) and requests to enroll; an OrgAdmin
// approves. No X-Org-Id is sent: org context is never chosen by the client.

interface BrowseCourse { id: string; title: string; description?: string | null; courseCode?: string | null }
type Status = 'Pending' | 'Approved' | 'Rejected' | 'None'

export const CourseBrowsePage: React.FC = () => {
  const isVi = useUserLanguage()
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<BrowseCourse[]>([])
  const [catalogStatus, setCatalogStatus] = useState<Record<string, Status>>({})
  const [catalogLoading, setCatalogLoading] = useState(false)

  const loadStatus = useCallback(async (courseId: string): Promise<Status> => {
    try {
      const res = await apiClient.get<Array<{ userId: string; status: Status }>>(`/courses/${courseId}/enrollments`)
      return (res.success && res.data && res.data.length > 0 ? res.data[0].status : 'None') as Status
    } catch {
      return 'None'
    }
  }, [])

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true)
    try {
      const res = await apiClient.get<BrowseCourse[]>('/courses/catalog?pageSize=100')
      const list = res.success && res.data ? res.data : []
      setCatalog(list)
      const entries = await Promise.all(list.map(async (c) => [c.id, await loadStatus(c.id)] as const))
      setCatalogStatus(Object.fromEntries(entries))
    } catch {
      setCatalog([])
    } finally {
      setCatalogLoading(false)
    }
  }, [loadStatus])

  useEffect(() => { void loadCatalog() }, [loadCatalog])

  const requestEnrollGlobal = async (courseId: string) => {
    setBusyId(courseId)
    setError(null)
    try {
      const res = await apiClient.post<{ status: Status }>(`/courses/${courseId}/enrollments/request`, {})
      if (!res.success) throw new Error(res.message || 'Request failed')
      setCatalogStatus((s) => ({ ...s, [courseId]: (res.data?.status as Status) ?? 'Pending' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Request failed')
    } finally {
      setBusyId(null)
    }
  }

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


              <Card className="p-4">
                <Input
                  data-testid="catalog-search"
                  placeholder={isVi ? 'Tìm khoá học công khai...' : 'Search the public catalog...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Card>

              {error && (
                <Card className="border border-error/30 p-4"><p className="text-sm text-error" data-testid="catalog-error">{error}</p></Card>
              )}
              {catalogLoading && (
                <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>
              )}
              {!catalogLoading && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" data-testid="catalog-grid">
                  {catalog
                    .filter((c) => { const t = search.trim().toLowerCase(); return !t || c.title.toLowerCase().includes(t) })
                    .map((course) => {
                      const status = catalogStatus[course.id] ?? 'None'
                      const canRequest = status === 'None' || status === 'Rejected'
                      return (
                        <Card key={course.id} data-testid={`catalog-course-card-${course.id}`} className="flex flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-lg font-bold text-on-surface" data-testid="catalog-course-title">{course.title}</h3>
                            <span data-testid={`catalog-status-${course.id}`}>{statusBadge(status)}</span>
                          </div>
                          <p className="mt-2 line-clamp-3 flex-1 text-sm text-on-surface-variant">
                            {course.description || (isVi ? 'Chưa có mô tả.' : 'No description.')}
                          </p>
                          <div className="mt-4 border-t border-outline-variant pt-4">
                            {canRequest ? (
                              <Button
                                size="sm"
                                className="w-full justify-center"
                                data-testid={`catalog-request-enroll-${course.id}`}
                                onClick={() => void requestEnrollGlobal(course.id)}
                                disabled={busyId === course.id}
                              >
                                {busyId === course.id ? (isVi ? 'Đang gửi...' : 'Requesting...') : (isVi ? 'Yêu cầu tham gia' : 'Request to join')}
                              </Button>
                            ) : (
                              <p className="text-center text-sm text-on-surface-variant" data-testid={`catalog-state-${course.id}`}>
                                {status === 'Approved'
                                  ? (isVi ? 'Đã ghi danh.' : 'Enrolled.')
                                  : (isVi ? 'Đang chờ duyệt.' : 'Pending approval.')}
                              </p>
                            )}
                          </div>
                        </Card>
                      )
                    })}
                </div>
              )}
        </div>
      </div>
    </MainLayout>
  )
}
