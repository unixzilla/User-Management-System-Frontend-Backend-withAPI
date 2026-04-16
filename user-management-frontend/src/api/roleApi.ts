import { baseApi } from './baseApi';
import { Role, RoleCreate } from '@/types';

export const roleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRoles: builder.query<Role[], Record<string, never>>({
      query: () => ({
        url: '/roles/',
        params: {},
      }),
      providesTags: ['Role'],
    }),
    createRole: builder.mutation<Role, RoleCreate>({
      query: (role) => ({
        url: '/roles/',
        method: 'POST',
        body: role,
      }),
      invalidatesTags: ['Role'],
    }),
    deleteRole: builder.mutation<void, number>({
      query: (roleId) => ({
        url: `/roles/${roleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Role'],
    }),
  }),
});

export const { useGetRolesQuery, useCreateRoleMutation, useDeleteRoleMutation } = roleApi;
