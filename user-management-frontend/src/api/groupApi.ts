import { baseApi } from './baseApi';
import { UserGroup, UserGroupCreate, UserGroupUpdate, GroupMemberAdd, PaginatedResponse } from '@/types';

export const groupApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGroups: builder.query<PaginatedResponse<UserGroup>, void>({
      query: () => '/groups/',
      providesTags: ['Group'],
    }),

    getGroup: builder.query<UserGroup, number>({
      query: (groupId) => `/groups/${groupId}`,
      providesTags: (_result, _error, groupId) => [{ type: 'Group' as const, id: groupId }],
    }),

    createGroup: builder.mutation<UserGroup, UserGroupCreate>({
      query: (body) => ({ url: '/groups/', method: 'POST', body }),
      invalidatesTags: ['Group'],
    }),

    updateGroup: builder.mutation<UserGroup, { groupId: number; data: UserGroupUpdate }>({
      query: ({ groupId, data }) => ({
        url: `/groups/${groupId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        'Group',
        { type: 'Group' as const, id: groupId },
      ],
    }),

    deleteGroup: builder.mutation<void, number>({
      query: (groupId) => ({
        url: `/groups/${groupId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Group'],
    }),

    addMemberToGroup: builder.mutation<void, { groupId: number; data: GroupMemberAdd }>({
      query: ({ groupId, data }) => ({
        url: `/groups/${groupId}/members`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: 'Group' as const, id: groupId },
        'User',
      ],
    }),

    removeMemberFromGroup: builder.mutation<void, { groupId: number; userId: string }>({
      query: ({ groupId, userId }) => ({
        url: `/groups/${groupId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: 'Group' as const, id: groupId },
        'User',
      ],
    }),

    assignRoleToGroup: builder.mutation<void, { groupId: number; roleId: number }>({
      query: ({ groupId, roleId }) => ({
        url: `/groups/${groupId}/roles?role_id=${roleId}`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: 'Group' as const, id: groupId },
      ],
    }),

    removeRoleFromGroup: builder.mutation<void, { groupId: number; roleId: number }>({
      query: ({ groupId, roleId }) => ({
        url: `/groups/${groupId}/roles/${roleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: 'Group' as const, id: groupId },
      ],
    }),
  }),
});

export const {
  useGetGroupsQuery,
  useGetGroupQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useAddMemberToGroupMutation,
  useRemoveMemberFromGroupMutation,
  useAssignRoleToGroupMutation,
  useRemoveRoleFromGroupMutation,
} = groupApi;
