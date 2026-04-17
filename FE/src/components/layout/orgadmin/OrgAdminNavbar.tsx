import React from 'react'
import { Navbar } from '../Navbar'

interface OrgAdminNavbarProps {
  title?: string
  userDisplayName?: string
  notificationCount?: number
}

/**
 * Organization Admin Navbar
 * Displays OrgAdmin role with purple accent theme
 */
export const OrgAdminNavbar: React.FC<OrgAdminNavbarProps> = ({ 
  title,
  userDisplayName = 'Organization Admin',
  notificationCount = 0,
}) => {
  return (
    <Navbar
      title={title || 'Admin Dashboard'}
      profilePath="/admin/members"
      settingsPath="/admin/settings"
      notificationsPath="/notifications"
      logoutPath="/login"
      userDisplayName={userDisplayName}
      userRole="orgadmin"
      notificationCount={notificationCount}
      showSearch={true}
      showUserMenu={true}
    />
  )
}
