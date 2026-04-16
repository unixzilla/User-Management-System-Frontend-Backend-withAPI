'use client';

import {
  Box,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import { useNavigate } from '@tanstack/react-router';

export function UnauthorizedPage() {
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
        <ErrorIcon color="error" sx={{ fontSize: 80, mb: 2 }} />
        <Typography variant="h3" color="error" gutterBottom>
          403
        </Typography>
        <Typography variant="h5" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          You do not have permission to view this page. Please contact an administrator if you believe this is an error.
        </Typography>
        <Button variant="contained" onClick={() => navigate({ to: '/' })}>
          Go to Dashboard
        </Button>
      </Paper>
    </Box>
  );
}
