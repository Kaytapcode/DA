import React, { useState } from 'react'
import { MainLayout } from '@layouts/MainLayout'
import { SysAdminNavbar } from '@components/layout/sysadmin/SysAdminNavbar'
import { SysAdminSidebar } from '@components/layout/sysadmin/SysAdminSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Badge } from '@components/ui/Badge'
import { MOCK_USERS } from '@/review/reviewData'

export const GlobalUserManagementReview: React.FC = () => {
  const [query, setQuery] = useState('')

  const displayed = MOCK_USERS.filter(
    (u) =>
      u.username.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <MainLayout
      navbar={<SysAdminNavbar title="Global User Management" />}
      sidebar={<SysAdminSidebar />}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-on-surface font-headline mb-2">Global User Management</h2>
            <p className="text-on-surface-variant">Monitor and manage user accounts platform-wide</p>
          </div>

          <Card className="p-6 flex gap-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
              className="flex-1"
            />
            <Button>Search</Button>
          </Card>

          <Card className="p-6">
            {displayed.length === 0 ? (
              <p className="text-on-surface-variant text-sm text-center py-4">No users found</p>
            ) : (
              <div className="space-y-3">
                {displayed.map((user) => (
                  <div key={user.id} className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between">
                    <div>
                      <span className="font-medium text-on-surface">{user.username}</span>
                      <span className="ml-2 text-sm text-on-surface-variant">{user.email}</span>
                      <Badge variant={user.isSystemAdmin ? 'warning' : 'secondary'} size="sm" className="ml-2">
                        {user.isSystemAdmin ? 'SysAdmin' : user.role}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary">Suspend</Button>
                      <Button size="sm">Details</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
