import React from 'react'
import { MaterialIcon } from '../ui/MaterialIcon'

export type UserRole = 'user' | 'orgadmin' | 'sysadmin'

interface RoleIndicatorProps {
  role: UserRole
  displayName: string
  compact?: boolean
}

const roleConfig = {
  user: {
    label: 'Learner',
    icon: 'school',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-300',
    badgeColor: 'bg-blue-200 dark:bg-blue-700',
  },
  orgadmin: {
    label: 'Org Admin',
    icon: 'business',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-300',
    badgeColor: 'bg-purple-200 dark:bg-purple-700',
  },
  sysadmin: {
    label: 'System Admin',
    icon: 'shield_admin',
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-300',
    badgeColor: 'bg-red-200 dark:bg-red-700',
  },
}

/**
 * Role indicator badge - displays user role with icon and label
 * Provides visual distinction between user types
 */
export const RoleIndicator: React.FC<RoleIndicatorProps> = ({
  role,
  displayName,
  compact = false,
}) => {
  const config = roleConfig[role]

  if (compact) {
    return (
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${config.bgColor} ${config.textColor}`}
        title={config.label}
      >
        <MaterialIcon icon={config.icon} size="sm" />
        <span>{config.label}</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-current/10 ${config.bgColor}`}>
      <div className={`p-2 rounded-full ${config.badgeColor}`}>
        <MaterialIcon icon={config.icon} className={config.textColor} />
      </div>
      <div className="flex flex-col">
        <span className={`text-xs font-semibold uppercase tracking-wide ${config.textColor}`}>
          {config.label}
        </span>
        <span className="text-xs text-on-surface-variant font-medium">{displayName}</span>
      </div>
    </div>
  )
}
