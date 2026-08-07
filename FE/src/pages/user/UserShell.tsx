import React from 'react'
import { MainLayout } from '@layouts/MainLayout'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { OrgAdminNavbar } from '@components/layout/orgadmin/OrgAdminNavbar'
import { OrgAdminSidebar } from '@components/layout/orgadmin/OrgAdminSidebar'
import { getCurrentLanguage } from '@/i18n/translations'

export const useUserLanguage = () => getCurrentLanguage() === 'vi'

// Roles that should see the OrgAdmin CMS chrome (sidebar/header) when `roleAwareChrome` is on.
const ADMIN_ROLES = new Set(['OrgAdmin', 'Teacher', 'SysAdmin'])

const getCurrentUserRole = (): string | null => {
  try {
    const raw = localStorage.getItem('auth_user')
    if (!raw) return null
    return (JSON.parse(raw) as { role?: string }).role ?? null
  } catch {
    return null
  }
}

interface UserShellProps {
  titleEn: string
  titleVi: string
  subtitleEn: string
  subtitleVi: string
  children: React.ReactNode
  // When true, OrgAdmin/Teacher/SysAdmin callers get the OrgAdmin CMS chrome instead of the
  // end-user navbar/sidebar — so e.g. opening a quiz from a course keeps them in the admin shell
  // rather than dumping them into the learner UI. Opt-in: most user pages leave this off.
  roleAwareChrome?: boolean
}

export const UserShell: React.FC<UserShellProps> = ({ titleEn, titleVi, subtitleEn, subtitleVi, children, roleAwareChrome }) => {
  const isVi = useUserLanguage()
  const isAdminChrome = roleAwareChrome === true && ADMIN_ROLES.has(getCurrentUserRole() ?? '')

  const navbar = isAdminChrome
    ? <OrgAdminNavbar title={isVi ? titleVi : titleEn} />
    : <UserNavbar title={isVi ? titleVi : titleEn} />
  const sidebar = isAdminChrome ? <OrgAdminSidebar /> : <UserSidebar />

  return (
    <MainLayout navbar={navbar} sidebar={sidebar}>
      <div className="p-8" data-testid={isAdminChrome ? 'shell-admin-chrome' : 'shell-user-chrome'}>
        <div className="mx-auto max-w-6xl space-y-8">
          <div>
            <h2 className="mb-2 text-3xl font-bold text-on-surface font-headline">{isVi ? titleVi : titleEn}</h2>
            <p className="text-on-surface-variant">{isVi ? subtitleVi : subtitleEn}</p>
          </div>
          {children}
        </div>
      </div>
    </MainLayout>
  )
}
