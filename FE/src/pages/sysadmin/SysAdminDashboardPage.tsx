import { SysAdminNavbar } from '@components/layout/sysadmin/SysAdminNavbar'
import { SysAdminSidebar } from '@components/layout/sysadmin/SysAdminSidebar'
import { Card } from '@components/ui/Card'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { MainLayout } from '@layouts/MainLayout'
import { useSysAdminAnalytics } from '@/hooks/useAnalytics'

export const SysAdminDashboardPage: React.FC = () => {
  const { data, isLoading, error } = useSysAdminAnalytics()

  const stat = (n: number | undefined | null) =>
    isLoading ? '…' : (n ?? 0).toLocaleString()

  const topStats = [
    { label: 'Total Organizations', value: stat(data.orgs?.totalOrgs), icon: 'business' },
    { label: 'Total Users', value: stat(data.orgs?.totalMembers), icon: 'people' },
    { label: 'Total Courses', value: stat(data.content?.totalCourses), icon: 'school' },
    { label: 'Total Quizzes', value: stat(data.content?.totalQuizzes), icon: 'quiz' },
  ]

  const contentStats = [
    { label: 'Modules', value: stat(data.content?.totalModules), icon: 'view_module' },
    { label: 'Flashcard Decks', value: stat(data.content?.totalFlashcardDecks), icon: 'style' },
    { label: 'Videos', value: stat(data.content?.totalVideos), icon: 'play_circle' },
    { label: 'Documents', value: stat(data.content?.totalDocuments), icon: 'description' },
    { label: 'Quiz Attempts', value: stat(data.content?.totalQuizAttempts), icon: 'done_all' },
    { label: 'Recent Member Joins', value: stat(data.orgs?.recentJoins), icon: 'person_add' },
  ]

  return (
    <MainLayout
      navbar={<SysAdminNavbar title="System Administration" />}
      sidebar={<SysAdminSidebar />}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-on-surface mb-2 font-headline" data-testid="sysadmin-dashboard-heading">
              System Overview
            </h2>
            <p className="text-on-surface-variant">Platform-wide statistics from live data.</p>
          </div>

          {error && !isLoading && (
            <p className="text-sm text-error mb-4" data-testid="sysadmin-analytics-error">{error}</p>
          )}

          {/* Top stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" data-testid="sysadmin-stats-grid">
            {topStats.map((s) => (
              <Card key={s.label} data-testid={`sysadmin-stat-${s.label.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-3xl font-bold text-on-surface mb-1">{s.value}</p>
                    <p className="text-sm text-on-surface-variant">{s.label}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10">
                    <MaterialIcon icon={s.icon} className="text-primary" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Secondary content stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {contentStats.map((s) => (
              <Card key={s.label} data-testid={`sysadmin-stat-${s.label.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="flex flex-col items-center text-center gap-2 py-2">
                  <MaterialIcon icon={s.icon} className="text-2xl text-on-surface-variant" />
                  <p className="text-2xl font-bold text-on-surface">{s.value}</p>
                  <p className="text-xs text-on-surface-variant">{s.label}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
