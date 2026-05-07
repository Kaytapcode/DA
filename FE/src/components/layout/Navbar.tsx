import React from 'react';

interface NavbarProps {
  title?: string
  profilePath?: string
  settingsPath?: string
  notificationsPath?: string
  logoutPath?: string
  userDisplayName?: string
  userRole?: string
  notificationCount?: number
  showSearch?: boolean
  showUserMenu?: boolean
}

export const Navbar: React.FC<NavbarProps> = ({
  title = 'Dashboard',
  profilePath = '/profile',
  settingsPath = '/settings',
  notificationsPath = '/notifications',
  logoutPath = '/login',
  userDisplayName = 'User',
  userRole = 'user',
  notificationCount = 0,
  showSearch = false,
  showUserMenu = true,
}) => {
  return (
    <nav className="bg-[#1890ff] p-4 text-white flex justify-between items-center shadow-md">
      <div className="text-xl font-bold tracking-wide">{title}</div>
      <div className="space-x-6 flex items-center">
        {showSearch && <input type="text" placeholder="Search..." className="px-3 py-1 rounded text-black text-sm" />}
        {notificationCount > 0 && (
          <a href={notificationsPath} className="relative inline-block">
            <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">{notificationCount}</span>
          </a>
        )}
        {showUserMenu && (
          <div className="flex items-center gap-2">
            <span className="text-sm">{userDisplayName} ({userRole})</span>
            <a href={profilePath} className="text-sm font-medium hover:text-gray-200 transition">Profile</a>
            <a href={settingsPath} className="text-sm font-medium hover:text-gray-200 transition">Settings</a>
            <a href={logoutPath} className="text-sm font-medium bg-white text-[#1890ff] px-3 py-1 rounded hover:bg-gray-100 transition">Logout</a>
          </div>
        )}
      </div>
    </nav>
  );
};