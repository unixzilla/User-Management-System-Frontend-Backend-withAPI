import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { storage } from '@/utils/storage';
import { logout as logoutAction } from '@/store/authSlice';
import { pushApiError } from '@/store/notificationSlice';

let _errorSeq = 0;

function extractDetail(error: FetchBaseQueryError): string {
  const data = (error as any).data;
  if (!data) return 'Network error — server may be unreachable';
  if (typeof data === 'string') return data;
  if (data.detail) {
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((e: any) => e.msg).filter(Boolean).join('; ');
    }
  }
  return `HTTP ${error.status}`;
}

// Custom fetch wrapper to handle 401 globally and dispatch errors
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

  if (result.error) {
    if (result.error.status === 401) {
      // Don't redirect for login failures — let the LoginPage handle the error
      const url = typeof args === 'string' ? args : (args as any)?.url;
      if (!url || !url.includes('/auth/login')) {
        storage.clearAll();
        api.dispatch(logoutAction());
        window.location.href = '/login';
      }
    } else {
      // Dispatch global error snackbar — only for queries.
      // Mutations already show user-friendly snackbars in their catch blocks.
      if (api.type === 'query') {
        const endpoint = typeof args === 'string' ? args : (args as any)?.url || 'unknown';
        api.dispatch(pushApiError({
          id: `api-${++_errorSeq}-${Date.now()}`,
          status: result.error.status as number,
          detail: extractDetail(result.error),
          endpoint: typeof endpoint === 'string' ? endpoint.split('?')[0] : 'unknown',
          timestamp: Date.now(),
        }));
      }
    }
  }

  return result;
};

export const baseApi = createApi({
  baseQuery: fetchBaseQueryWithAuth,
  tagTypes: ['User', 'Role', 'Auth', 'Permission', 'Group', 'Resource', 'Error'],
  endpoints: () => ({}),
});
