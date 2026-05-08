import './index.css'
import App from './App.tsx'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AuthProvider } from './contexts/AuthContext'
import { OrgProvider } from './contexts/OrgContext'
import { ToastProvider } from './contexts/ToastContext'
import muiTheme from './theme/muiTheme'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <AuthProvider>
        <OrgProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </OrgProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
