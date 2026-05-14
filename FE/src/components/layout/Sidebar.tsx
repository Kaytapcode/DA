import React from 'react';
import { NavLink } from 'react-router-dom';
import { NavItem } from '@/constants/navigation'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { t } from '@/i18n/translations'

type SidebarVariant = 'default' | 'orgadmin' | 'sysadmin'

interface SidebarProps {
  items?: NavItem[]
  title?: string
  subtitle?: string
  sectionDividers?: number[]
  variant?: SidebarVariant
  profileName?: string
  profileRole?: string
  profileIcon?: string
}

const variantStyles: Record<SidebarVariant, {
  logo: string
  title: string
  activeLink: string
  inactiveLink: string
  icon: string
  divider: string
  profileAvatar: string
}> = {
  default: {
    logo: 'bg-[#4d6df6] shadow-lg shadow-[#4d6df633]',
    title: 'text-[#4d6df6]',
    activeLink: 'bg-[#eef2ff] text-[#3556f5] shadow-[0_8px_24px_rgba(53,86,245,0.12)] dark:bg-slate-800 dark:text-slate-100',
    inactiveLink: 'text-[#6d7a91] hover:bg-[#f4f7fb] hover:text-[#34405e] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
    icon: 'bg-white text-[#6d7a91] group-hover:text-[#3556f5] dark:bg-slate-800 dark:text-slate-300 dark:group-hover:text-slate-100',
    divider: 'bg-[#e5ebf5] dark:bg-slate-700',
    profileAvatar: 'bg-[#f0f4ff] text-[#4d6df6] dark:bg-slate-700 dark:text-slate-100',
  },
  orgadmin: {
    logo: 'bg-[#7c3aed] shadow-lg shadow-[#7c3aed33]',
    title: 'text-[#7c3aed]',
    activeLink: 'bg-[#f3e8ff] text-[#6d28d9] shadow-[0_8px_24px_rgba(109,40,217,0.12)] dark:bg-slate-800 dark:text-slate-100',
    inactiveLink: 'text-[#6d7a91] hover:bg-[#faf5ff] hover:text-[#5b21b6] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
    icon: 'bg-white text-[#7f8ca5] group-hover:text-[#6d28d9] dark:bg-slate-800 dark:text-slate-300 dark:group-hover:text-slate-100',
    divider: 'bg-[#eadcff] dark:bg-slate-700',
    profileAvatar: 'bg-[#f6f0ff] text-[#6d28d9] dark:bg-slate-700 dark:text-slate-100',
  },
  sysadmin: {
    logo: 'bg-[#dc2626] shadow-lg shadow-[#dc262633]',
    title: 'text-[#dc2626]',
    activeLink: 'bg-[#fee2e2] text-[#b91c1c] shadow-[0_8px_24px_rgba(185,28,28,0.12)] dark:bg-slate-800 dark:text-slate-100',
    inactiveLink: 'text-[#6d7a91] hover:bg-[#fef2f2] hover:text-[#991b1b] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
    icon: 'bg-white text-[#7f8ca5] group-hover:text-[#b91c1c] dark:bg-slate-800 dark:text-slate-300 dark:group-hover:text-slate-100',
    divider: 'bg-[#fee2e2] dark:bg-slate-700',
    profileAvatar: 'bg-[#fff1f2] text-[#b91c1c] dark:bg-slate-700 dark:text-slate-100',
  },
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  items = [],
  title = 'App',
  subtitle = 'Navigation',
  sectionDividers = [],
  variant = 'default',
  profileName,
  profileRole,
  profileIcon = 'person',
}) => {
  const styles = variantStyles[variant]

  return (
    <aside className="flex h-screen w-[260px] flex-col border-r border-[#e7ebf3] bg-[#f7f9fd] px-4 py-5 text-[#1e2a3b] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className={`grid h-10 w-10 place-items-center rounded-2xl text-white ${styles.logo}`}>
          <MaterialIcon icon="auto_awesome" size="sm" fill />
        </div>
        <div>
          <div className={`text-[22px] font-extrabold leading-none ${styles.title} dark:text-white`}>{title}</div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7f8ca5] dark:text-slate-400">
            {subtitle}
          </div>
        </div>
      </div>

      <ul className="space-y-1.5 flex-1 overflow-y-auto pr-1">
        {items.map((item, index) => (
          <React.Fragment key={item.id || item.path}>
            <li>
              <NavLink
                to={item.path}
                className={({ isActive }) => [
                  'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                  isActive ? styles.activeLink : styles.inactiveLink,
                ].join(' ')}
              >
                <span className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${styles.icon}`}>
                  <MaterialIcon icon={item.icon} size="sm" />
                </span>
                <span className="flex-1 truncate">{t(item.labelKey)}</span>
                {item.badge !== undefined && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{item.badge}</span>
                )}
              </NavLink>
            </li>
            {sectionDividers.includes(index) && <li className={`my-3 h-px ${styles.divider}`} />}
          </React.Fragment>
        ))}
      </ul>

      {profileName && profileRole && (
        <div className="mt-4 flex items-center gap-3 rounded-[22px] bg-white px-3 py-3 shadow-sm ring-1 ring-[#eef2f8] dark:bg-slate-800 dark:ring-slate-700">
          <div className={`grid h-11 w-11 place-items-center overflow-hidden rounded-full ${styles.profileAvatar}`}>
            <MaterialIcon icon={profileIcon} size="sm" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-[#243043] dark:text-slate-100">{profileName}</div>
            <div className="truncate text-xs font-medium text-[#7a879e] dark:text-slate-400">{profileRole}</div>
          </div>
        </div>
      )}
    </aside>
  );
};
