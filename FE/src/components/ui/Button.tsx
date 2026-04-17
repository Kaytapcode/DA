import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

/**
 * Reusable Button Component
 */
export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  className = "",
  children,
  ...props 
}) => {
  const baseStyles = "font-medium rounded-lg transition-all active:scale-95 duration-200"
  
  const variants = {
    primary: "bg-primary text-on-primary hover:bg-primary/90",
    secondary: "bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80",
    tertiary: "bg-tertiary-container text-on-tertiary-container hover:bg-tertiary-container/80",
    ghost: "text-on-surface hover:bg-surface-container-low"
  }
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-2.5 text-base",
    lg: "px-8 py-3 text-lg"
  }
  
  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
