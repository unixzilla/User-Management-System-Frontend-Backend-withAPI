import { baseApi } from './baseApi';
import {
  Permission,
  PermissionCreate,
  PermissionUpdate,
  RolePermissionsUpdate,
  PaginatedResponse,
} from '@/types';

export const permissionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPermissions: builder.query<PaginatedResponse<Permission>, void>({
      query: () => '/permissions/',
      providesTags: ['Permission'],
    }),

    getRolePermissions: builder.query<Permission[], number>({
      query: (roleId) => `/permissions/roles/${roleId}/permissions`,
      providesTags: (_result, _error, roleId) => [{ type: 'Permission' as const, id: roleId }],
    }),

    createPermission: builder.mutation<Permission, PermissionCreate>({
      query: (body) => ({ url: '/permissions/', method: 'POST', body }),
      invalidatesTags: ['Permission'],
    }),

    updatePermission: builder.mutation<Permission, { permissionId: number; data: PermissionUpdate }>({
      query: ({ permissionId, data }) => ({
        url: `/permissions/${permissionId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Permission'],
    }),

    deletePermission: builder.mutation<void, number>({
      query: (permissionId) => ({
        url: `/permissions/${permissionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Permission'],
    }),

    assignPermissionToRole: builder.mutation<void, { roleId: number; permissionId: number }>({
      query: ({ roleId, permissionId }) => ({
        url: `/permissions/roles/${roleId}/permissions?permission_id=${permissionId}`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'Permission' as const, id: roleId },
        'Role',
      ],
    }),

    removePermissionFromRole: builder.mutation<void, { roleId: number; permissionId: number }>({
      query: ({ roleId, permissionId }) => ({
        url: `/permissions/roles/${roleId}/permissions/${permissionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'Permission' as const, id: roleId },
        'Role',
      ],
    }),

    setRolePermissions: builder.mutation<void, { roleId: number; data: RolePermissionsUpdate }>({
      query: ({ roleId, data }) => ({
        url: `/permissions/roles/${roleId}/permissions`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'Permission' as const, id: roleId },
        'Role',
      ],
    }),
  }),
});

export const {
  useGetPermissionsQuery,
  useGetRolePermissionsQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
  useAssignPermissionToRoleMutation,
  useRemovePermissionFromRoleMutation,
  useSetRolePermissionsMutation,
} = permissionApi;
