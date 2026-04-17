import React from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { Sidebar } from '../../components/layout/Sidebar';
import { Table } from '../../components/ui/Table';

export const GlobalAdminDashboard: React.FC = () => {
  const orgColumns = [
    { key: 'name', header: 'Organization Name' },
    { key: 'slug', header: 'URL Slug' },
    { key: 'members', header: 'Total Members' },
    { key: 'status', header: 'System Status' }
  ];

  const orgData = [
    { id: 1, name: 'VNU University', slug: 'vnu', members: 1542, status: 'Active' },
    { id: 2, name: 'FPT Software', slug: 'fpt', members: 890, status: 'Active' },
    { id: 3, name: 'Demo Org', slug: 'demo', members: 12, status: 'Suspended' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="p-8 flex-1">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">System Administration</h1>
            <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition font-medium shadow-sm">
              Manage Global Banners
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Organizations</h2>
              <button className="text-sm font-medium bg-[#1890ff] text-white px-3 py-1 rounded hover:bg-blue-600">
                + Add Organization
              </button>
            </div>
            
            <Table columns={orgColumns} data={orgData} />
          </div>

        </main>
      </div>
    </div>
  );
};
