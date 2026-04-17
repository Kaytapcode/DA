import React from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { Sidebar } from '../../components/layout/Sidebar';

export const UserDashboard: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="p-8 flex-1">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">My Dashboard</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-[#1890ff]">
              <h3 className="font-semibold text-gray-500 uppercase tracking-wider text-sm">Enrolled Courses</h3>
              <p className="text-3xl font-bold text-gray-800 mt-2">4</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-green-500">
              <h3 className="font-semibold text-gray-500 uppercase tracking-wider text-sm">Completed Modules</h3>
              <p className="text-3xl font-bold text-gray-800 mt-2">15</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};