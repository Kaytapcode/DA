import React from 'react'
import { MaterialIcon } from './MaterialIcon'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  className?: string
}

/**
 * Reusable Badge Component
 */
export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  icon,
  className = ""
}) => {
  const variants = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    tertiary: 'bg-tertiary/10 text-tertiary',
    error: 'bg-error/10 text-error',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-warning/10 text-warning',
  }

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  return (
    <span className={`
      inline-flex items-center gap-1 rounded-full font-medium
      ${variants[variant]} ${sizes[size]} ${className}
    `}>
      {icon && <MaterialIcon icon={icon} className="text-xs" />}
      {children}
    </span>
  )
}
