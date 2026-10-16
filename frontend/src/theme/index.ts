import { createTheme, type Theme } from '@mui/material/styles';
import { darkPalette, lightPalette } from './palette';
import { typography } from './typography';
import { components } from './components';

export type ThemeMode = 'light' | 'dark';

export function buildTheme(mode: ThemeMode): Theme {
  return createTheme({
    palette: mode === 'dark' ? darkPalette : lightPalette,
    typography,
    components,
    shape: { borderRadius: 8 },
    spacing: 8,
  });
}
