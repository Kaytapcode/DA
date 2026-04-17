import React from 'react'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { MainLayout } from '@layouts/MainLayout'
import { t } from '@/i18n/translations'

/**
 * User Dashboard Page with i18n and React Router support
 */
export const UserDashboardPage: React.FC = () => {
  const stats = [
    { label: 'Active Courses', value: '5', icon: 'school', color: 'text-primary' },
    { label: 'Learning Hours', value: '124', icon: 'schedule', color: 'text-secondary' },
    { label: 'Achievements', value: '12', icon: 'emoji_events', color: 'text-tertiary' },
    { label: 'Streak', value: '7 days', icon: 'local_fire_department', color: 'text-error' },
  ]

  return (
    <MainLayout
      navbar={<UserNavbar title={t('common.dashboard')} />}
      sidebar={<UserSidebar />}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-on-surface mb-2 font-headline">{t('common.welcome')}</h2>
            <p className="text-on-surface-variant">{t('user.learningJourney')}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center">
                <div className={`text-4xl mb-3 flex justify-center ${stat.color}`}>
                  <MaterialIcon icon={stat.icon} className="text-4xl" />
                </div>
                <p className="text-3xl font-bold text-on-surface mb-1">{stat.value}</p>
                <p className="text-sm text-on-surface-variant">{stat.label}</p>
              </Card>
            ))}
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Courses */}
            <div className="lg:col-span-2">
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-on-surface">{t('user.inProgress')}</h3>
                  <Button variant="ghost" size="sm">{t('ui.viewAll')}</Button>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors">
                      <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <MaterialIcon icon="school" className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-on-surface">{t('user.course')} {i}</p>
                        <p className="text-sm text-on-surface-variant">60% {t('common.complete')}</p>
                      </div>
                      <Button size="sm">{t('common.continue')}</Button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Upcoming Events */}
            <Card>
              <h3 className="text-xl font-bold text-on-surface mb-6">{t('user.upcomingEvents')}</h3>
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="p-4 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors">
                    <p className="font-medium text-on-surface text-sm">{t('user.event')} {i}</p>
                    <p className="text-xs text-on-surface-variant mt-1">Today at 3:00 PM</p>
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
