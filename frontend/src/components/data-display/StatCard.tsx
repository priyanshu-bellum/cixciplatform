import type { ReactNode } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: string;
  loading?: boolean;
}

export default function StatCard({ title, value, subtitle, icon, color, loading }: StatCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 8px 24px rgba(0,0,0,0.3)'
              : '0 8px 24px rgba(0,0,0,0.08)',
          borderColor: color ?? 'primary.main',
        },
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'text.secondary',
                mb: 1,
                lineHeight: 1,
              }}
            >
              {title}
            </Typography>
            {loading ? (
              <Skeleton variant="text" width={48} sx={{ fontSize: '1.75rem' }} />
            ) : (
              <Typography
                sx={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: color ?? 'text.primary',
                }}
              >
                {value}
              </Typography>
            )}
            {subtitle && (
              <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled', mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.04)',
                color: color ?? 'primary.main',
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
