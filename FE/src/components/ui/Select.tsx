import React from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: Array<{ value: string | number; label: string }>
  error?: string
  helperText?: string
}

/**
 * Reusable Select Component
 */
export const Select: React.FC<SelectProps> = ({ 
  label, 
  options,
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
      <select 
        className={`
          w-full px-4 py-2.5 rounded-lg border-2
          border-outline-variant bg-surface
          text-on-surface appearance-none
          focus:outline-none focus:border-primary
          transition-colors duration-200
          ${error ? 'border-error' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-error mt-1">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-on-surface-variant mt-1">{helperText}</p>
      )}
    </div>
  )
}
