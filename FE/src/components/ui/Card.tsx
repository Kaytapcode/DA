import React from 'react'
import MuiCard from '@mui/material/Card'

interface CardProps {
  children: React.ReactNode
  className?: string
  glassEffect?: boolean
}

export const Card: React.FC<CardProps> = ({ children, className = '', glassEffect = false }) => {
  const glassStyle = glassEffect
    ? { background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(40px)', border: '1px solid rgba(194,198,216,0.15)' }
    : {}

  return (
    <MuiCard className={className} sx={{ p: 3, ...glassStyle }}>
      {children}
    </MuiCard>
  )
}
