import React from 'react';

export const Navbar: React.FC = () => {
  return (
    <nav className="bg-[#1890ff] p-4 text-white flex justify-between items-center shadow-md">
      <div className="text-xl font-bold tracking-wide">Tiny-LMS</div>
      <div className="space-x-6 flex items-center">
        <button className="text-sm font-medium hover:text-gray-200 transition">Profile</button>
        <button className="text-sm font-medium bg-white text-[#1890ff] px-3 py-1 rounded hover:bg-gray-100 transition">Logout</button>
      </div>
    </nav>
  );
};