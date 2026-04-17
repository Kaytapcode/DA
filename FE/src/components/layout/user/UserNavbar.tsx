import React from 'react'
import { Navbar } from '../Navbar'

interface UserNavbarProps {
  title?: string
  userDisplayName?: string
  notificationCount?: number
}

/**
 * User Navbar
 * Displays regular user role with blue accent theme for learning-focused interface
 */
export const UserNavbar: React.FC<UserNavbarProps> = ({ 
  title,
  userDisplayName = 'Learner',
  notificationCount = 0,
}) => {
  return (
    <Navbar
      title={title || 'Learning Dashboard'}
      profilePath="/user/profile"
      settingsPath="/user/settings"
      notificationsPath="/notifications"
      logoutPath="/login"
      userDisplayName={userDisplayName}
      userRole="user"
      notificationCount={notificationCount}
      showSearch={true}
      showUserMenu={true}
    />
  )
}
