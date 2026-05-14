import { PaletteMode, createTheme } from '@mui/material/styles'

export const createMuiTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'dark' ? '#7aa2ff' : '#0050cb',
      },
      secondary: {
        main: mode === 'dark' ? '#c5c7c8' : '#5c5f60',
      },
      background: {
        default: mode === 'dark' ? '#0f172a' : '#f7f9fc',
        paper: mode === 'dark' ? '#111827' : '#ffffff',
      },
      text: {
        primary: mode === 'dark' ? '#f8fafc' : '#191c1e',
        secondary: mode === 'dark' ? '#94a3b8' : '#424656',
      },
    },
    shape: {
      borderRadius: 12,
    },
  })

