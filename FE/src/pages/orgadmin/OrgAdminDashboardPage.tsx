import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { OrgAdminNavbar } from '@components/layout/orgadmin/OrgAdminNavbar'
import { OrgAdminSidebar } from '@components/layout/orgadmin/OrgAdminSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { MainLayout } from '@layouts/MainLayout'
import { useOrgContext } from '@/contexts/OrgContext'
import { useOrgAnalytics } from '@/hooks/useAnalytics'
import { useCourse } from '@/hooks/useCourse'

export const OrgAdminDashboardPage: React.FC = () => {
  const { org } = useOrgContext()
  const orgId = org?.id ?? localStorage.getItem('org_id')
  const { data, isLoading: analyticsLoading, error: analyticsError } = useOrgAnalytics(orgId)
  const { courses, isLoading: coursesLoading, fetchCourses } = useCourse()

  useEffect(() => {
    void fetchCourses(0, 5)
  }, [fetchCourses])

  const stat = (n: number | undefined | null) => (n ?? 0).toLocaleString()

  const stats = [
    { label: 'Total Members', value: stat(data.members?.totalMembers), icon: 'people' },
    { label: 'Active Courses', value: stat(data.content?.activeCourseCount), icon: 'school' },
    { label: 'Completed Attempts', value: stat(data.content?.completedAttempts), icon: 'done_all' },
    { label: 'Recent Joins (30d)', value: stat(data.members?.recentJoins), icon: 'person_add' },
  ]

  return (
    <MainLayout
      navbar={<OrgAdminNavbar title="Administration Dashboard" />}
      sidebar={<OrgAdminSidebar />}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-on-surface mb-2 font-headline" data-testid="orgadmin-dashboard-heading">
              Organization Overview
            </h2>
            <p className="text-on-surface-variant">Manage courses, members, and organization settings</p>
          </div>

          {!orgId && (
            <Card className="mb-6 p-4">
              <p className="text-sm text-on-surface-variant">No organization context. Please log out and log in again.</p>
            </Card>
          )}
          {analyticsError && !analyticsLoading && (
            <p className="text-sm text-error mb-3">{analyticsError}</p>
          )}

          {/* Quick Stats — sourced from real API */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12" data-testid="orgadmin-stats-grid">
            {stats.map((s) => (
              <Card key={s.label} data-testid={`orgadmin-stat-${s.label.toLowerCase().replace(/[\s()]+/g, '-')}`}>
                <div className="flex items-center justify-between mb-4">
                  <MaterialIcon icon={s.icon} className="text-2xl text-primary" />
                </div>
                <p className="text-2xl font-bold text-on-surface">
                  {analyticsLoading ? '…' : s.value}
                </p>
                <p className="text-sm text-on-surface-variant">{s.label}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Courses — real data */}
            <div className="lg:col-span-2">
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-on-surface">Recent Courses</h3>
                  <Link to="/admin/courses">
                    <Button size="sm" variant="secondary">View All</Button>
                  </Link>
                </div>
                {coursesLoading && (
                  <div className="flex justify-center py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
                  </div>
                )}
                {!coursesLoading && courses.length === 0 && (
                  <p className="text-sm text-on-surface-variant py-4 text-center">
                    No courses yet. <Link to="/admin/courses" className="text-primary underline">Create your first course.</Link>
                  </p>
                )}
                {!coursesLoading && courses.length > 0 && (
                  <div className="space-y-3" data-testid="orgadmin-recent-courses">
                    {courses.slice(0, 5).map((course) => (
                      <Link
                        key={course.id}
                        to={`/admin/courses/${course.id}/curriculum`}
                        className="flex items-center gap-4 p-4 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors"
                        data-testid="orgadmin-recent-course-item"
                      >
                        <MaterialIcon icon="school" className="text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-on-surface truncate">{course.title}</p>
                          <p className="text-sm text-on-surface-variant">
                            {course.courseCode && <span className="mr-2">{course.courseCode}</span>}
                            {course.moduleCount != null && `${course.moduleCount} modules`}
                          </p>
                        </div>
                        <MaterialIcon icon="chevron_right" className="text-on-surface-variant flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <h3 className="text-xl font-bold text-on-surface mb-6">Quick Actions</h3>

              <div className="flex flex-col gap-3">
                <Link to="/admin/courses">
                  <Button className="w-full justify-start" variant="secondary">
                    <MaterialIcon icon="add_circle" className="mr-2" />
                    Create Course
                  </Button>
                </Link>

                <Link to="/admin/members">
                  <Button className="w-full justify-start" variant="secondary">
                    <MaterialIcon icon="people" className="mr-2" />
                    Manage Members
                  </Button>
                </Link>


            </div>

            
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
