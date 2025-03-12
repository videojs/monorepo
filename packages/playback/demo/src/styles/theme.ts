import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#1976d2' },
    secondary: { main: '#ff4081' },
    background: {
      default: '#1c1f26',
      paper: '#2c313c',
    },
    text: {
      primary: '#ffffff',
      secondary: '#a0a4af',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    fontSize: 14,
  },
});

export default theme;
