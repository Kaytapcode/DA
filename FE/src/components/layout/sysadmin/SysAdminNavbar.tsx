import React from 'react'
import { Navbar } from '../Navbar'

interface SysAdminNavbarProps {
  title?: string
  userDisplayName?: string
  notificationCount?: number
}

/**
 * System Admin Navbar
 * Displays SysAdmin role with red accent theme for system-level access
 */
export const SysAdminNavbar: React.FC<SysAdminNavbarProps> = ({ 
  title,
  userDisplayName = 'System Administrator',
  notificationCount = 0,
}) => {
  return (
    <Navbar
      title={title || 'System Administration'}
      profilePath="/sysadmin/user-details"
      settingsPath="/sysadmin/settings"
      notificationsPath="/notifications"
      logoutPath="/login"
      userDisplayName={userDisplayName}
      userRole="sysadmin"
      notificationCount={notificationCount}
      showSearch={true}
      showUserMenu={true}
    />
  )
}
