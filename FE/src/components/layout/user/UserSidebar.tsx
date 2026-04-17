import React from 'react'
import { Sidebar } from '../Sidebar'
import { USER_NAV_ITEMS } from '@constants/navigation'

/**
 * User Sidebar
 * Organizes learning content by priority:
 * - Divider at index 4: separates primary learning tasks from learning tools
 * - Divider at index 7: separates learning tools from resources
 */
export const UserSidebar: React.FC = () => {
  return (
    <Sidebar
      items={USER_NAV_ITEMS}
      title="Lumina"
      subtitle="Learning"
      sectionDividers={[4, 7]}
    />
  )
}
