import {
  Box,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import { useNavigate } from '@tanstack/react-router';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <Paper sx={{ p: 6, textAlign: 'center', maxWidth: 500 }}>
        <Typography variant="h3" color="primary" gutterBottom>
          404
        </Typography>
        <Typography variant="h5" gutterBottom>
          Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          The page you're looking for doesn't exist or has been moved.
        </Typography>
        <Button variant="contained" onClick={() => navigate({ to: '/' })}>
          Go to Dashboard
        </Button>
      </Paper>
    </Box>
  );
}
