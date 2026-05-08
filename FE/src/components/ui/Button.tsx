import React from 'react'
import MuiButton from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

const MUI_VARIANT_MAP = {
  primary: 'contained',
  secondary: 'outlined',
  tertiary: 'outlined',
  ghost: 'text',
} as const

const MUI_COLOR_MAP = {
  primary: 'primary',
  secondary: 'secondary',
  tertiary: 'primary',
  ghost: 'primary',
} as const

const SIZE_MAP = {
  sm: 'small',
  md: 'medium',
  lg: 'large',
} as const

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  onClick,
  type,
}) => {
  return (
    <MuiButton
      variant={MUI_VARIANT_MAP[variant]}
      color={MUI_COLOR_MAP[variant]}
      size={SIZE_MAP[size]}
      disabled={disabled || loading}
      className={className}
      onClick={onClick}
      type={type as 'button' | 'submit' | 'reset' | undefined}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
    >
      {children}
    </MuiButton>
  )
}
