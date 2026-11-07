import type { PaletteOptions } from '@mui/material/styles';

// ── CIXCI Brand Palette ─────────────────────────────────────────────────────
// Primary Blues: Catalina Blue #042C71, Dark Cerulean #084387, Green-blue #0B6AB0
// Secondary:    Sinopia #CE4912, Orange-red #F36B1C, Sandstorm #F3D649

export const darkPalette: PaletteOptions = {
  mode: 'dark',
  background: {
    default: '#0a0d14',
    paper: '#111827',
  },
  primary: {
    main: '#0B6AB0',
    light: '#4E9BD6',
    dark: '#084387',
  },
  secondary: {
    main: '#F36B1C',
    light: '#F5923E',
    dark: '#CE4912',
  },
  success: {
    main: '#22c55e',
    light: '#4ade80',
    dark: '#16a34a',
  },
  warning: {
    main: '#F3D649',
    light: '#F5E070',
    dark: '#D4B830',
  },
  error: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
  },
  text: {
    primary: '#f1f5f9',
    secondary: '#94a3b8',
    disabled: '#64748b',
  },
  divider: '#1e293b',
  action: {
    hover: 'rgba(11, 106, 176, 0.08)',
    selected: 'rgba(11, 106, 176, 0.12)',
  },
};

export const lightPalette: PaletteOptions = {
  mode: 'light',
  background: {
    default: '#f8fafc',
    paper: '#ffffff',
  },
  primary: {
    main: '#084387',
    light: '#0B6AB0',
    dark: '#042C71',
  },
  secondary: {
    main: '#CE4912',
    light: '#F36B1C',
    dark: '#A83A0E',
  },
  success: {
    main: '#16a34a',
    light: '#22c55e',
    dark: '#15803d',
  },
  warning: {
    main: '#d97706',
    light: '#F3D649',
    dark: '#b45309',
  },
  error: {
    main: '#dc2626',
    light: '#ef4444',
    dark: '#b91c1c',
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    disabled: '#94a3b8',
  },
  divider: '#e2e8f0',
  action: {
    hover: 'rgba(8, 67, 135, 0.06)',
    selected: 'rgba(8, 67, 135, 0.10)',
  },
};
