import React from 'react';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-extrabold text-[#1890ff] mb-6">Welcome to Tiny-LMS</h1>
        <p className="text-xl text-slate-500 text-lg max-w-md mx-auto mb-10">The Multi-tenant Learning Management Platform designed for speed and simplicity.</p>
        <div className="space-x-4">
          <Link to="/login" className="px-8 py-3 bg-[#1890ff] text-white rounded shadow hover:bg-blue-600 transition font-medium">Sign In</Link>
          <Link to="/register" className="px-8 py-3 bg-white text-[#1890ff] border border-[#1890ff] rounded shadow-sm hover:bg-blue-50 transition font-medium">Create Organization</Link>
        </div>
      </div>
    </div>
  );
};