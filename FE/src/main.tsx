import './index.css'
import App from './App.tsx'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { AuthProvider } from './contexts/AuthContext'
import { OrgProvider } from './contexts/OrgContext'
import { ToastProvider } from './contexts/ToastContext'
import { DarkModeProvider, useDarkMode } from './hooks/useDarkMode'
import { createMuiTheme } from './theme/muiTheme'

const AppProviders: React.FC = () => {
  const { mode } = useDarkMode()
  const theme = React.useMemo(() => createMuiTheme(mode), [mode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <OrgProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </OrgProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DarkModeProvider>
      <AppProviders />
    </DarkModeProvider>
  </React.StrictMode>,
)
