'use client';

import React from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

interface LoadingSpinnerProps {
  size?: number;
  fullPage?: boolean;
}

export function LoadingSpinner({ size = 40, fullPage = false }: LoadingSpinnerProps) {
  const spinner = (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: fullPage ? '100vh' : '200px',
      }}
    >
      <CircularProgress size={size} />
    </Box>
  );

  return spinner;
}
