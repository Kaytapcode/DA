import React from 'react'
import { Navbar } from '@components/layout/Navbar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { MaterialIcon } from '@components/ui/MaterialIcon'

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: string
}

/**
 * Notification Page Component
 */
export const NotificationPage: React.FC = () => {
  const notifications: Notification[] = [
    {
      id: '1',
      type: 'success',
      title: 'Course Enrollment',
      message: 'You have been successfully enrolled in "Advanced React Patterns"',
      timestamp: '2 hours ago'
    },
    {
      id: '2',
      type: 'info',
      title: 'New Course Available',
      message: 'Check out the new course "TypeScript Masterclass"',
      timestamp: '4 hours ago'
    },
    {
      id: '3',
      type: 'warning',
      title: 'Low Quiz Score',
      message: 'Your score on the latest quiz is below the course average',
      timestamp: '1 day ago'
    },
    {
      id: '4',
      type: 'error',
      title: 'Payment Failed',
      message: 'Your subscription payment could not be processed',
      timestamp: '2 days ago'
    },
  ]

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return { bg: 'bg-green-100', icon: 'check_circle', text: 'text-green-600' }
      case 'error':
        return { bg: 'bg-error/10', icon: 'error_outline', text: 'text-error' }
      case 'warning':
        return { bg: 'bg-warning/10', icon: 'warning', text: 'text-warning' }
      case 'info':
      default:
        return { bg: 'bg-primary/10', icon: 'info', text: 'text-primary' }
    }
  }

  return (
    <div>
      <Navbar title="Notifications" />
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-on-surface mb-2 font-headline">Notifications</h2>
              <p className="text-on-surface-variant">Stay updated with your activities</p>
            </div>
            <Button variant="secondary">Clear All</Button>
          </div>

          {/* Notifications List */}
          <div className="space-y-4">
            {notifications.map(notification => {
              const typeInfo = getTypeColor(notification.type)
              return (
                <Card
                  key={notification.id}
                  className="flex items-start gap-4 hover:shadow-md transition-shadow cursor-pointer hover:bg-surface-container-high"
                >
                  <div className={`p-3 rounded-lg flex-shrink-0 ${typeInfo.bg}`}>
                    <MaterialIcon icon={typeInfo.icon} className={`text-xl ${typeInfo.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-on-surface">{notification.title}</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{notification.message}</p>
                    <p className="text-xs text-on-surface-variant mt-2">{notification.timestamp}</p>
                  </div>
                  <button className="flex-shrink-0 p-2 hover:bg-surface-container-low rounded-lg transition-colors">
                    <MaterialIcon icon="close" className="text-on-surface-variant" />
                  </button>
                </Card>
              )
            })}
          </div>

          {/* Load More */}
          <div className="text-center mt-8">
            <Button variant="secondary">Load More Notifications</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
