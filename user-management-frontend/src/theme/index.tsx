import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { colors } from './colors';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: colors.primary },
    secondary: { main: colors.secondary },
    error: { main: colors.error },
    warning: { main: colors.warning },
    info: { main: colors.info },
    success: { main: colors.success },
  },
  components: {
    MuiButton: { defaultProps: { variant: 'contained' } },
    MuiTextField: { defaultProps: { variant: 'outlined', size: 'small' } },
  },
});

export { theme };
export { ThemeProvider, CssBaseline };
