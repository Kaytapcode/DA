import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
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
  glassEffect = false,
  ...rest
}) => {
  const glassClass = glassEffect
    ? 'bg-white/70 backdrop-blur-xl border border-outline-variant/15'
    : 'bg-surface-container border border-outline-variant'

  return (
    <div className={`${glassClass} rounded-xl p-6 ${className}`} {...rest}>
      {children}
    </div>
  )
}
