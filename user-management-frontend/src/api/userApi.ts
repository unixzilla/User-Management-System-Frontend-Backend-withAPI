import { baseApi } from './baseApi';
import { User, UserCreate, UserUpdate, UserListParams } from '@/types';

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<User[], UserListParams>({
      query: (params) => ({
        url: '/users/',
        params,
      }),
      providesTags: ['User'],
    }),
    getUser: builder.query<User, string>({
      query: (userId) => `/users/${userId}`,
      providesTags: (_result, _error, userId) => [{ type: 'User', id: userId }],
    }),
    createUser: builder.mutation<User, UserCreate>({
      query: (user) => ({
        url: '/users/',
        method: 'POST',
        body: user,
      }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation<User, { userId: string; data: UserUpdate }>({
      query: ({ userId, data }) => ({
        url: `/users/${userId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { userId }) => [{ type: 'User', id: userId }],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (userId) => ({
        url: `/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
    assignRole: builder.mutation<void, { userId: string; roleId: number }>({
      query: ({ userId, roleId }) => ({
        url: `/users/${userId}/roles`,
        method: 'POST',
        params: { role_id: roleId },
      }),
      invalidatesTags: (_result, _error, { userId }) => [{ type: 'User', id: userId }],
    }),
    removeRole: builder.mutation<void, { userId: string; roleId: number }>({
      query: ({ userId, roleId }) => ({
        url: `/users/${userId}/roles/${roleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { userId }) => [{ type: 'User', id: userId }],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useAssignRoleMutation,
  useRemoveRoleMutation,
} = userApi;
