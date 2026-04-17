import React, { useState } from 'react'
import { OrgAdminNavbar } from '@components/layout/orgadmin/OrgAdminNavbar'
import { OrgAdminSidebar } from '@components/layout/orgadmin/OrgAdminSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { MainLayout } from '@layouts/MainLayout'

interface Member {
  id: string
  name: string
  email: string
  role: string
  status: 'active' | 'inactive'
}

/**
 * OrgAdmin Member Management Page
 */
export const MemberManagementPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')

  const members: Member[] = [
    { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'Instructor', status: 'active' },
    { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'Learner', status: 'active' },
    { id: '3', name: 'Carol Davis', email: 'carol@example.com', role: 'Admin', status: 'inactive' },
  ]

  return (
    <MainLayout
      navbar={<OrgAdminNavbar title="Member Management" />}
      sidebar={<OrgAdminSidebar />}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-on-surface mb-2 font-headline">Members</h2>
              <p className="text-on-surface-variant">Manage organization members and roles</p>
            </div>
            <Button>+ Add Member</Button>
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select className="px-4 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface">
                <option>All Roles</option>
                <option>Admin</option>
                <option>Instructor</option>
                <option>Learner</option>
              </select>
              <select className="px-4 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface">
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
          </Card>

          {/* Members Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="text-left px-6 py-4 font-semibold text-on-surface">Name</th>
                    <th className="text-left px-6 py-4 font-semibold text-on-surface">Email</th>
                    <th className="text-left px-6 py-4 font-semibold text-on-surface">Role</th>
                    <th className="text-left px-6 py-4 font-semibold text-on-surface">Status</th>
                    <th className="text-left px-6 py-4 font-semibold text-on-surface">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.id} className="border-b border-outline-variant hover:bg-surface-container-low">
                      <td className="px-6 py-4">{member.name}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{member.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                          member.status === 'active' ? 'text-green-600' : 'text-on-surface-variant'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${member.status === 'active' ? 'bg-green-600' : 'bg-on-surface-variant'}`} />
                          {member.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Button size="sm" variant="ghost">Edit</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
