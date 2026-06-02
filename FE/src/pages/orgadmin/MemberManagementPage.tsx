import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { OrgAdminNavbar } from '@components/layout/orgadmin/OrgAdminNavbar'
import { OrgAdminSidebar } from '@components/layout/orgadmin/OrgAdminSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Badge } from '@components/ui/Badge'
import { MainLayout } from '@layouts/MainLayout'
import { useOrgContext } from '@/contexts/OrgContext'
import { apiClient } from '@/utils/apiClient'

// Spec §1, OrgAdmin: "Manage Users within the Organization."
// Talks to BE/Organization.Api/Controllers/MemberController.cs.

interface MemberRow {
  userId: string
  username: string
  email: string
  role: string
  joinDate: string
}

// Org-level roles only: a member is either a plain 'Member' or an 'OrgAdmin' ('Owner' is shown
// for the creator but not assignable). Teacher/Student is NOT an org role — it is assigned
// per-course on the Course Editor → Member Roles tab.
const ROLES = ['Member', 'OrgAdmin', 'Owner'] as const
const ADD_ROLES = ['Member', 'OrgAdmin'] as const

interface UserLookupItem {
  id: string
  username: string
  email: string
  role: string
}

export const MemberManagementPage: React.FC = () => {
  const { org } = useOrgContext()
  const orgId = org?.id ?? localStorage.getItem('org_id') ?? ''
  const [members, setMembers] = useState<MemberRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | (typeof ROLES)[number]>('ALL')
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  // Add member from system user search
  const [showAddMember, setShowAddMember] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [addResults, setAddResults] = useState<UserLookupItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserLookupItem | null>(null)
  const [addRole, setAddRole] = useState<(typeof ADD_ROLES)[number]>('Member')
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const refresh = useCallback(async () => {
    if (!orgId) {
      setMembers([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<MemberRow[]>(`/orgs/${orgId}/members`)
      if (res.success && res.data) setMembers(res.data)
      else throw new Error(res.message || 'Failed to load members')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members')
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => { void refresh() }, [refresh])

  const handleRoleChange = async (m: MemberRow, newRole: string) => {
    if (newRole === m.role) return
    setBusyUserId(m.userId)
    setError(null)
    try {
      const res = await apiClient.put(`/orgs/${orgId}/members/${m.userId}`, { role: newRole })
      if (!res.success) throw new Error(res.message || 'Failed to update role')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setBusyUserId(null)
    }
  }

  const handleRemove = async (m: MemberRow) => {
    if (!confirm(`Remove ${m.username} from the organization?`)) return
    setBusyUserId(m.userId)
    setError(null)
    try {
      const res = await apiClient.delete(`/orgs/${orgId}/members/${m.userId}`)
      if (!res.success) throw new Error(res.message || 'Failed to remove member')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setBusyUserId(null)
    }
  }

  const searchUsers = async () => {
    if (!addSearch.trim()) return
    setIsSearching(true)
    setAddError(null)
    setAddResults([])
    try {
      const res = await apiClient.get<UserLookupItem[]>(`/users/lookup?q=${encodeURIComponent(addSearch.trim())}&limit=10`)
      if (res.success && res.data) setAddResults(res.data)
      else setAddError('No results found.')
    } catch {
      setAddError('Search failed.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddMember = async () => {
    if (!selectedUser || !orgId) return
    setIsAdding(true)
    setAddError(null)
    setAddSuccess(null)
    try {
      const res = await apiClient.post(`/orgs/${orgId}/members`, { userId: selectedUser.id, role: addRole })
      if (res.success) {
        setAddSuccess(`${selectedUser.username} added as ${addRole}.`)
        setSelectedUser(null)
        setAddSearch('')
        setAddResults([])
        await refresh()
      } else {
        setAddError(res.message || 'Failed to add member.')
      }
    } catch (e: any) {
      setAddError(e?.message || 'Failed to add member.')
    } finally {
      setIsAdding(false)
    }
  }

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return members.filter((m) => {
      if (roleFilter !== 'ALL' && m.role !== roleFilter) return false
      if (!term) return true
      return m.username.toLowerCase().includes(term) || m.email.toLowerCase().includes(term)
    })
  }, [members, searchTerm, roleFilter])

  return (
    <MainLayout
      navbar={<OrgAdminNavbar title="Member Management" />}
      sidebar={<OrgAdminSidebar />}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-on-surface mb-2 font-headline">Members</h2>
              <p className="text-on-surface-variant">Manage organization members and roles</p>
            </div>
            <Button onClick={() => { setShowAddMember(v => !v); setAddError(null); setAddSuccess(null) }}>
              {showAddMember ? 'Cancel' : '+ Add Member'}
            </Button>
          </div>

          {showAddMember && (
            <Card className="mb-6 p-6 border border-primary/20">
              <h3 className="font-bold text-on-surface mb-4">Add Member from System Users</h3>
              <div className="flex gap-2 mb-3">
                <Input
                  type="text"
                  placeholder="Search by username or email..."
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void searchUsers()}
                  className="flex-1"
                />
                <Button variant="secondary" onClick={() => void searchUsers()} disabled={isSearching || !addSearch.trim()}>
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {addResults.length > 0 && !selectedUser && (
                <div className="mb-3 max-h-40 overflow-y-auto rounded-lg border border-outline-variant">
                  {addResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { setSelectedUser(u); setAddResults([]) }}
                      className="flex w-full items-center gap-3 border-b border-outline-variant/40 px-4 py-2 text-left text-sm hover:bg-surface-container-low last:border-b-0"
                    >
                      <span className="font-medium text-on-surface">{u.username}</span>
                      <span className="text-on-surface-variant">{u.email}</span>
                      <Badge variant="secondary" size="sm" className="ml-auto">{u.role}</Badge>
                    </button>
                  ))}
                </div>
              )}

              {selectedUser && (
                <div className="mb-3 flex items-center gap-3 rounded-lg bg-surface-container-low p-3">
                  <div className="flex-1">
                    <p className="font-medium text-on-surface">{selectedUser.username}</p>
                    <p className="text-sm text-on-surface-variant">{selectedUser.email}</p>
                  </div>
                  <select
                    className="rounded border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as (typeof ADD_ROLES)[number])}
                  >
                    {ADD_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <Button onClick={() => void handleAddMember()} disabled={isAdding}>
                    {isAdding ? 'Adding...' : 'Add'}
                  </Button>
                  <Button variant="ghost" onClick={() => { setSelectedUser(null); setAddSearch('') }}>
                    Clear
                  </Button>
                </div>
              )}

              {addError && <p className="text-sm text-error">{addError}</p>}
              {addSuccess && <p className="text-sm text-success">{addSuccess}</p>}
            </Card>
          )}

          {!orgId && (
            <Card className="mb-6 p-4">
              <p className="text-sm text-on-surface-variant">Select an organization to manage its members.</p>
            </Card>
          )}
          {error && <Card className="mb-6 p-4 border border-error/30"><p className="text-sm text-error">{error}</p></Card>}

          <Card className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                type="text"
                placeholder="Search by username or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                className="px-4 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'ALL' | (typeof ROLES)[number])}
              >
                <option value="ALL">All Roles</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <Button variant="secondary" onClick={() => void refresh()} disabled={isLoading}>
                Refresh
              </Button>
            </div>
          </Card>

          <Card>
            <div className="overflow-x-auto">
              {isLoading && (
                <div className="flex justify-center py-6">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                </div>
              )}
              {!isLoading && (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className="text-left px-6 py-4 font-semibold text-on-surface">Username</th>
                      <th className="text-left px-6 py-4 font-semibold text-on-surface">Email</th>
                      <th className="text-left px-6 py-4 font-semibold text-on-surface">Role</th>
                      <th className="text-left px-6 py-4 font-semibold text-on-surface">Joined</th>
                      <th className="text-left px-6 py-4 font-semibold text-on-surface">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-sm text-on-surface-variant">No members found.</td>
                      </tr>
                    )}
                    {filtered.map((m) => (
                      <tr key={m.userId} className="border-b border-outline-variant hover:bg-surface-container-low">
                        <td className="px-6 py-4">{m.username || '—'}</td>
                        <td className="px-6 py-4 text-on-surface-variant">{m.email || '—'}</td>
                        <td className="px-6 py-4">
                          <Badge variant={m.role === 'OrgAdmin' || m.role === 'Owner' ? 'warning' : 'primary'} size="sm">
                            {m.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant">
                          {m.joinDate ? new Date(m.joinDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            className="px-2 py-1 rounded border border-outline-variant bg-surface text-on-surface text-sm mr-2"
                            value={m.role}
                            disabled={busyUserId === m.userId}
                            onChange={(e) => void handleRoleChange(m, e.target.value)}
                          >
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleRemove(m)}
                            disabled={busyUserId === m.userId}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
