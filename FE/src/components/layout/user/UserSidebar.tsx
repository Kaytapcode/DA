import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import { USER_NAV_ITEMS, APP_BRAND } from '@constants/navigation'
import { t } from '@/i18n/translations'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { useAuthContext } from '@/contexts/AuthContext'

/**
 * User Sidebar
 * Organizes learning content by priority:
 * - Primary learning tasks
 * - Learning tools
 * - Resources and profile
 */
export const UserSidebar: React.FC = () => {
  const { user } = useAuthContext()
  const primaryIds = ['home', 'courses', 'dashboard', 'learning']
  // const toolIds = ['documents', 'flashcards', 'quiz']
  const resourceIds = ['library', 'collections', 'browse']

  const primaryItems = USER_NAV_ITEMS.filter((item) => primaryIds.includes(item.id))
  // const toolItems = USER_NAV_ITEMS.filter((item) => toolIds.includes(item.id))
  const resourceItems = USER_NAV_ITEMS.filter((item) => resourceIds.includes(item.id))

  const renderItem = (item: (typeof USER_NAV_ITEMS)[number]) => (
    <NavLink
      key={item.id}
      to={item.path}
      className={({ isActive }) => [
        'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200',
        isActive
          ? 'bg-[#eef2ff] text-[#3556f5] shadow-[0_8px_24px_rgba(53,86,245,0.12)]'
          : 'text-[#6d7a91] hover:bg-[#f4f7fb] hover:text-[#34405e]',
      ].join(' ')}
    >
      <span
        className={[
          'grid h-9 w-9 place-items-center rounded-xl transition-colors',
          'bg-white text-[#6d7a91] group-hover:text-[#3556f5]',
        ].join(' ')}
      >
        <MaterialIcon icon={item.icon} size="sm" />
      </span>
      <span className="flex-1">{t(item.labelKey)}</span>
    </NavLink>
  )

  return (
    <aside className="flex h-screen w-[260px] flex-col border-r border-[#e7ebf3] bg-[#f7f9fd] px-4 py-5 text-[#1e2a3b]">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#4d6df6] text-white shadow-lg shadow-[#4d6df633]">
          <MaterialIcon icon="auto_awesome" size="sm" fill />
        </div>
        <div>
          <div className="text-[22px] font-extrabold leading-none text-[#4d6df6]">{APP_BRAND.name}</div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7f8ca5]">
            {APP_BRAND.tagline}
          </div>
        </div>
      </div>

      <div className="space-y-1.5 overflow-y-auto pr-1">
        {primaryItems.map(renderItem)}

        <div className="my-3 h-px bg-[#e5ebf5]" />

        {/* {toolItems.map(renderItem)} */}

        {/* <div className="my-3 h-px bg-[#e5ebf5]" /> */}

        {resourceItems.map(renderItem)}
      </div>

      <Link
        to="/user/profile"
        className="mt-4 flex items-center gap-3 rounded-[22px] bg-white px-3 py-3 shadow-sm ring-1 ring-[#eef2f8] transition hover:ring-[#c8d3f1] hover:shadow-md"
      >
        <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-[#f0f4ff] text-[#4d6df6]">
          <MaterialIcon icon="person" size="sm" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-[#243043]">{user?.username ?? 'Guest'}</div>
          <div className="truncate text-xs font-medium text-[#7a879e]">{user?.role ?? 'Student'}</div>
        </div>
      </Link>
    </aside>
  )
}
