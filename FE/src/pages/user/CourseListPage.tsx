import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { MainLayout } from '@layouts/MainLayout'
import { useUserLanguage } from './UserShell'
import { apiClient } from '@/utils/apiClient'

// Mirrors Shared.Contracts.Responses.EnrolledCourseDto — the courses the user is APPROVED in.
interface EnrolledCourse {
  id: string
  title: string
  description?: string | null
  courseCode?: string | null
  role: 'Teacher' | 'Student'
  status: string
  orgId: string
}

/**
 * User "My Courses" page — lists the courses the user is actually enrolled in (real data from
 * GET /api/courses/enrolled). No hardcoded/sample data: shows a loading skeleton then either the
 * real list or an empty state linking to Browse Courses.
 */
export const CourseListPage: React.FC = () => {
  const isVi = useUserLanguage()
  const [courses, setCourses] = useState<EnrolledCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<EnrolledCourse[]>('/courses/enrolled')
      if (res.success && res.data) setCourses(res.data)
      else throw new Error(res.message || 'Failed to load courses')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  return (
    <MainLayout
      navbar={<UserNavbar title={isVi ? 'Khoá học của tôi' : 'My Courses'} />}
      sidebar={<UserSidebar />}
    >
      <div className="p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7380a0]">{isVi ? 'Khoá học' : 'Courses'}</p>
              <h2 className="mt-2 text-3xl font-black text-on-surface font-headline">{isVi ? 'Khoá học của tôi' : 'My Courses'}</h2>
              <p className="mt-2 text-on-surface-variant">
                {isVi ? 'Các khoá học bạn đã được ghi danh.' : 'Courses you are enrolled in.'}
              </p>
            </div>
            <Link
              to="/user/courses/browse"
              data-testid="my-courses-browse-link"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:bg-primary/90"
            >
              <MaterialIcon icon="travel_explore" size="xs" />
              {isVi ? 'Khám phá khoá học' : 'Browse Courses'}
            </Link>
          </div>

          {error && (
            <Card className="border border-error/30 p-4">
              <p className="text-sm text-error" data-testid="my-courses-error">{error}</p>
            </Card>
          )}

          {isLoading && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="mb-4 h-32 rounded-xl bg-surface-container-low" />
                  <div className="mb-2 h-5 w-2/3 rounded bg-surface-container-low" />
                  <div className="h-4 w-1/3 rounded bg-surface-container-low" />
                </Card>
              ))}
            </div>
          )}

          {!isLoading && !error && courses.length === 0 && (
            <Card className="p-10 text-center" data-testid="my-courses-empty">
              <MaterialIcon icon="school" className="mb-3 text-5xl text-on-surface-variant" />
              <p className="text-on-surface-variant">
                {isVi ? 'Bạn chưa được ghi danh khoá học nào.' : 'You are not enrolled in any course yet.'}
              </p>
              <Link to="/user/courses/browse" className="mt-4 inline-block text-primary underline">
                {isVi ? 'Khám phá và yêu cầu ghi danh' : 'Browse and request to enroll'}
              </Link>
            </Card>
          )}

          {!isLoading && courses.length > 0 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => (
                <Card key={course.id} data-testid={`my-course-card-${course.id}`} className="flex flex-col transition-transform hover:-translate-y-1 hover:shadow-xl">
                  <div className="mb-4 flex h-32 items-center justify-center rounded-xl bg-gradient-to-br from-[#eef2ff] to-[#f8fbff]">
                    <MaterialIcon icon="menu_book" className="text-4xl text-[#4f6cf7]" />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold text-on-surface" data-testid="my-course-title">{course.title}</h3>
                    <Badge variant={course.role === 'Teacher' ? 'warning' : 'primary'} size="sm">{course.role}</Badge>
                  </div>
                  {course.courseCode && <p className="mt-1 font-mono text-xs text-on-surface-variant">{course.courseCode}</p>}
                  <p className="mt-2 line-clamp-3 flex-1 text-sm text-on-surface-variant">
                    {course.description || (isVi ? 'Chưa có mô tả.' : 'No description.')}
                  </p>
                  <div className="mt-4 border-t border-outline-variant pt-4">
                    <Link
                      to={`/user/course/${course.id}`}
                      data-testid={`my-course-open-${course.id}`}
                      className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:bg-primary/90"
                    >
                      {isVi ? 'Mở khoá học' : 'Open Course'}
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
