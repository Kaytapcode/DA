// Navigation structure for all parts of the app
import { TranslationKey } from '@/i18n/translations'

export interface NavItem {
  id: string
  labelKey: TranslationKey
  icon: string
  path: string
  badge?: number
  subItems?: NavItem[]
}

// User Navigation - organized by priority and frequency of use
// Primary: Learning experience | Secondary: Library & support
export const USER_NAV_ITEMS: NavItem[] = [
  // Primary Learning Tasks
  { id: 'home', labelKey: 'common.home', icon: 'home', path: '/user/home' },
  { id: 'organizations', labelKey: 'common.organizations', icon: 'corporate_fare', path: '/user/organizations' },
  { id: 'courses', labelKey: 'common.courses', icon: 'school', path: '/user/courses' },
  { id: 'browse-courses', labelKey: 'user.browseCourses', icon: 'travel_explore', path: '/user/courses/browse' },
  { id: 'dashboard', labelKey: 'common.dashboard', icon: 'dashboard', path: '/user/dashboard' },
  { id: 'learning', labelKey: 'user.learning', icon: 'history', path: '/user/learning' },
  
  // Learning Tools (Divider)
  // { id: 'quiz', labelKey: 'user.quiz', icon: 'quiz', path: '/user/quiz' },
  // { id: 'flashcards', labelKey: 'user.flashcards', icon: 'collections_bookmark', path: '/user/flashcards' },
  // { id: 'lesson', labelKey: 'user.lesson', icon: 'video_library', path: '/user/lesson' },
  // { id: 'documents', labelKey: 'user.documents', icon: 'description', path: '/user/documents' },
  
  // Resources
  { id: 'search', labelKey: 'user.search', icon: 'search', path: '/user/search' },
  { id: 'library', labelKey: 'user.library', icon: 'library_books', path: '/user/library' },
  { id: 'collections', labelKey: 'user.collections', icon: 'folder', path: '/user/collections' },
  { id: 'browse', labelKey: 'user.browse', icon: 'explore', path: '/user/browse' },
  // { id: 'messages', labelKey: 'common.notifications', icon: 'mail', path: '/user/messages' },
  // { id: 'profile', labelKey: 'common.profile', icon: 'person', path: '/user/profile' },
]

// Org Admin Navigation - organized by admin responsibility priority
// Tier 1: Core admin functions | Tier 2: Management | Tier 3: Configuration
export const ORG_ADMIN_NAV_ITEMS: NavItem[] = [
  // Core Administration
  { id: 'dashboard', labelKey: 'common.dashboard', icon: 'dashboard', path: '/admin/dashboard' },
  { id: 'courses', labelKey: 'admin.courseManagement', icon: 'school', path: '/admin/courses' },
  { id: 'members', labelKey: 'admin.memberManagement', icon: 'group', path: '/admin/members' },
  
  // Analytics & Insights
  { id: 'reports', labelKey: 'admin.reports', icon: 'assessment', path: '/admin/reports' },
  
  // Content Management
  { id: 'editor', labelKey: 'admin.courseEditor', icon: 'edit', path: '/admin/editor' },
  { id: 'content', labelKey: 'admin.content', icon: 'inventory_2', path: '/admin/content' },
]

// System Admin Navigation - organized by system oversight priority
// Tier 1: System overview | Tier 2: User/org management | Tier 3: Monitoring & logs
export const SYSADMIN_NAV_ITEMS: NavItem[] = [
  // System Overview
  { id: 'overview', labelKey: 'sysadmin.overview', icon: 'dashboard', path: '/sysadmin/overview' },
  
  // Platform Management (High Priority)
  { id: 'orgs', labelKey: 'sysadmin.organizations', icon: 'corporate_fare', path: '/sysadmin/orgs' },
  { id: 'users', labelKey: 'sysadmin.users', icon: 'people', path: '/sysadmin/users' },
  
  // Content Oversight
  { id: 'content', labelKey: 'sysadmin.content', icon: 'inventory_2', path: '/sysadmin/content' },
  { id: 'courses', labelKey: 'sysadmin.courses', icon: 'school', path: '/sysadmin/courses' },

  // // System Monitoring & Logs
  // { id: 'logs', labelKey: 'sysadmin.logs', icon: 'receipt_long', path: '/sysadmin/logs' },

  // // AI configuration (spec §1: SysAdmin "Configure AI API Keys")
  // { id: 'ai-keys', labelKey: 'sysadmin.aiKeys', icon: 'vpn_key', path: '/sysadmin/ai-keys' },

  // // Settings & Configuration
  // { id: 'settings', labelKey: 'sysadmin.settings', icon: 'settings', path: '/sysadmin/settings' },
]

// Branding
export const APP_BRAND = {
  name: 'Lumina',
  tagline: 'Learning Platform',
}
