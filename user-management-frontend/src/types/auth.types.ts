import { User } from './user.types';

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type?: string; // Optional since backend doesn't always return this
}

export interface TokenPayload {
  sub: string;
  exp: number;
  type?: 'refresh' | 'access';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
