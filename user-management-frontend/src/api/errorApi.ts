import { baseApi } from './baseApi';
import { ErrorLog, PaginatedErrorResponse } from '@/types';

export const errorApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getErrors: builder.query<PaginatedErrorResponse, { skip?: number; limit?: number; search?: string } | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params) {
          if (params.skip !== undefined) searchParams.set('skip', String(params.skip));
          if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
          if (params.search) searchParams.set('search', params.search);
        }
        const qs = searchParams.toString();
        return `/errors/${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Error'],
    }),

    getError: builder.query<ErrorLog, string>({
      query: (errorId) => `/errors/${errorId}`,
      providesTags: (_result, _error, errorId) => [{ type: 'Error' as const, id: errorId }],
    }),
  }),
});

export const { useGetErrorsQuery, useGetErrorQuery } = errorApi;
