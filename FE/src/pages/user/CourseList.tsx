import React, { useState } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { Sidebar } from '../../components/layout/Sidebar';
import { Table } from '../../components/ui/Table';

export const CourseList: React.FC = () => {
  const [filter, setFilter] = useState('');

  const columns = [
    { key: 'title', header: 'Course Title' },
    { key: 'description', header: 'Description' },
    { key: 'status', header: 'Status' }
  ];

  // Mock data based on schema
  const data = [
    { title: 'Introduction to Programming', description: 'Learn the basics of coding.', status: 'Published' },
    { title: 'Advanced React Patterns', description: 'Deep dive into React 18.', status: 'Draft' },
  ];

  const filteredData = data.filter(c => c.title.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="p-8 flex-1">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Course List</h1>
            <input type="text" placeholder="Search courses..." value={filter} onChange={e => setFilter(e.target.value)} className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1890ff] w-1/3" />
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <Table columns={columns} data={filteredData} />
          </div>
        </main>
      </div>
    </div>
  );
};