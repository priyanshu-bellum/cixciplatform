import type { Components, Theme } from '@mui/material/styles';

export const components: Components<Theme> = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        scrollbarWidth: 'thin',
      },
    },
  },
  MuiButton: {
    defaultProps: { disableElevation: true, size: 'small' },
    styleOverrides: {
      root: { borderRadius: 6, fontWeight: 600, padding: '6px 14px' },
      sizeSmall: { fontSize: '0.75rem', padding: '4px 10px' },
    },
  },
  MuiIconButton: {
    defaultProps: { size: 'small' },
  },
  MuiTextField: {
    defaultProps: { size: 'small', variant: 'outlined' },
    styleOverrides: {
      root: { '& .MuiOutlinedInput-root': { borderRadius: 6 } },
    },
  },
  MuiSelect: {
    defaultProps: { size: 'small' },
  },
  MuiCard: {
    defaultProps: { variant: 'outlined' },
    styleOverrides: {
      root: { borderRadius: 10 },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: { borderRadius: 10, backgroundImage: 'none' },
    },
  },
  MuiChip: {
    defaultProps: { size: 'small' },
    styleOverrides: {
      root: { borderRadius: 6, fontWeight: 600, fontSize: '0.6875rem' },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: { fontSize: '0.8125rem', padding: '8px 12px' },
      head: { fontWeight: 600 },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: { borderRadius: 12 },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: { fontSize: '0.8125rem', fontWeight: 500, textTransform: 'none', minHeight: 40 },
    },
  },
  MuiTabs: {
    styleOverrides: {
      root: { minHeight: 40 },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: { borderRight: 'none' },
    },
  },
  MuiTooltip: {
    defaultProps: { arrow: true },
    styleOverrides: {
      tooltip: { fontSize: '0.6875rem', borderRadius: 6 },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: { borderRadius: 8 },
    },
  },
  MuiSkeleton: {
    defaultProps: { animation: 'wave' },
  },
};
