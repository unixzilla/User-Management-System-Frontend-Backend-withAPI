'use client';

import React from 'react';
import { SnackbarProvider as NotistackProvider } from 'notistack';

interface SnackbarProviderProps {
  children: React.ReactNode;
}

export function SnackbarProvider({ children }: SnackbarProviderProps) {
  return (
    <NotistackProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      {children}
    </NotistackProvider>
  );
}
