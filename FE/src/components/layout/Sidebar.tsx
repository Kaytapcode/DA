import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { NavItem } from '@/constants/navigation'
import { t } from '@/i18n/translations'

interface SidebarProps {
  items?: NavItem[]
  title?: string
  subtitle?: string
  sectionDividers?: number[]
}

export const Sidebar: React.FC<SidebarProps> = ({
  items = [],
  title = 'App',
  subtitle = 'Navigation',
  sectionDividers = []
}) => {
  const location = useLocation()
  const isReview = location.pathname.endsWith('_review')
  const linkClasses = "p-3 block rounded transition font-medium hover:bg-gray-700";
  const activeLinkClasses = "bg-gray-900";

  return (
    <aside className="w-64 bg-gray-800 text-white min-h-screen p-4 flex flex-col shadow-lg">
      <div className="mb-6">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <ul className="space-y-2 flex-1">
        {items.map((item, index) => (
          <React.Fragment key={item.id || item.path}>
            <li>
              <NavLink to={isReview ? `${item.path}_review` : item.path} className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`}>
                {t(item.labelKey)}
              </NavLink>
              {item.badge && <span className="ml-2 bg-red-500 text-xs px-2 py-1 rounded">{item.badge}</span>}
            </li>
            {sectionDividers?.includes(index) && <li className="border-t border-gray-600 my-2"></li>}
          </React.Fragment>
        ))}
      </ul>
    </aside>
  );
};
