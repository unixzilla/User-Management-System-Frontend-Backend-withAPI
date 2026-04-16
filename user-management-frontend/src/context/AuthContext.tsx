import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { User, TokenPair, LoginRequest } from '@/types';
import { storage } from '@/utils/storage';
import { useAppDispatch } from '@/hooks.redux';
import { setCredentials } from '@/store/authSlice';
import { useLoginMutation } from '@/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

type AuthAction =
  | { type: 'SET_LOADING' }
  | { type: 'SET_AUTHENTICATED'; payload: { user: User; tokens: TokenPair } }
  | { type: 'SET_NOT_AUTHENTICATED' };

function authReducer(state: { isLoading: boolean }, action: AuthAction) {
  switch (action.type) {
    case 'SET_LOADING':
      return { isLoading: true };
    case 'SET_AUTHENTICATED':
      return { isLoading: false };
    case 'SET_NOT_AUTHENTICATED':
      return { isLoading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { isLoading: true });
  const dispatchRedux = useAppDispatch();
  const [loginMutation] = useLoginMutation();

  useEffect(() => {
    // Check for existing token and user on mount
    const token = storage.getAccessToken();
    const user = storage.getUser();
    if (token && user) {
      dispatch({ type: 'SET_AUTHENTICATED', payload: { user, tokens: { access_token: token, refresh_token: storage.getRefreshToken() || '', token_type: 'bearer' } } });
    } else {
      dispatch({ type: 'SET_NOT_AUTHENTICATED' });
    }
  }, []);

  const login = async (credentials: LoginRequest) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const result = await loginMutation(credentials).unwrap();
      const userRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${result.access_token}` },
      }).then((r) => r.json());
      const user: User = userRes;
      storage.setAccessToken(result.access_token);
      storage.setRefreshToken(result.refresh_token);
      storage.setUser(user);
      dispatchRedux(setCredentials({ user, tokens: result }));
      dispatch({ type: 'SET_AUTHENTICATED', payload: { user, tokens: result } });
    } catch (err) {
      dispatch({ type: 'SET_NOT_AUTHENTICATED' });
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${storage.getAccessToken()}` },
      });
    } catch {
      // Ignore logout errors
    } finally {
      storage.clearAll();
      dispatchRedux(setCredentials({ user: null as any, tokens: { access_token: '', refresh_token: '', token_type: 'bearer' } }));
    }
  };

  const value: AuthContextType = {
    user: storage.getUser(),
    isAuthenticated: !!storage.getAccessToken(),
    isLoading: state.isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
