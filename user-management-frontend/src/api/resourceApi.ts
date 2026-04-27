import { baseApi } from './baseApi';
import {
  Resource,
  ResourceCreate,
  ResourceUpdate,
  PaginatedResponse,
} from '@/types';

export const resourceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getResources: builder.query<PaginatedResponse<Resource>, void>({
      query: () => '/resources/',
      providesTags: ['Resource'],
    }),

    getResource: builder.query<Resource, number>({
      query: (resourceId) => `/resources/${resourceId}`,
      providesTags: (_result, _error, resourceId) => [{ type: 'Resource' as const, id: resourceId }],
      extraOptions: { refetchOnMountOrArgChange: true },
    }),

    createResource: builder.mutation<Resource, ResourceCreate>({
      query: (body) => ({ url: '/resources/', method: 'POST', body }),
      invalidatesTags: ['Resource'],
    }),

    updateResource: builder.mutation<Resource, { resourceId: number; data: ResourceUpdate }>({
      query: ({ resourceId, data }) => ({
        url: `/resources/${resourceId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { resourceId }) => [
        'Resource',
        { type: 'Resource' as const, id: resourceId },
      ],
    }),

    deleteResource: builder.mutation<void, number>({
      query: (resourceId) => ({
        url: `/resources/${resourceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Resource', 'Permission'],
    }),
  }),
});

export const {
  useGetResourcesQuery,
  useGetResourceQuery,
  useCreateResourceMutation,
  useUpdateResourceMutation,
  useDeleteResourceMutation,
} = resourceApi;
