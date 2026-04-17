import React, { useEffect, ReactNode } from 'react';
import { useParams, Navigate, Outlet } from 'react-router-dom';
import { useOrgContext } from '@/contexts/OrgContext';

interface OrgLayoutProps {
  children?: ReactNode;
}

export const OrgLayout: React.FC<OrgLayoutProps> = ({ children }) => {
  const { slug } = useParams<{ slug: string }>();
  const { org, isLoading, resolveBySlug } = useOrgContext();

  useEffect(() => {
    if (slug && (!org || org.slug !== slug)) {
      resolveBySlug(slug);
    }
  }, [slug, org, resolveBySlug]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading organization...</p>
        </div>
      </div>
    );
  }

  if (!isLoading && !org && slug) {
    return <Navigate to="/" replace />;
  }

  return <>{children ?? <Outlet />}</>;
};
