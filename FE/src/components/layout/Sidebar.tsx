import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Courses', path: '/courses' },
  { name: 'Members', path: '/members' },
  { name: 'Settings', path: '/settings' },
];

export const Sidebar: React.FC = () => {
  const linkClasses = "p-3 block rounded transition font-medium hover:bg-gray-700";
  const activeLinkClasses = "bg-gray-900";

  return (
    <aside className="w-64 bg-gray-800 text-white min-h-screen p-4 flex flex-col shadow-lg">
      <ul className="space-y-2 mt-4 flex-1">
        {navItems.map(item => (
          <li key={item.name}>
            <NavLink to={item.path} className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`}>
              {item.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
};