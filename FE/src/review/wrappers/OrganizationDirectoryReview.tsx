import React, { useState } from 'react'
import { MainLayout } from '@layouts/MainLayout'
import { SysAdminNavbar } from '@components/layout/sysadmin/SysAdminNavbar'
import { SysAdminSidebar } from '@components/layout/sysadmin/SysAdminSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Badge } from '@components/ui/Badge'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { MOCK_ORGS } from '@/review/reviewData'

export const OrganizationDirectoryReview: React.FC = () => {
  const [search, setSearch] = useState('')

  const displayed = MOCK_ORGS.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <MainLayout
      navbar={<SysAdminNavbar title="Organization Directory" />}
      sidebar={<SysAdminSidebar />}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-on-surface font-headline mb-2">Organization Directory</h2>
            <p className="text-on-surface-variant">Directory of all organizations in the platform</p>
          </div>

          <Card className="p-6 flex gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organizations..."
              className="flex-1"
            />
            <Button>Refresh</Button>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayed.length === 0 ? (
              <p className="text-on-surface-variant text-sm col-span-3 text-center py-4">
                No organizations found
              </p>
            ) : displayed.map((org) => (
              <Card key={org.id} className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <MaterialIcon icon="apartment" className="text-primary" />
                  <Badge variant="primary" size="sm">Active</Badge>
                </div>
                <h3 className="font-bold text-on-surface">{org.name}</h3>
                <p className="text-xs text-on-surface-variant mt-1">/{org.slug}</p>
                <p className="text-sm text-on-surface-variant mt-2">{org.memberCount} members</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
