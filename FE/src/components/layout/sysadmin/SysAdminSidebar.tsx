import React from 'react'
import { Sidebar } from '../Sidebar'
import { SYSADMIN_NAV_ITEMS } from '@constants/navigation'

/**
 * System Admin Sidebar
 * Organizes system functions by oversight priority:
 * - Divider at index 1: separates overview from platform management
 * - Divider at index 3: separates platform management from content oversight
 * - Divider at index 4: separates content from system monitoring
 */
export const SysAdminSidebar: React.FC = () => {
  return (
    <Sidebar
      items={SYSADMIN_NAV_ITEMS}
      title="Lumina"
      subtitle="System"
      sectionDividers={[1, 3, 4]}
    />
  )
}
