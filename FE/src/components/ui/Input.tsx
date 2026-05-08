import React from 'react'
import TextField from '@mui/material/TextField'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className,
  id,
  name,
  type,
  value,
  placeholder,
  disabled,
  autoComplete,
  onChange,
  onBlur,
  onFocus,
  required,
}) => {
  return (
    <TextField
      label={label}
      error={!!error}
      helperText={error ?? helperText}
      className={className}
      id={id}
      name={name}
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      autoComplete={autoComplete}
      onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
      onBlur={onBlur as React.FocusEventHandler<HTMLInputElement>}
      onFocus={onFocus as React.FocusEventHandler<HTMLInputElement>}
      required={required}
    />
  )
}
