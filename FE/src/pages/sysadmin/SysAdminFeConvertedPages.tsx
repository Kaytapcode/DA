import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import { useSysAdminAnalytics } from '@/hooks/useAnalytics'
import { apiClient } from '@/utils/apiClient'
import { GlobalContentList } from '@components/GlobalContentList'

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

// Global Content (CMS) — SysAdmin views/deletes ALL content platform-wide (in & out of course).
export const GlobalContentPage: React.FC = () => {
  const isVi = useLang()
  return (
    <SysShell
      titleEn="Global Content"
      titleVi="Nội dung toàn cục"
      subtitleEn="View and remove any content across the platform (including in-course content)"
      subtitleVi="Xem và xóa mọi nội dung trên nền tảng (kể cả nội dung trong khóa học)"
    >
      <GlobalContentList isVi={isVi} />
    </SysShell>
  )
}

interface ModResult {
  contentId: string
  title: string
  contentType: 'VIDEO' | 'QUIZ' | 'FLASHCARD' | 'PDF' | 'COLLECTION'
  resourceId: string | null
  authorName?: string | null
}

// Maps a search result's contentType to its owner-or-SysAdmin DELETE endpoint.
const DELETE_PATH: Record<string, (id: string) => string> = {
  PDF: (id) => `/documents/${id}`,
  QUIZ: (id) => `/quizzes/${id}`,
  FLASHCARD: (id) => `/decks/${id}`,
  VIDEO: (id) => `/videos/${id}`,
}

