import React from 'react'
import { Sidebar } from '../Sidebar'
import { ORG_ADMIN_NAV_ITEMS } from '@constants/navigation'
import { useAuthContext } from '@/contexts/AuthContext'

/**
 * Organization Admin Sidebar
 * Organizes admin functions by priority:
 * - Divider at index 3: separates core admin from analytics
 * - Divider at index 4: separates analytics from content management
 */
export const OrgAdminSidebar: React.FC = () => {
  const { user } = useAuthContext()

  return (
    <Sidebar
      items={ORG_ADMIN_NAV_ITEMS}
      title="Lumina"
      subtitle="Admin"
      sectionDividers={[3, 4]}
      variant="orgadmin"
      profileName={user?.username || 'Organization Admin'}
      profileRole={user?.role || 'OrgAdmin'}
      profileIcon="business"
    />
  )
}
