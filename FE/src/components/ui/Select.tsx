import React from 'react'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: Array<{ value: string | number; label: string }>
  error?: string
  helperText?: string
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  helperText,
  className,
  value,
  disabled,
  required,
  onChange,
  name,
  id,
}) => {
  return (
    <TextField
      select
      label={label}
      error={!!error}
      helperText={error ?? helperText}
      className={className}
      value={value ?? ''}
      disabled={disabled}
      required={required}
      name={name}
      id={id}
      onChange={onChange as unknown as React.ChangeEventHandler<HTMLInputElement>}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  )
}
