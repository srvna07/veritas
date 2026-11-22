import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    status: {
      passed: string;
      failed: string;
      flaky: string;
      skipped: string;
      uncovered: string;
    };
  }
  interface PaletteOptions {
    status?: Partial<Palette['status']>;
  }
}

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#3B4CCA' },
        secondary: { main: '#00897B' },
        background: { default: '#F6F7FB', paper: '#FFFFFF' },
        status: {
          passed: '#2E7D32',
          failed: '#D32F2F',
          flaky: '#ED6C02',
          skipped: '#757575',
          uncovered: '#6A1B9A',
        },
      },
    },
    dark: {
      palette: {
        primary: { main: '#8C9EFF' },
        secondary: { main: '#4DB6AC' },
        background: { default: '#0F1117', paper: '#171A23' },
        status: {
          passed: '#66BB6A',
          failed: '#EF5350',
          flaky: '#FFA726',
          skipped: '#9E9E9E',
          uncovered: '#BA68C8',
        },
      },
    },
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiCard: { defaultProps: { variant: 'outlined' } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiTextField: { defaultProps: { variant: 'outlined', fullWidth: true } },
  },
});
