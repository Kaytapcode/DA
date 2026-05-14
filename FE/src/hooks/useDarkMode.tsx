import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { PaletteMode } from '@mui/material/styles'

const THEME_STORAGE_KEY = 'theme_mode'

interface DarkModeContextValue {
  mode: PaletteMode
  isDarkMode: boolean
  toggleDarkMode: () => void
}

const getInitialMode = (): PaletteMode => {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return stored === 'dark' ? 'dark' : 'light'
}

const DarkModeContext = createContext<DarkModeContextValue | null>(null)

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<PaletteMode>(getInitialMode)

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }, [mode])

  const value = useMemo<DarkModeContextValue>(
    () => ({
      mode,
      isDarkMode: mode === 'dark',
      toggleDarkMode: () => setMode((current) => (current === 'dark' ? 'light' : 'dark')),
    }),
    [mode]
  )

  return <DarkModeContext.Provider value={value}>{children}</DarkModeContext.Provider>
}

export const useDarkMode = (): DarkModeContextValue => {
  const context = useContext(DarkModeContext)
  if (!context) throw new Error('useDarkMode must be used within DarkModeProvider')
  return context
}
