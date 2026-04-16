import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import { storage } from '@/utils/storage';
import { logout as logoutAction } from '@/store/authSlice';

// Custom fetch wrapper to handle 401 globally
const fetchBaseQueryWithAuth: BaseQueryFn = async (args, api, extraOptions) => {
  const result = await fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1`,
    prepareHeaders: (headers) => {
      const accessToken = storage.getAccessToken();
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
      return headers;
    },
    credentials: 'include',
  })(args, api, extraOptions);

  if (result.error?.status === 401) {
    // Session expired or invalid token - clear auth and redirect
    storage.clearAll();
    api.dispatch(logoutAction());
    window.location.href = '/login';
  }

  return result;
};

export const baseApi = createApi({
  baseQuery: fetchBaseQueryWithAuth,
  tagTypes: ['User', 'Role', 'Auth'],
  endpoints: () => ({}),
});
