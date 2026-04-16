import { baseApi } from './baseApi';
import { Role, RoleCreate, RoleUpdate } from '@/types';

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
    updateRole: builder.mutation<Role, { roleId: number; data: RoleUpdate }>({
      query: ({ roleId, data }) => ({
        url: `/roles/${roleId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Role'],
    }),
  }),
});

export const { useGetRolesQuery, useCreateRoleMutation, useDeleteRoleMutation, useUpdateRoleMutation } = roleApi;
