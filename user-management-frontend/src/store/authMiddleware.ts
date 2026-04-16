import { isRejectedWithValue } from '@reduxjs/toolkit';
import { logout } from './authSlice';
import { storage } from '@/utils/storage';

export const authMiddleware = (store: any) => (next: any) => (action: any) => {
  // If logout action is dispatched, clear storage
  if (logout.match(action)) {
    storage.clearAll();
  }
  return next(action);
};
