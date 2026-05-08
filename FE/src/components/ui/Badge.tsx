import React from 'react'
import Chip from '@mui/material/Chip'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactElement
  className?: string
}

const COLOR_MAP: Record<BadgeProps['variant'] & string, string> = {
  primary: '#e8eeff',
  secondary: '#f2f3f4',
  tertiary: '#fff3f0',
  error: '#ffeaea',
  success: '#e6f9f0',
  warning: '#fff8e1',
}

const TEXT_MAP: Record<BadgeProps['variant'] & string, string> = {
  primary: '#0050cb',
  secondary: '#5c5f60',
  tertiary: '#a33200',
  error: '#ba1a1a',
  success: '#1a7a4a',
  warning: '#b45309',
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className,
}) => {
  return (
    <Chip
      label={children}
      icon={icon}
      size={size === 'lg' ? 'medium' : 'small'}
      className={className}
      sx={{
        backgroundColor: COLOR_MAP[variant],
        color: TEXT_MAP[variant],
        fontWeight: 600,
        fontSize: size === 'lg' ? '0.875rem' : size === 'sm' ? '0.7rem' : '0.75rem',
        height: size === 'lg' ? 32 : size === 'sm' ? 20 : 24,
        '& .MuiChip-icon': { color: TEXT_MAP[variant] },
      }}
    />
  )
}
