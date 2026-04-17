import React from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { Sidebar } from '../../components/layout/Sidebar';

export const OrgAdminDashboard: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="p-8 flex-1">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Organization Admin</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-purple-500">
              <h3 className="font-semibold text-gray-500 uppercase tracking-wider text-sm">Total Members</h3>
              <p className="text-4xl font-bold text-gray-800 mt-2">1,240</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-orange-500">
              <h3 className="font-semibold text-gray-500 uppercase tracking-wider text-sm">Active Courses</h3>
              <p className="text-4xl font-bold text-gray-800 mt-2">45</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Quick Actions</h2>
            <div className="flex space-x-4">
              <button className="bg-[#1890ff] text-white px-5 py-2 rounded hover:bg-blue-600 transition font-medium">Create Course</button>
              <button className="bg-white text-gray-700 border border-gray-300 px-5 py-2 rounded hover:bg-gray-50 transition font-medium">Invite Members</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};