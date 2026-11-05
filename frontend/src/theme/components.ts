import type { Components, Theme } from '@mui/material/styles';

export const components: Components<Theme> = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        scrollbarWidth: 'thin',
      },
    },
  },

  // ── Buttons ──
  MuiButton: {
    defaultProps: { disableElevation: true, size: 'small' },
    styleOverrides: {
      root: {
        borderRadius: 6,
        fontWeight: 600,
        padding: '6px 14px',
        transition: 'all 0.15s ease',
      },
      sizeSmall: { fontSize: '0.75rem', padding: '4px 10px' },
      contained: ({ theme }) => ({
        '&:hover': {
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 2px 8px rgba(0,0,0,0.3)'
              : '0 2px 8px rgba(0,0,0,0.12)',
        },
      }),
    },
  },
  MuiIconButton: {
    defaultProps: { size: 'small' },
    styleOverrides: {
      root: { transition: 'all 0.15s ease' },
    },
  },

  // ── Inputs ──
  MuiTextField: {
    defaultProps: { size: 'small', variant: 'outlined' },
    styleOverrides: {
      root: { '& .MuiOutlinedInput-root': { borderRadius: 6 } },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        transition: 'box-shadow 0.15s ease',
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderWidth: 1.5,
        },
        '&.Mui-focused': {
          boxShadow: `0 0 0 3px ${
            theme.palette.mode === 'dark'
              ? 'rgba(79,142,247,0.15)'
              : 'rgba(37,99,235,0.1)'
          }`,
        },
      }),
      input: {
        '&.MuiInputBase-inputSizeSmall': { padding: '7.5px 14px' },
      },
    },
  },
  MuiSelect: {
    defaultProps: { size: 'small' },
    styleOverrides: {
      select: { minHeight: '1.4em' },
    },
  },

  // ── Cards ──
  MuiCard: {
    defaultProps: { variant: 'outlined' },
    styleOverrides: {
      root: {
        borderRadius: 10,
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      },
    },
  },
  MuiCardContent: {
    styleOverrides: {
      root: { '&:last-child': { paddingBottom: 16 } },
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

  // ── Tables ──
  MuiTableContainer: {
    styleOverrides: {
      root: { borderRadius: 10, overflow: 'hidden' },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: ({ theme }) => ({
        fontSize: '0.8125rem',
        padding: '10px 16px',
        borderColor: theme.palette.divider,
      }),
      head: ({ theme }) => ({
        fontWeight: 700,
        fontSize: '0.6875rem',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap' as const,
        color: theme.palette.text.secondary,
        backgroundColor:
          theme.palette.mode === 'dark'
            ? 'rgba(255,255,255,0.03)'
            : 'rgba(0,0,0,0.02)',
      }),
    },
  },
  MuiTableSortLabel: {
    styleOverrides: {
      root: {
        fontWeight: 700,
        fontSize: '0.6875rem',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
      },
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: { transition: 'background-color 0.1s ease' },
    },
  },
  MuiTablePagination: {
    styleOverrides: {
      root: { fontSize: '0.75rem' },
      selectLabel: { fontSize: '0.75rem' },
      displayedRows: { fontSize: '0.75rem' },
    },
  },

  // ── Dialogs ──
  MuiDialog: {
    styleOverrides: {
      paper: ({ theme }) => ({
        borderRadius: 12,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 24px 48px rgba(0,0,0,0.5)'
            : '0 24px 48px rgba(0,0,0,0.12)',
      }),
    },
  },
  MuiBackdrop: {
    styleOverrides: {
      root: { backdropFilter: 'blur(4px)' },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: { fontSize: '1rem', fontWeight: 700, padding: '20px 24px 12px' },
    },
  },
  MuiDialogContent: {
    styleOverrides: {
      root: { padding: '12px 24px' },
    },
  },
  MuiDialogActions: {
    styleOverrides: {
      root: { padding: '12px 24px 20px', gap: 8 },
    },
  },

  // ── Menus ──
  MuiMenu: {
    styleOverrides: {
      paper: ({ theme }) => ({
        borderRadius: 8,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 8px 24px rgba(0,0,0,0.4)'
            : '0 8px 24px rgba(0,0,0,0.1)',
      }),
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: { fontSize: '0.8125rem', borderRadius: 4, margin: '2px 4px', padding: '8px 12px', minHeight: 36 },
    },
  },

  // ── Tabs ──
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

  // ── Misc ──
  MuiDrawer: {
    styleOverrides: {
      paper: { borderRight: 'none' },
    },
  },
  MuiTooltip: {
    defaultProps: { arrow: true },
    styleOverrides: {
      tooltip: ({ theme }) => ({
        fontSize: '0.6875rem',
        borderRadius: 6,
        backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#334155',
        padding: '6px 10px',
      }),
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
