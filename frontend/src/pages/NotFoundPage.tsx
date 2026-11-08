import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import HomeIcon from '@mui/icons-material/Home'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        textAlign: 'center',
        px: 3,
      }}
    >
      <Typography
        variant="h1"
        sx={{ fontSize: { xs: 100, sm: 140 }, fontWeight: 800, color: 'primary.main', lineHeight: 1 }}
      >
        404
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
        Page Not Found
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 400, mb: 4 }}>
        The page you're looking for doesn't exist or has been moved.
      </Typography>
      <Button
        variant="contained"
        startIcon={<HomeIcon />}
        onClick={() => navigate('/')}
        size="large"
      >
        Back to Dashboard
      </Button>
    </Box>
  )
}
