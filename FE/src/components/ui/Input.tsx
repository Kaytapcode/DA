import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

/**
 * Reusable Input Component
 */
export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  helperText,
  className = "",
  ...props 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-on-surface mb-2">
          {label}
        </label>
      )}
      <input 
        className={`
          w-full px-4 py-2.5 rounded-lg border-2
          border-outline-variant bg-surface
          text-on-surface placeholder-on-surface-variant
          focus:outline-none focus:border-primary
          transition-colors duration-200
          ${error ? 'border-error' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-error mt-1">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-on-surface-variant mt-1">{helperText}</p>
      )}
    </div>
  )
}
