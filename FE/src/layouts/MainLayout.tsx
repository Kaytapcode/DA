import React from 'react'

interface MainLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  navbar?: React.ReactNode
}

/**
 * Main Layout Component
 */
export const MainLayout: React.FC<MainLayoutProps> = ({ 
  children,
  sidebar,
  navbar
}) => {
  return (
    <div className="flex h-screen bg-surface">
      {sidebar}
      <div className="flex-1 flex flex-col overflow-hidden">
        {navbar}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
