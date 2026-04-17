import React, { useState, useEffect } from 'react'
import { MainLayout } from '@layouts/MainLayout'
import { SysAdminNavbar } from '@components/layout/sysadmin/SysAdminNavbar'
import { SysAdminSidebar } from '@components/layout/sysadmin/SysAdminSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Badge } from '@components/ui/Badge'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { getCurrentLanguage } from '@/i18n/translations'
import { useOrganization } from '@/hooks/useOrganization'
import { apiClient } from '@/utils/apiClient'

const useLang = () => getCurrentLanguage() === 'vi'

interface SysShellProps {
  titleEn: string
  titleVi: string
  subtitleEn: string
  subtitleVi: string
  children: React.ReactNode
}

const SysShell: React.FC<SysShellProps> = ({ titleEn, titleVi, subtitleEn, subtitleVi, children }) => {
  const isVi = useLang()

  return (
    <MainLayout
      navbar={<SysAdminNavbar title={isVi ? titleVi : titleEn} />}
      sidebar={<SysAdminSidebar />}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-on-surface font-headline mb-2">{isVi ? titleVi : titleEn}</h2>
            <p className="text-on-surface-variant">{isVi ? subtitleVi : subtitleEn}</p>
          </div>
          {children}
        </div>
      </div>
    </MainLayout>
  )
}

export const GlobalContentCoursesPage: React.FC = () => {
  const isVi = useLang()

  return (
    <SysShell
      titleEn="Global Content Courses"
      titleVi="Noi dung khoa hoc toan cuc"
      subtitleEn="Govern content quality across all organizations"
      subtitleVi="Quan tri chat luong noi dung tren toan he thong"
    >
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-surface-container-low">
            <p className="text-sm text-on-surface-variant">{isVi ? 'Tong khoa hoc' : 'Total Courses'}</p>
            <p className="text-2xl font-bold">1,284</p>
          </div>
          <div className="p-4 rounded-lg bg-surface-container-low">
            <p className="text-sm text-on-surface-variant">{isVi ? 'Can duyet' : 'Pending Review'}</p>
            <p className="text-2xl font-bold">37</p>
          </div>
          <div className="p-4 rounded-lg bg-surface-container-low">
            <p className="text-sm text-on-surface-variant">{isVi ? 'Bi danh dau' : 'Flagged'}</p>
            <p className="text-2xl font-bold">9</p>
          </div>
        </div>
      </Card>
    </SysShell>
  )
}

interface UserItem {
  id: string;
  username: string;
  email: string;
  role: string;
  isSystemAdmin: boolean;
  createdAt: string;
}

export const GlobalUserManagementPage: React.FC = () => {
  const isVi = useLang()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<UserItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 20

  const loadUsers = async (page = 0, search = '') => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        pageIndex: String(page),
        pageSize: String(PAGE_SIZE),
        ...(search ? { query: search } : {}),
      })
      const res = await apiClient.get<UserItem[]>(`/users?${params}`)
      if (res.success && res.data) {
        setUsers(res.data)
        setTotalCount((res as any).totalCount ?? res.data.length)
      }
    } catch {
      // silently fail — show empty state
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadUsers(0, '') }, [])

  const handleSearch = () => {
    setPageIndex(0)
    loadUsers(0, query)
  }

  return (
    <SysShell
      titleEn="Global User Management"
      titleVi="Quan ly nguoi dung toan cuc"
      subtitleEn="Monitor and manage user accounts platform-wide"
      subtitleVi="Giam sat va quan ly tai khoan tren toan nen tang"
    >
      <Card className="p-6 flex gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isVi ? 'Tim nguoi dung...' : 'Search users...'}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch}>{isVi ? 'Tim' : 'Search'}</Button>
      </Card>
      <Card className="p-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-on-surface-variant text-sm text-center py-4">
            {isVi ? 'Khong tim thay nguoi dung' : 'No users found'}
          </p>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between">
                <div>
                  <span className="font-medium text-on-surface">{user.username}</span>
                  <span className="ml-2 text-sm text-on-surface-variant">{user.email}</span>
                  <Badge variant={user.isSystemAdmin ? 'warning' : 'secondary'} size="sm" className="ml-2">
                    {user.isSystemAdmin ? 'SysAdmin' : user.role}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary">{isVi ? 'Khoa' : 'Suspend'}</Button>
                  <Button size="sm">{isVi ? 'Chi tiet' : 'Details'}</Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {totalCount > PAGE_SIZE && (
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="secondary" size="sm"
              disabled={pageIndex === 0}
              onClick={() => { const p = pageIndex - 1; setPageIndex(p); loadUsers(p, query) }}
            >
              {isVi ? 'Trang truoc' : 'Prev'}
            </Button>
            <span className="text-sm text-on-surface-variant">
              {pageIndex + 1} / {Math.ceil(totalCount / PAGE_SIZE)}
            </span>
            <Button
              variant="secondary" size="sm"
              disabled={(pageIndex + 1) * PAGE_SIZE >= totalCount}
              onClick={() => { const p = pageIndex + 1; setPageIndex(p); loadUsers(p, query) }}
            >
              {isVi ? 'Trang sau' : 'Next'}
            </Button>
          </div>
        )}
      </Card>
    </SysShell>
  )
}

