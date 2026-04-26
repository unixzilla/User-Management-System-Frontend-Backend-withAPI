import type { Middleware } from '@reduxjs/toolkit';
import { logout } from './authSlice';
import { storage } from '@/utils/storage';

export const authMiddleware: Middleware = (_store) => (next) => (action) => {
  if (logout.match(action)) {
    storage.clearAll();
  }
  return next(action);
};
