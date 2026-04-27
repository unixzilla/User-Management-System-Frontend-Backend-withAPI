import { baseApi } from './baseApi';
import { logout } from '@/store/authSlice';
import { TokenPair, LoginRequest } from '@/types';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<TokenPair, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      async onQueryStarted(_, { dispatch }) {
        // Clear auth state and storage immediately
        dispatch(logout());
      },
    }),
  }),
});

export const { useLoginMutation, useLogoutMutation } = authApi;
