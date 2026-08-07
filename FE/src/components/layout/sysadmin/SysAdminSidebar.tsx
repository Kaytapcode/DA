import React from 'react'
import { Sidebar } from '../Sidebar'
import { SYSADMIN_NAV_ITEMS } from '@constants/navigation'
import { useAuthContext } from '@/contexts/AuthContext'

/**
 * System Admin Sidebar
 * Organizes system functions by oversight priority:
 * - Divider at index 1: separates overview from platform management
 * - Divider at index 3: separates platform management from content oversight
 * - Divider at index 4: separates content from system monitoring
 */
export const SysAdminSidebar: React.FC = () => {
  const { user } = useAuthContext()

  return (
    <Sidebar
      items={SYSADMIN_NAV_ITEMS}
      title="Lumina"
      subtitle="System"
      // sectionDividers={[1, 3, 4]}
      variant="sysadmin"
      profileName={user?.username || 'System Administrator'}
      profileRole={user?.role || 'SysAdmin'}
      profileIcon="admin_panel_settings"
    />
  )
}
