import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '@components/ui/MaterialIcon';
import { useDarkMode } from '@hooks/useDarkMode';
import { useAuthContext } from '@/contexts/AuthContext';

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
  showThemeToggle?: boolean
}

export const Navbar: React.FC<NavbarProps> = ({
  title = 'Dashboard',
  profilePath = '/profile',
  notificationsPath = '/notifications',
  logoutPath = '/login',
  userDisplayName = 'User',
  userRole = 'user',
  notificationCount = 0,
  showSearch = false,
  showUserMenu = true,
  showThemeToggle = true,
}) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode()
  const { logout } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    logout();
    navigate(logoutPath, { replace: true });
  };

  return (
    <nav className="flex items-center justify-between border-b border-[#3a9cff] bg-[#1890ff] p-4 text-white shadow-md dark:border-slate-700 dark:bg-slate-900">
      <div className="text-xl font-bold tracking-wide">{title}</div>
      <div className="space-x-6 flex items-center">
        {/* {showSearch && (
          <input
            type="text"
            placeholder="Search..."
            className="rounded px-3 py-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-white/50 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
        )} */}
        {/* {showThemeToggle && (
          <button
            type="button"
            onClick={toggleDarkMode}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/15 transition hover:bg-white/25"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <MaterialIcon icon={isDarkMode ? 'light_mode' : 'dark_mode'} size="sm" />
          </button>
        )} */}
        {notificationCount > 0 && (
          <a href={notificationsPath} className="relative inline-block">
            <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">{notificationCount}</span>
          </a>
        )}
        {showUserMenu && (
          <div className="flex items-center gap-10">
            {/* <a href={profilePath} className="text-sm font-medium hover:text-gray-200 transition">Profile</a> */}
            <a href={logoutPath} onClick={handleLogout} className="text-sm font-medium bg-white text-[#1890ff] px-3 py-1 rounded hover:bg-gray-100 transition dark:bg-slate-100 dark:text-slate-900">Logout</a>
          </div>
        )}
      </div>
    </nav>
  );
};
