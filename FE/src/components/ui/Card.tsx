import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  glassEffect?: boolean
}

/**
 * Reusable Card Component with optional glass effect
 */
export const Card: React.FC<CardProps> = ({ 
  children, 
  className = "",
  glassEffect = false 
}) => {
  const glassClass = glassEffect 
    ? 'bg-white/70 backdrop-blur-xl border border-outline-variant/15'
    : 'bg-surface-container border border-outline-variant'
  
  return (
    <div className={`${glassClass} rounded-xl p-6 ${className}`}>
      {children}
    </div>
  )
}
