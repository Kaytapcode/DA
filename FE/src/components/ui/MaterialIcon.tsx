import React from 'react'

export interface MaterialIconProps {
  icon: string
  className?: string
  fill?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
  xs: 'w-3 h-3 text-xs',
  sm: 'w-4 h-4 text-sm',
  md: 'w-6 h-6 text-base',
  lg: 'w-8 h-8 text-lg',
  xl: 'w-10 h-10 text-xl',
}

/**
 * Material Symbol Icon Component
 * Uses Google's Material Symbols Outlined
 */
export const MaterialIcon: React.FC<MaterialIconProps> = ({ 
  icon, 
  className = "",
  fill = false,
  size = 'md'
}) => {
  return (
    <span 
      className={`material-symbols-outlined ${sizeMap[size]} ${className}`}
      style={{ 
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`
      }}
    >
      {icon}
    </span>
  )
}
