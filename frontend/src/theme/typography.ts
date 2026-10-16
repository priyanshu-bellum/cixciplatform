import type { TypographyVariantsOptions } from '@mui/material/styles';

export const typography: TypographyVariantsOptions = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSize: 13,
  h1: { fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.3 },
  h2: { fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.35 },
  h3: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
  h4: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 },
  h5: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.5 },
  h6: { fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.5 },
  subtitle1: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5 },
  subtitle2: { fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.5 },
  body1: { fontSize: '0.8125rem', lineHeight: 1.6 },
  body2: { fontSize: '0.75rem', lineHeight: 1.6 },
  caption: { fontSize: '0.6875rem', lineHeight: 1.5 },
  button: { fontSize: '0.8125rem', fontWeight: 600, textTransform: 'none' },
  overline: { fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' },
};

export const MONO_FONT = "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace";
