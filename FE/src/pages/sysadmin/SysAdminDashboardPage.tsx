import { SysAdminNavbar } from '@components/layout/sysadmin/SysAdminNavbar'
import { SysAdminSidebar } from '@components/layout/sysadmin/SysAdminSidebar'
import { Card } from '@components/ui/Card'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { MainLayout } from '@layouts/MainLayout'

/**
 * SysAdmin Dashboard Page
 */
export const SysAdminDashboardPage: React.FC = () => {
  const systemStats = [
    { label: 'Active Orgs', value: '45', icon: 'business', trend: 'up' },
    { label: 'Total Users', value: '12,456', icon: 'people', trend: 'up' },
    { label: 'Storage Used', value: '482 GB', icon: 'storage', trend: 'up' },
    { label: 'System Uptime', value: '99.97%', icon: 'cloud_done', trend: 'stable' },
  ]

  const recentActivities = [
    { type: 'org_created', message: 'New organization created', timestamp: '2 hours ago' },
    { type: 'user_signup', message: '125 new users signed up', timestamp: '1 hour ago' },
    { type: 'course_published', message: '5 new courses published', timestamp: '30 minutes ago' },
    { type: 'error', message: 'High CPU usage on server 3', timestamp: '15 minutes ago' },
  ]

  return (
    <MainLayout
      navbar={<SysAdminNavbar title="System Administration" />}
      sidebar={<SysAdminSidebar />}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-on-surface mb-2 font-headline">System Overview</h2>
            <p className="text-on-surface-variant">Monitor platform health and manage resources</p>
          </div>

          {/* System Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {systemStats.map((stat, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-3xl font-bold text-on-surface mb-2">{stat.value}</p>
                    <p className="text-sm text-on-surface-variant">{stat.label}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.trend === 'up' ? 'bg-green-100' : 'bg-blue-100'}`}>
                    <MaterialIcon
                      icon={stat.trend === 'up' ? 'trending_up' : 'check_circle'}
                      className={stat.trend === 'up' ? 'text-green-600' : 'text-blue-600'}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <Card>
                <h3 className="text-xl font-bold text-on-surface mb-6">Recent Activity</h3>
                <div className="space-y-4">
                  {recentActivities.map((activity, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 bg-surface-container-low rounded-lg">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${
                        activity.type === 'error' ? 'bg-error/10' : 'bg-primary/10'
                      }`}>
                        <MaterialIcon
                          icon={activity.type === 'error' ? 'error_outline' : 'info'}
                          className={activity.type === 'error' ? 'text-error' : 'text-primary'}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-on-surface">{activity.message}</p>
                        <p className="text-xs text-on-surface-variant">{activity.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* System Health */}
            <Card>
              <h3 className="text-xl font-bold text-on-surface mb-6">System Health</h3>
              <div className="space-y-4">
                {[
                  { label: 'CPU Usage', value: 45, status: 'good' },
                  { label: 'Memory', value: 68, status: 'good' },
                  { label: 'Disk I/O', value: 32, status: 'good' },
                  { label: 'API Response', value: 125, status: 'good' },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-on-surface">{item.label}</span>
                      <span className="text-xs font-bold text-on-surface">{item.value}%</span>
                    </div>
                    <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.status === 'good' ? 'bg-green-500' : 'bg-warning'}`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
