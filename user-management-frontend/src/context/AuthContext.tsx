import { createContext, useContext, useReducer, useEffect } from 'react';
import { User, LoginRequest } from '@/types';
import { useAppSelector, useAppDispatch } from '@/hooks.redux';
import { setCredentials } from '@/store/authSlice';
import { useLoginMutation, useLogoutMutation } from '@/api';
import { storage } from '@/utils/storage';
import axiosInstance from '@/api/axios';

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
  | { type: 'SET_AUTHENTICATED' }
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
  const [logoutMutation] = useLogoutMutation();

  // Subscribe to Redux auth state for reactive updates
  const authState = useAppSelector((s) => s.auth);

  useEffect(() => {
    const token = storage.getAccessToken();
    const user = storage.getUser();
    if (token && user) {
      dispatchRedux(
        setCredentials({
          user,
          tokens: {
            access_token: token,
            refresh_token: storage.getRefreshToken() || '',
            token_type: 'bearer',
          },
        })
      );
      dispatch({ type: 'SET_AUTHENTICATED' });
    } else {
      dispatch({ type: 'SET_NOT_AUTHENTICATED' });
    }
  }, [dispatchRedux]);

  const login = async (credentials: LoginRequest) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const result = await loginMutation(credentials).unwrap();
      // Clear any stale user data from previous session before storing new tokens
      storage.clearAll();
      storage.setAccessToken(result.access_token);
      storage.setRefreshToken(result.refresh_token);
      const { data: user } = await axiosInstance.get<User>('/users/me');
      storage.setUser(user);
      dispatchRedux(setCredentials({ user, tokens: result }));
      dispatch({ type: 'SET_AUTHENTICATED' });
    } catch (err) {
      dispatch({ type: 'SET_NOT_AUTHENTICATED' });
      throw err;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation().unwrap();
    } catch {
      // ignore errors — logout action already dispatched by mutation's onQueryStarted
    }
  };

  const value: AuthContextType = {
    user: authState.user,
    isAuthenticated: !!authState.accessToken,
    isLoading: state.isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
