import React, { useEffect } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { Sidebar } from '../../components/layout/Sidebar';
import { Table } from '../../components/ui/Table';
import { useOrganization } from '@/hooks/useOrganization';

export const GlobalAdminDashboard: React.FC = () => {
  const { organizations, isLoading, error, fetchOrganizations } = useOrganization();

  useEffect(() => {
    void fetchOrganizations(0, 50);
  }, [fetchOrganizations]);

  const orgColumns = [
    { key: 'name', header: 'Organization Name' },
    { key: 'slug', header: 'URL Slug' },
    { key: 'memberCount', header: 'Total Members' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="p-8 flex-1">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">System Administration</h1>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Organizations</h2>
            {isLoading && <div className="h-24 animate-pulse rounded bg-gray-100" data-testid="org-loading" />}
            {error && !isLoading && <p className="text-sm text-red-600">{error}</p>}
            {!isLoading && !error && organizations.length === 0 && (
              <p className="text-sm text-gray-500" data-testid="org-empty">No organizations yet.</p>
            )}
            {!isLoading && organizations.length > 0 && <Table columns={orgColumns} data={organizations} />}
          </div>
        </main>
      </div>
    </div>
  );
};
