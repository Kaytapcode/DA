/**
 * App Configuration Constants
 */

export const APP_NAME = 'Luminal'
export const APP_VERSION = '0.0.1'

export const COLORS = {
  primary: '#0050cb',
  secondary: '#5c5f60',
  tertiary: '#a33200',
  error: '#ba1a1a',
}

// Legacy menu items - use navigation.ts for new code
export const MENU_ITEMS = [
  { label: 'Home', icon: 'home', href: '/' },
  { label: 'Courses', icon: 'school', href: '/courses' },
  { label: 'Notifications', icon: 'notifications', href: '/notifications' },
  { label: 'Settings', icon: 'settings', href: '/settings' },
]

export const ADMIN_MENU_ITEMS = [
  { label: 'Dashboard', icon: 'dashboard', href: '/admin' },
  { label: 'Users', icon: 'people', href: '/admin/users' },
  { label: 'Courses', icon: 'school', href: '/admin/courses' },
  { label: 'Reports', icon: 'assessment', href: '/admin/reports' },
  { label: 'Settings', icon: 'settings', href: '/admin/settings' },
]

// Re-export navigation items from navigation.ts
export { USER_NAV_ITEMS, ORG_ADMIN_NAV_ITEMS, SYSADMIN_NAV_ITEMS, APP_BRAND } from './navigation'
