import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { storage } from '@/utils/storage';

export const baseApi = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1`,
    prepareHeaders: (headers) => {
      const accessToken = storage.getAccessToken();
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
      return headers;
    },
    credentials: 'include',
  }),
  tagTypes: ['User', 'Role', 'Auth'],
  endpoints: () => ({}),
});
