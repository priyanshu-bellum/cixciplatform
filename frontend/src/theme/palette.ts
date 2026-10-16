import type { PaletteOptions } from '@mui/material/styles';

export const darkPalette: PaletteOptions = {
  mode: 'dark',
  background: {
    default: '#0a0d14',
    paper: '#111827',
  },
  primary: {
    main: '#4f8ef7',
    light: '#7db3ff',
    dark: '#2563eb',
  },
  secondary: {
    main: '#a855f7',
    light: '#c084fc',
    dark: '#7c3aed',
  },
  success: {
    main: '#22c55e',
    light: '#4ade80',
    dark: '#16a34a',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
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
    hover: 'rgba(79, 142, 247, 0.08)',
    selected: 'rgba(79, 142, 247, 0.12)',
  },
};

export const lightPalette: PaletteOptions = {
  mode: 'light',
  background: {
    default: '#f8fafc',
    paper: '#ffffff',
  },
  primary: {
    main: '#2563eb',
    light: '#4f8ef7',
    dark: '#1d4ed8',
  },
  secondary: {
    main: '#7c3aed',
    light: '#a855f7',
    dark: '#6d28d9',
  },
  success: {
    main: '#16a34a',
    light: '#22c55e',
    dark: '#15803d',
  },
  warning: {
    main: '#d97706',
    light: '#f59e0b',
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
    hover: 'rgba(37, 99, 235, 0.06)',
    selected: 'rgba(37, 99, 235, 0.10)',
  },
};