export const GlobalContentCoursesPage: React.FC = () => {
  const isVi = useLang()
  const { data, isLoading } = useSysAdminAnalytics()

  const stat = (n: number | undefined | null) => (n ?? 0).toLocaleString()

  // ── Absolute Deletion / content moderation (spec §6.5) ──────────────────
  const [modQuery, setModQuery] = useState('')
  const [modResults, setModResults] = useState<ModResult[]>([])
  const [modSearching, setModSearching] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [modError, setModError] = useState<string | null>(null)

  const runModSearch = async () => {
    setModError(null); setModSearching(true)
    try {
      const res = await apiClient.get<ModResult[]>(`/search?q=${encodeURIComponent(modQuery.trim())}&limit=50`)
      setModResults(res.success && res.data ? res.data.filter((r) => r.contentType !== 'COLLECTION') : [])
    } catch (e: any) {
      setModError(e?.message || 'Search failed'); setModResults([])
    } finally {
      setModSearching(false)
    }
  }

  const absoluteDelete = async (r: ModResult) => {
    const id = r.resourceId ?? r.contentId
    const pathFn = DELETE_PATH[r.contentType]
    if (!pathFn) return
    setDeletingId(r.contentId); setModError(null)
    try {
      const res = await apiClient.delete(pathFn(id))
      if (res.success) setModResults((prev) => prev.filter((x) => x.contentId !== r.contentId))
      else setModError(res.message || 'Delete failed')
    } catch (e: any) {
      setModError(e?.message || 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <SysShell
      titleEn="Global Content Courses"
      titleVi="Nội dung khóa học toàn cục"
      subtitleEn="Govern content quality across all organizations"
      subtitleVi="Quản trị chất lượng nội dung trên toàn hệ thống"
    >
      <Card className="p-6">
        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        )}
        {/* {error && !isLoading && <p className="text-sm text-error mb-3">{error}</p>} */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-surface-container-low">
            <p className="text-sm text-on-surface-variant">{isVi ? 'Tổng khóa học' : 'Total Courses'}</p>
            <p className="text-2xl font-bold">{stat(data.content?.totalCourses)}</p>
          </div>
          <div className="p-4 rounded-lg bg-surface-container-low">
            <p className="text-sm text-on-surface-variant">{isVi ? 'Mô-đun' : 'Modules'}</p>
            <p className="text-2xl font-bold">{stat(data.content?.totalModules)}</p>
          </div>
          <div className="p-4 rounded-lg bg-surface-container-low">
            <p className="text-sm text-on-surface-variant">{isVi ? 'Quiz' : 'Quizzes'}</p>
            <p className="text-2xl font-bold">{stat(data.content?.totalQuizzes)}</p>
          </div>
          <div className="p-4 rounded-lg bg-surface-container-low">
            <p className="text-sm text-on-surface-variant">{isVi ? 'Bộ thẻ' : 'Decks'}</p>
            <p className="text-2xl font-bold">{stat(data.content?.totalFlashcardDecks)}</p>
          </div>
          <div className="p-4 rounded-lg bg-surface-container-low">
            <p className="text-sm text-on-surface-variant">{isVi ? 'Video' : 'Videos'}</p>
            <p className="text-2xl font-bold">{stat(data.content?.totalVideos)}</p>
          </div>
          <div className="p-4 rounded-lg bg-surface-container-low">
            <p className="text-sm text-on-surface-variant">{isVi ? 'Tài liệu' : 'Documents'}</p>
            <p className="text-2xl font-bold">{stat(data.content?.totalDocuments)}</p>
          </div>
          <div className="p-4 rounded-lg bg-surface-container-low">
            <p className="text-sm text-on-surface-variant">{isVi ? 'Lượt thi' : 'Quiz Attempts'}</p>
            <p className="text-2xl font-bold">{stat(data.content?.totalQuizAttempts)}</p>
          </div>
          <div className="p-4 rounded-lg bg-surface-container-low">
            <p className="text-sm text-on-surface-variant">{isVi ? 'Tổng tổ chức' : 'Organizations'}</p>
            <p className="text-2xl font-bold">{stat(data.orgs?.totalOrgs)}</p>
          </div>
        </div>
      </Card>

      {/* Absolute Deletion — SysAdmin can permanently remove any content platform-wide (spec §6.5). */}
      <Card className="p-6 mt-6" data-testid="sysadmin-moderation-card">
        <h3 className="mb-1 font-bold text-on-surface">{isVi ? 'Kiểm duyệt & Xóa vĩnh viễn nội dung' : 'Content Moderation & Absolute Deletion'}</h3>
        <p className="mb-3 text-sm text-on-surface-variant">
          {isVi ? 'Tìm nội dung vi phạm và xóa vĩnh viễn khỏi nền tảng.' : 'Find violating content and permanently remove it from the platform.'}
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={modQuery}
            data-testid="sysadmin-content-search"
            onChange={(e) => setModQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void runModSearch() }}
            placeholder={isVi ? 'Tìm theo tiêu đề...' : 'Search by title...'}
            className="flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <Button data-testid="sysadmin-content-search-btn" onClick={() => void runModSearch()} disabled={modSearching}>
            {modSearching ? (isVi ? 'Đang tìm...' : 'Searching...') : (isVi ? 'Tìm' : 'Search')}
          </Button>
        </div>
        {modError && <p className="mt-2 text-sm text-error" data-testid="sysadmin-mod-error">{modError}</p>}
        <div className="mt-4 space-y-2" data-testid="sysadmin-mod-results">
          {modResults.length === 0 && !modSearching && (
            <p className="text-sm text-on-surface-variant" data-testid="sysadmin-mod-empty">
              {isVi ? 'Không có kết quả.' : 'No results.'}
            </p>
          )}
          {modResults.map((r) => (
            <div key={r.contentId} data-testid={`sysadmin-mod-item-${r.contentId}`}
                 className="flex items-center justify-between rounded-lg border border-outline-variant p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-on-surface">{r.title}</p>
                <p className="text-xs text-on-surface-variant">
                  {r.contentType}{r.authorName ? ` • ${isVi ? 'Tác giả' : 'by'} ${r.authorName}` : ''}
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                data-testid={`sysadmin-delete-${r.contentId}`}
                onClick={() => void absoluteDelete(r)}
                disabled={deletingId === r.contentId}
                className="!bg-error hover:!bg-error/90"
              >
                <MaterialIcon icon="delete_forever" size="xs" className="mr-1" />
                {deletingId === r.contentId ? '…' : (isVi ? 'Xóa vĩnh viễn' : 'Absolute Delete')}
              </Button>
            </div>
          ))}
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
  createdAt: string;
}

type RoleOption = 'Student' | 'Teacher' | 'OrgAdmin' | 'SysAdmin'

interface CreateUserForm {
  username: string
  email: string
  password: string
  role: RoleOption
}

const CreateUserModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}> = ({ isOpen, onClose, onCreated }) => {
  const isVi = useLang()
  const [form, setForm] = useState<CreateUserForm>({
    username: '', email: '', password: '', role: 'Student',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const reset = () => {
    setForm({ username: '', email: '', password: '', role: 'Student' })
    setError(null)
  }
  const close = () => { reset(); onClose() }

  const submit = async () => {
    setError(null)
    if (!form.username.trim() || !form.email.trim() || !form.password) {
      setError(isVi ? 'Vui lòng nhập đầy đủ thông tin.' : 'All fields are required.')
      return
    }
    setSubmitting(true)
    try {
      const res = await apiClient.post<UserItem>('/users', {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      })
      if (res.success) {
        onCreated()
        close()
      } else {
        setError(res.message || 'Failed to create user.')
      }
    } catch (e: any) {
      setError(e?.message || (isVi ? 'Không thể tạo người dùng.' : 'Failed to create user.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={close}>
      <div className="w-full max-w-md rounded-lg bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-on-surface">
            {isVi ? 'Tạo người dùng mới' : 'Create New User'}
          </h3>
          <button onClick={close} className="text-on-surface-variant hover:text-on-surface">
            <MaterialIcon icon="close" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700" data-testid="create-user-error">{error}</div>
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-on-surface-variant">
              {isVi ? 'Tên đăng nhập' : 'Username'}
            </label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="username" data-testid="create-user-username" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-on-surface-variant">Email</label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@example.com" data-testid="create-user-email" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-on-surface-variant">
              {isVi ? 'Mật khẩu' : 'Password'}
            </label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 chars with upper/lower/digit/special" data-testid="create-user-password" />
            <p className="mt-1 text-xs text-on-surface-variant" data-testid="password-requirements">
              {isVi
                ? 'Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.'
                : 'At least 8 characters, including uppercase, lowercase, a number, and a special character.'}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-on-surface-variant">
              {isVi ? 'Vai trò' : 'Role'}
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as RoleOption })}
              data-testid="create-user-role"
              className="w-full rounded-md border border-outline bg-surface px-3 py-2 text-sm text-on-surface"
            >
              <option value="Student">Student</option>
              <option value="Teacher">Teacher</option>
              <option value="OrgAdmin">OrgAdmin</option>
              <option value="SysAdmin">SysAdmin</option>
            </select>
            {form.role === 'SysAdmin' && (
              <p className="mt-1 text-xs text-amber-600">
                {isVi
                  ? 'Cảnh báo: Tài khoản SysAdmin có quyền cao nhất trên toàn hệ thống.'
                  : 'Warning: SysAdmin accounts have the highest privileges system-wide.'}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={close} disabled={submitting}>
            {isVi ? 'Hủy' : 'Cancel'}
          </Button>
          <Button onClick={submit} disabled={submitting} data-testid="create-user-submit">
            {submitting ? (isVi ? 'Đang tạo...' : 'Creating...') : (isVi ? 'Tạo' : 'Create')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export const GlobalUserManagementPage: React.FC = () => {
  const isVi = useLang()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<UserItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const PAGE_SIZE = 20

  // The caller cannot delete their own account (BE blocks it). Hide the control on their own row
  // so SysAdmins don't hit a confusing "cannot delete your own account" error.
  const currentUserId: string | null = (() => {
    try { return JSON.parse(localStorage.getItem('auth_user') || '{}')?.id ?? null } catch { return null }
  })()

  const loadUsers = async (page = 0, search = '') => {
    setIsLoading(true)
    setActionError(null)
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

  const handleDelete = async (user: UserItem) => {
    const confirmMsg = isVi
      ? `Xóa người dùng "${user.username}"? Hành động này không thể hoàn tác.`
      : `Delete user "${user.username}"? This cannot be undone.`
    if (!window.confirm(confirmMsg)) return
    setActionError(null)
    try {
      const res = await apiClient.delete(`/users/${user.id}`)
      if (res.success) {
        loadUsers(pageIndex, query)
      } else {
        setActionError(res.message || 'Delete failed.')
      }
    } catch (e: any) {
      setActionError(e?.message || 'Delete failed.')
    }
  }

  return (
    <SysShell
      titleEn="Global User Management"
      titleVi="Quản lý người dùng toàn cục"
      subtitleEn="Monitor and manage user accounts platform-wide"
      subtitleVi="Giám sát và quản lý tài khoản trên toàn nền tảng"
    >
      <Card className="p-6 flex flex-wrap gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isVi ? 'Tìm người dùng...' : 'Search users...'}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 min-w-[200px]"
          data-testid="user-search-input"
        />
        <Button variant="secondary" onClick={handleSearch} data-testid="user-search-btn">{isVi ? 'Tìm' : 'Search'}</Button>
        <Button onClick={() => setCreateOpen(true)} data-testid="user-create-btn">
          <MaterialIcon icon="person_add" className="mr-1" />
          {isVi ? 'Tạo người dùng' : 'New User'}
        </Button>
      </Card>

      {actionError && (
        <Card className="p-3">
          <p className="text-sm text-error">{actionError}</p>
        </Card>
      )}

      <Card className="p-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-on-surface-variant text-sm text-center py-4">
            {isVi ? 'Không tìm thấy người dùng' : 'No users found'}
          </p>
        ) : (
          <div className="space-y-3" data-testid="user-list">
            {users.map((user) => (
              <div key={user.id} className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between" data-testid="user-item">
                <div>
                  <span className="font-medium text-on-surface" data-testid="user-item-username">{user.username}</span>
                  <span className="ml-2 text-sm text-on-surface-variant" data-testid="user-item-email">{user.email}</span>
                  <Badge variant={user.role === 'SysAdmin' ? 'warning' : 'secondary'} size="sm" className="ml-2" data-testid="user-item-role">
                    {user.role}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {user.id !== currentUserId ? (
                    <Button size="sm" variant="secondary" onClick={() => handleDelete(user)} data-testid="user-delete-btn">
                      {isVi ? 'Xóa' : 'Delete'}
                    </Button>
                  ) : (
                    <Badge variant="secondary" size="sm" data-testid="user-item-self">{isVi ? 'Bạn' : 'You'}</Badge>
                  )}
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
              {isVi ? 'Trang trước' : 'Prev'}
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

      <CreateUserModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setPageIndex(0); loadUsers(0, query) }}
      />
    </SysShell>
  )
}

export const OrganizationDirectoryPage: React.FC = () => {
  const isVi = useLang()
  const [search, setSearch] = useState('')
  const [organizations, setOrganizations] = useState<{ id: string; name: string; slug: string; memberCount?: number; status?: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyOrg, setBusyOrg] = useState<string | null>(null)
  const PAGE_SIZE = 500

  // Suspend / reactivate an organization (spec §6.6). On success, refetch so the badge updates.
  const setOrgStatus = async (orgId: string, action: 'suspend' | 'reactivate') => {
    setBusyOrg(orgId); setError(null)
    try {
      const res = await apiClient.post(`/organizations/${orgId}/${action}`, {})
      if (!res.success) setError(res.message || `Failed to ${action}`)
      await fetchOrganizations()
    } catch (err: any) {
      setError(err?.message || `Failed to ${action}`)
    } finally {
      setBusyOrg(null)
    }
  }

  const fetchOrganizations = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<any>(`/organizations?pageIndex=0&pageSize=${PAGE_SIZE}`)
      if (res.success && res.data) {
        // BE returns flat array
        const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
        setOrganizations(list)
      } else {
        setError(res.message || 'Failed to load organizations')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load organizations')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void fetchOrganizations() }, [fetchOrganizations])

  const displayed = organizations.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <SysShell
      titleEn="Organization Directory"
      titleVi="Danh bạ tổ chức"
      subtitleEn="Directory of all organizations in the platform"
      subtitleVi="Danh sách toàn bộ tổ chức trên nền tảng"
    >
      <Card className="p-6 flex gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isVi ? 'Tìm tổ chức...' : 'Search organizations...'}
          className="flex-1"
          data-testid="org-search-input"
        />
        <Button onClick={() => void fetchOrganizations()} data-testid="org-refresh-btn">
          {isVi ? 'Tải lại' : 'Refresh'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="org-list">
          {displayed.length === 0 ? (
            <p className="text-on-surface-variant text-sm col-span-3 text-center py-4">
              {isVi ? 'Không tìm thấy tổ chức nào' : 'No organizations found'}
            </p>
          ) : displayed.map((org) => (
            <Card key={org.id} className="p-6" data-testid="org-item">
              <div className="flex items-center justify-between mb-3">
                <MaterialIcon icon="apartment" className="text-primary" />
                {org.status === 'Suspended' ? (
                  <Badge variant="error" size="sm" data-testid={`org-status-${org.id}`}>{isVi ? 'Đã khóa' : 'Suspended'}</Badge>
                ) : (
                  <Badge variant="primary" size="sm" data-testid={`org-status-${org.id}`}>{isVi ? 'Hoạt động' : 'Active'}</Badge>
                )}
              </div>
              <h3 className="font-bold text-on-surface" data-testid="org-item-name">{org.name}</h3>
              <p className="text-xs text-on-surface-variant mt-1" data-testid="org-item-slug">/{org.slug}</p>
              {org.memberCount !== undefined && (
                <p className="text-sm text-on-surface-variant mt-2">
                  {org.memberCount} {isVi ? 'thành viên' : 'members'}
                </p>
              )}
              <div className="mt-4">
                {org.status === 'Suspended' ? (
                  <Button size="sm" variant="secondary" className="w-full justify-center"
                    data-testid={`org-reactivate-${org.id}`} disabled={busyOrg === org.id}
                    onClick={() => void setOrgStatus(org.id, 'reactivate')}>
                    <MaterialIcon icon="lock_open" size="xs" className="mr-1" />
                    {busyOrg === org.id ? '…' : (isVi ? 'Kích hoạt lại' : 'Reactivate')}
                  </Button>
                ) : (
                  <Button size="sm" variant="primary" className="w-full justify-center !bg-error hover:!bg-error/90"
                    data-testid={`org-suspend-${org.id}`} disabled={busyOrg === org.id}
                    onClick={() => void setOrgStatus(org.id, 'suspend')}>
                    <MaterialIcon icon="block" size="xs" className="mr-1" />
                    {busyOrg === org.id ? '…' : (isVi ? 'Vô hiệu hóa' : 'Suspend')}
                  </Button>
                )}
              </div>
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
      titleVi="Chi tiết tổ chức"
      subtitleEn="Detailed diagnostics and ownership data"
      subtitleVi="Chẩn đoán chi tiết và thông tin sở hữu"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 space-y-4">
          <h3 className="font-bold text-on-surface">{isVi ? 'Chọn một tổ chức' : 'Select an organization'}</h3>
          <p className="text-on-surface-variant">
            {isVi
              ? 'Mở trang Danh bạ tổ chức và chọn một tổ chức để xem chi tiết.'
              : 'Open the Organizations directory and pick an organization to see its details here.'}
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="font-bold text-on-surface mb-3">{isVi ? 'Trạng thái hệ thống' : 'System Status'}</h3>
          <Badge variant="success">{isVi ? 'Ổn định' : 'Healthy'}</Badge>
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
      titleVi="Cài đặt nền tảng và nhật ký"
      subtitleEn="Audit controls and system event logs"
      subtitleVi="Kiểm soát audit và nhật ký hệ thống"
    >
      <Card className="p-6 flex items-start gap-4">
        <MaterialIcon icon="info" className="text-primary mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-on-surface mb-1">
            {isVi ? 'Tính năng này chưa khả dụng' : 'Feature not yet available'}
          </h3>
          <p className="text-sm text-on-surface-variant">
            {isVi
              ? 'Nhật ký hệ thống và cài đặt bảo mật sẽ được triển khai trong giai đoạn sau. Hiện tại, quản trị viên có thể sử dụng API logs từ server hoặc công cụ giám sát hệ thống.'
              : 'System logs and security settings will be implemented in a future release. Currently, administrators can use server-side API logs or system monitoring tools.'}
          </p>
        </div>
      </Card>
    </SysShell>
  )
}

export const SystemadminOrganizationDirectoryAltPage: React.FC = () => {
  const { organizations, isLoading, error, fetchOrganizations } = useOrganization()

  useEffect(() => { void fetchOrganizations(0, 100) }, [fetchOrganizations])

  return (
    <SysShell
      titleEn="Organization Directory"
      titleVi="Danh bạ tổ chức"
      subtitleEn="Alternate directory view"
      subtitleVi="Giao diện danh bạ thay thế"
    >
      <Card className="p-6 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        )}
        {/* {error && !isLoading && <p className="text-sm text-error">{error}</p>} */}
        {!isLoading && organizations.length === 0 && !error && (
          <p className="text-sm text-on-surface-variant text-center py-2">No organizations.</p>
        )}
        {organizations.map((org) => (
          <div key={org.id} className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MaterialIcon icon="domain" className="text-primary" />
              <div>
                <span className="font-medium">{org.name}</span>
                <p className="text-xs text-on-surface-variant">{org.memberCount} members</p>
              </div>
            </div>
            <Badge variant="secondary" size="sm">{new Date(org.createdAt).toLocaleDateString()}</Badge>
          </div>
        ))}
      </Card>
    </SysShell>
  )
}

export const UserDetailsSystemadminPage: React.FC = () => {
  const isVi = useLang()
  const [searchParams] = useSearchParams()
  const userId = searchParams.get('userId')
  const [user, setUser] = useState<UserItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newRole, setNewRole] = useState<RoleOption>('Student')
  const [saving, setSaving] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    setIsLoading(true)
    setError(null)
    apiClient.get<UserItem>(`/users/${userId}`)
      .then((res) => {
        if (res.success && res.data) { setUser(res.data); setNewRole(res.data.role as RoleOption) }
        else throw new Error(res.message || 'Not found')
      })
      .catch((e: any) => setError(e?.message || 'Failed to load user'))
      .finally(() => setIsLoading(false))
  }, [userId])

  const handleRoleUpdate = async () => {
    if (!user) return
    setSaving(true); setActionMsg(null)
    try {
      const res = await apiClient.patch(`/users/${user.id}`, { role: newRole })
      if (res.success) { setActionMsg(isVi ? 'Đã cập nhật vai trò.' : 'Role updated.'); setUser({ ...user, role: newRole }) }
      else setError(res.message || 'Failed to update.')
    } catch (e: any) { setError(e?.message || 'Failed.') }
    finally { setSaving(false) }
  }

  return (
    <SysShell
      titleEn="User Details"
      titleVi="Chi tiết người dùng"
      subtitleEn="Profile, role assignment, and management actions"
      subtitleVi="Hồ sơ, phân quyền và các hành động quản lý"
    >
      {!userId && (
        <Card className="p-6">
          <p className="text-on-surface-variant">
            {isVi
              ? 'Nâng cấp chi tiết người dùng: thêm ?userId=<id> vào URL hoặc điều hướng từ trang Quản lý người dùng.'
              : 'Navigate here with ?userId=<id> in the URL, or use User Management to pick a user.'}
          </p>
        </Card>
      )}
      {userId && isLoading && (
        <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>
      )}
      {userId && error && !isLoading && (
        <Card className="p-4 border border-error/30"><p className="text-sm text-error">{error}</p></Card>
      )}
      {user && !isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 space-y-3">
            <h3 className="font-bold text-on-surface text-lg">{user.username}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-surface-container-low">
                <span className="text-on-surface-variant">{isVi ? 'Email: ' : 'Email: '}</span>{user.email}
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low">
                <span className="text-on-surface-variant">{isVi ? 'Vai trò: ' : 'Role: '}</span>
                <Badge variant={user.role === 'SysAdmin' ? 'warning' : 'secondary'} size="sm">{user.role}</Badge>
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low">
                <span className="text-on-surface-variant">{isVi ? 'Tạo lúc: ' : 'Created: '}</span>
                {new Date(user.createdAt).toLocaleDateString()}
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low">
                <span className="text-on-surface-variant">ID: </span>
                <span className="font-mono text-xs">{user.id}</span>
              </div>
            </div>
          </Card>
          <Card className="p-6 space-y-3">
            <h3 className="font-bold text-on-surface">{isVi ? 'Hành động quản lý' : 'Management'}</h3>
            {actionMsg && <p className="text-sm text-success">{actionMsg}</p>}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                {isVi ? 'Đổi vai trò' : 'Change Role'}
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as RoleOption)}
                className="w-full rounded-md border border-outline bg-surface px-3 py-2 text-sm text-on-surface mb-2"
              >
                <option value="Student">Student</option>
                <option value="Teacher">Teacher</option>
                <option value="OrgAdmin">OrgAdmin</option>
                <option value="SysAdmin">SysAdmin</option>
              </select>
              <Button className="w-full" onClick={handleRoleUpdate} disabled={saving || newRole === user.role}>
                {saving ? (isVi ? 'Đang lưu...' : 'Saving...') : (isVi ? 'Lưu vai trò' : 'Save Role')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </SysShell>
  )
}

