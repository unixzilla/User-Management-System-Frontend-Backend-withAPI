'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useAuth } from '@/context/AuthContext';
import { loginSchema, type LoginSchema } from '@/utils/validation';

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = React.useState<string>('');
  const [logoutMessage, setLogoutMessage] = React.useState<string>('');

  React.useEffect(() => {
    const msg = sessionStorage.getItem('logoutMessage');
    if (msg) {
      setLogoutMessage(msg);
      sessionStorage.removeItem('logoutMessage');
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
  });

  // For redirect after login (from ProtectedRoute)
  const from = (location as any).state?.from?.pathname || '/';

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: from });
    }
  }, [isAuthenticated, navigate, from]);

  const onSubmit = async (data: LoginSchema) => {
    try {
      setError('');
      await login(data);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    }
  };

  if (isLoading && !isAuthenticated) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card sx={{ minWidth: 400, maxWidth: 450, boxShadow: 24 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Sign in to your account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {logoutMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {logoutMessage}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              margin="normal"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              margin="normal"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <Typography variant="body2" color="text.secondary" align="center">
            Demo credentials: admin@example.com / admin123
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