export const OrganizationDirectoryPage: React.FC = () => {
  const isVi = useLang()
  const [search, setSearch] = useState('')
  const { organizations, isLoading, error, fetchOrganizations } = useOrganization()
  const PAGE_SIZE = 12

  useEffect(() => { fetchOrganizations(0, PAGE_SIZE) }, [fetchOrganizations])

  const displayed = organizations.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <SysShell
      titleEn="Organization Directory"
      titleVi="Danh ba to chuc"
      subtitleEn="Directory of all organizations in the platform"
      subtitleVi="Danh sach toan bo to chuc tren nen tang"
    >
      <Card className="p-6 flex gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isVi ? 'Tim to chuc...' : 'Search organizations...'}
          className="flex-1"
        />
        <Button onClick={() => fetchOrganizations(0, PAGE_SIZE)}>
          {isVi ? 'Tai lai' : 'Refresh'}
        </Button>
      </Card>

      {error && (
        <Card className="p-4">
          <p className="text-error text-sm">{error}</p>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayed.length === 0 ? (
            <p className="text-on-surface-variant text-sm col-span-3 text-center py-4">
              {isVi ? 'Khong tim thay to chuc nao' : 'No organizations found'}
            </p>
          ) : displayed.map((org) => (
            <Card key={org.id} className="p-6">
              <div className="flex items-center justify-between mb-3">
                <MaterialIcon icon="apartment" className="text-primary" />
                <Badge variant="primary" size="sm">{isVi ? 'Hoat dong' : 'Active'}</Badge>
              </div>
              <h3 className="font-bold text-on-surface">{org.name}</h3>
              <p className="text-xs text-on-surface-variant mt-1">/{org.slug}</p>
              {org.memberCount !== undefined && (
                <p className="text-sm text-on-surface-variant mt-2">
                  {org.memberCount} {isVi ? 'thanh vien' : 'members'}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </SysShell>
  )
}

export const OrgDetailsSystemadminPage: React.FC = () => {
  const isVi = useLang()

  return (
    <SysShell
      titleEn="Organization Details"
      titleVi="Chi tiet to chuc"
      subtitleEn="Detailed diagnostics and ownership data"
      subtitleVi="Chan doan chi tiet va thong tin so huu"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 space-y-4">
          <h3 className="font-bold text-on-surface">Lumi Academy</h3>
          <p className="text-on-surface-variant">{isVi ? 'To chuc tap trung vao AI/Cloud voi 8 khoa hoc premium.' : 'Organization focused on AI/Cloud with 8 premium tracks.'}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {['Users: 2,431', 'Courses: 42', 'Completion: 71%'].map((i) => (
              <div key={i} className="p-3 rounded-lg bg-surface-container-low">{i}</div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-bold text-on-surface mb-3">{isVi ? 'Trang thai he thong' : 'System Status'}</h3>
          <Badge variant="success">{isVi ? 'On dinh' : 'Healthy'}</Badge>
        </Card>
      </div>
    </SysShell>
  )
}

export const PlatformSettingsLogsPage: React.FC = () => {
  const isVi = useLang()

  return (
    <SysShell
      titleEn="Platform Settings & Logs"
      titleVi="Cai dat nen tang va nhat ky"
      subtitleEn="Audit controls, access rules, and logs"
      subtitleVi="Kiem soat audit, quyen truy cap va nhat ky"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-on-surface">{isVi ? 'Cai dat bao mat' : 'Security Settings'}</h3>
          {[
            isVi ? 'Bat MFA bat buoc' : 'Enforce mandatory MFA',
            isVi ? 'Khoa IP nghiem ngat' : 'Strict IP allowlist',
            isVi ? 'Tu dong logout 24h' : 'Auto logout after 24h',
          ].map((item) => (
            <label key={item} className="p-3 rounded-lg bg-surface-container-low flex justify-between items-center">
              <span>{item}</span>
              <input type="checkbox" defaultChecked className="h-4 w-4" />
            </label>
          ))}
          <Button className="w-full">{isVi ? 'Luu cai dat' : 'Save Settings'}</Button>
        </Card>
        <Card className="p-6">
          <h3 className="font-bold text-on-surface mb-4">{isVi ? 'Nhat ky gan day' : 'Recent Logs'}</h3>
          <div className="space-y-3">
            {[
              '2026-04-03 09:10 Admin changed policy',
              '2026-04-03 08:42 New org created',
              '2026-04-02 23:11 Suspicious login blocked',
            ].map((log) => (
              <div key={log} className="p-3 rounded-lg bg-surface-container-low text-sm text-on-surface-variant">
                {log}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </SysShell>
  )
}

export const SystemadminOrganizationDirectoryLight2Page: React.FC = () => {
  return (
    <SysShell
      titleEn="Organization Directory (Light 2)"
      titleVi="Danh ba to chuc (Light 2)"
      subtitleEn="Alternate directory view with status tags"
      subtitleVi="Giao dien danh ba thay the voi nhan trang thai"
    >
      <Card className="p-6 space-y-3">
        {[
          ['Lumi Academy', 'Premium'],
          ['Delta Learning', 'Standard'],
          ['Future Lab', 'Enterprise'],
        ].map((item) => (
          <div key={item[0]} className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MaterialIcon icon="domain" className="text-primary" />
              <span>{item[0]}</span>
            </div>
            <Badge variant="secondary" size="sm">{item[1]}</Badge>
          </div>
        ))}
      </Card>
    </SysShell>
  )
}

export const UserDetailsSystemadminPage: React.FC = () => {
  const isVi = useLang()

  return (
    <SysShell
      titleEn="User Details"
      titleVi="Chi tiet nguoi dung"
      subtitleEn="Deep profile, role assignments, and audit trail"
      subtitleVi="Ho so chi tiet, phan quyen va lich su audit"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-bold text-on-surface mb-4">Alex Johnson</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-surface-container-low">Email: alex@lumina.ai</div>
            <div className="p-3 rounded-lg bg-surface-container-low">Role: Org Admin</div>
            <div className="p-3 rounded-lg bg-surface-container-low">Last Login: 2h ago</div>
            <div className="p-3 rounded-lg bg-surface-container-low">Status: Active</div>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-bold text-on-surface mb-3">{isVi ? 'Hanh dong nhanh' : 'Quick Actions'}</h3>
          <div className="space-y-2">
            <Button className="w-full" variant="secondary">{isVi ? 'Dat lai mat khau' : 'Reset Password'}</Button>
            <Button className="w-full" variant="secondary">{isVi ? 'Cap nhat vai tro' : 'Update Role'}</Button>
            <Button className="w-full">{isVi ? 'Mo khoa tai khoan' : 'Unlock Account'}</Button>
          </div>
        </Card>
      </div>
    </SysShell>
  )
}
