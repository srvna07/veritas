import { createTheme } from '@mui/material/styles';

/** Semantic colors for test outcomes, used across run results, RTM and charts. */
export interface StatusPalette {
  passed: string;
  failed: string;
  flaky: string;
  skipped: string;
  uncovered: string;
}

declare module '@mui/material/styles' {
  interface Palette {
    status: StatusPalette;
  }
  interface PaletteOptions {
    status?: StatusPalette;
  }
}

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#3f51b5' },
        status: {
          passed: '#2e7d32',
          failed: '#d32f2f',
          flaky: '#ed6c02',
          skipped: '#757575',
          uncovered: '#9e9e9e',
        },
      },
    },
    dark: {
      palette: {
        primary: { main: '#9fa8da' },
        status: {
          passed: '#66bb6a',
          failed: '#f44336',
          flaky: '#ffa726',
          skipped: '#9e9e9e',
          uncovered: '#757575',
        },
      },
    },
  },
  shape: { borderRadius: 8 },
  typography: { fontFamily: 'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif' },
});
