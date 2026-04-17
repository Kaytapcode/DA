import React from 'react'
import { OrgAdminNavbar } from '@components/layout/orgadmin/OrgAdminNavbar'
import { OrgAdminSidebar } from '@components/layout/orgadmin/OrgAdminSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { MainLayout } from '@layouts/MainLayout'

/**
 * OrgAdmin Dashboard Page
 */
export const OrgAdminDashboardPage: React.FC = () => {
  return (
    <MainLayout
      navbar={<OrgAdminNavbar title="Administration Dashboard" />}
      sidebar={<OrgAdminSidebar />}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-on-surface mb-2 font-headline">Organization Overview</h2>
            <p className="text-on-surface-variant">Manage courses, members, and organization settings</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[
              { label: 'Total Members', value: '1,234', icon: 'people', change: '+12%' },
              { label: 'Active Courses', value: '24', icon: 'school', change: '+3' },
              { label: 'Course Completions', value: '456', icon: 'done_all', change: '+28%' },
              { label: 'Avg. Satisfaction', value: '4.8/5', icon: 'star', change: '+0.2' },
            ].map((stat, i) => (
              <Card key={i}>
                <div className="flex items-center justify-between mb-4">
                  <MaterialIcon icon={stat.icon} className="text-2xl text-primary" />
                  <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">
                    {stat.change}
                  </span>
                </div>
                <p className="text-2xl font-bold text-on-surface">{stat.value}</p>
                <p className="text-sm text-on-surface-variant">{stat.label}</p>
              </Card>
            ))}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Course Management */}
            <div className="lg:col-span-2">
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-on-surface">Recent Courses</h3>
                  <Button size="sm">+ Create Course</Button>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer">
                      <div className="flex-1">
                        <p className="font-medium text-on-surface">Course Title {i}</p>
                        <p className="text-sm text-on-surface-variant">42 enrollments • Created 2 days ago</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-on-surface">85%</p>
                        <p className="text-xs text-on-surface-variant">completion</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <h3 className="text-xl font-bold text-on-surface mb-6">Quick Actions</h3>
              <div className="space-y-3">
                <Button className="w-full justify-start" variant="secondary">
                  <MaterialIcon icon="add_circle" className="mr-2" />
                  Add Member
                </Button>
                <Button className="w-full justify-start" variant="secondary">
                  <MaterialIcon icon="create" className="mr-2" />
                  Create Course
                </Button>
                <Button className="w-full justify-start" variant="secondary">
                  <MaterialIcon icon="assessment" className="mr-2" />
                  View Reports
                </Button>
                <Button className="w-full justify-start" variant="secondary">
                  <MaterialIcon icon="mail" className="mr-2" />
                  Send Message
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
