import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Switch,
  FormControlLabel,
  Chip,
  Divider,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userUpdateSchema, type UserUpdateSchema } from '@/utils/validation';
import {
  useUpdateUserMutation,
  useAssignRoleMutation,
  useRemoveRoleMutation,
  useGetRolesQuery,
  useGetGroupsQuery,
  useAddMemberToGroupMutation,
  useRemoveMemberFromGroupMutation,
} from '@/api';
import { useSnackbar } from 'notistack';
import { User } from '@/types';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import { getErrorMessage } from '@/utils/format';

interface EditUserDialogProps {
  open: boolean;
  onClose: () => void;
  user: User;
}

export function EditUserDialog({ open, onClose, user }: EditUserDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [assignRole, { isLoading: assigning }] = useAssignRoleMutation();
  const [removeRole, { isLoading: removing }] = useRemoveRoleMutation();
  const [addMemberToGroup] = useAddMemberToGroupMutation();
  const [removeMemberFromGroup] = useRemoveMemberFromGroupMutation();
  const { data: allRoles = [], isLoading: rolesLoading } = useGetRolesQuery({});
  const { data: groupsData } = useGetGroupsQuery();
  const allGroups = groupsData?.items ?? [];

  const isSystemAdmin = user.roles.includes('admin');

  const [userRoles, setUserRoles] = useState<string[]>(user.roles);
  const [userGroups, setUserGroups] = useState<string[]>(user.groups ?? []);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserUpdateSchema>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      email: user.email,
      username: user.username,
      full_name: user.full_name || '',
      is_active: user.is_active,
    },
  });

  const currentRoles = React.useMemo(() => {
    return allRoles.filter((role) => userRoles.includes(role.name));
  }, [allRoles, userRoles]);

  const availableRoles = React.useMemo(() => {
    return allRoles.filter((role) => !userRoles.includes(role.name));
  }, [allRoles, userRoles]);

  const currentGroups = React.useMemo(() => {
    return allGroups.filter((g) => userGroups.includes(g.name));
  }, [allGroups, userGroups]);

  const availableGroups = React.useMemo(() => {
    return allGroups.filter((g) => !userGroups.includes(g.name));
  }, [allGroups, userGroups]);

  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<number | ''>('');
  const [selectedGroupToAdd, setSelectedGroupToAdd] = useState<number | ''>('');

  React.useEffect(() => {
    if (open && user) {
      reset({
        email: user.email,
        username: user.username,
        full_name: user.full_name || '',
        is_active: user.is_active,
      });
      setSelectedRoleToAdd('');
      setSelectedGroupToAdd('');
      setUserRoles(user.roles);
      setUserGroups(user.groups ?? []);
    }
  }, [open, user, reset]);

  const onSubmit = async (data: UserUpdateSchema) => {
    try {
      await updateUser({ userId: user.id, data }).unwrap();
      enqueueSnackbar('User updated successfully', { variant: 'success' });
      onClose();
    } catch (err: any) {
      enqueueSnackbar(getErrorMessage(err, 'Failed to update user'), { variant: 'error' });
    }
  };

  const handleClose = () => {
    setSelectedRoleToAdd('');
    setSelectedGroupToAdd('');
    onClose();
  };

  const handleAddRole = async () => {
    if (!selectedRoleToAdd) return;
    const role = allRoles.find((r) => r.id === selectedRoleToAdd);
    try {
      await assignRole({ userId: user.id, roleId: selectedRoleToAdd as number }).unwrap();
      if (role) setUserRoles((prev) => [...prev, role.name]);
      enqueueSnackbar('Role assigned successfully', { variant: 'success' });
      setSelectedRoleToAdd('');
    } catch (err: any) {
      enqueueSnackbar(getErrorMessage(err, 'Failed to assign role'), { variant: 'error' });
    }
  };

  const handleRemoveRole = async (roleId: number) => {
    const role = allRoles.find((r) => r.id === roleId);
    try {
      await removeRole({ userId: user.id, roleId }).unwrap();
      if (role) setUserRoles((prev) => prev.filter((name) => name !== role.name));
      enqueueSnackbar('Role removed successfully', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(getErrorMessage(err, 'Failed to remove role'), { variant: 'error' });
    }
  };

  const handleAddGroup = async () => {
    if (!selectedGroupToAdd) return;
    const group = allGroups.find((g) => g.id === selectedGroupToAdd);
    try {
      await addMemberToGroup({ groupId: selectedGroupToAdd as number, data: { user_id: user.id } }).unwrap();
      if (group) setUserGroups((prev) => [...prev, group.name]);
      enqueueSnackbar('Group assigned successfully', { variant: 'success' });
      setSelectedGroupToAdd('');
    } catch (err: any) {
      enqueueSnackbar(getErrorMessage(err, 'Failed to add user to group'), { variant: 'error' });
    }
  };

  const handleRemoveGroup = async (groupId: number) => {
    const group = allGroups.find((g) => g.id === groupId);
    try {
      await removeMemberFromGroup({ groupId, userId: user.id }).unwrap();
      if (group) setUserGroups((prev) => prev.filter((name) => name !== group.name));
      enqueueSnackbar('Group removed successfully', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(getErrorMessage(err, 'Failed to remove user from group'), { variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Email"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
              fullWidth
            />
            <TextField
              label="Username"
              {...register('username')}
              error={!!errors.username}
              helperText={errors.username?.message}
              fullWidth
            />
            <TextField
              label="Full Name"
              {...register('full_name')}
              error={!!errors.full_name}
              helperText={errors.full_name?.message}
              fullWidth
            />
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={field.onChange}
                      disabled={isSystemAdmin}
                    />
                  }
                  label={isSystemAdmin ? 'Active (cannot deactivate admin)' : 'Active'}
                />
              )}
            />

            <Divider sx={{ my: 2 }} />

            {/* Role Management Section */}
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Roles
            </Typography>

            {rolesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Current Roles
                  </Typography>
                  {currentRoles.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No roles assigned
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {currentRoles.map((role) => (
                        <Chip
                          key={role.id}
                          label={role.name}
                          onDelete={() => handleRemoveRole(role.id)}
                          color="primary"
                          deleteIcon={<CloseIcon />}
                          disabled={removing}
                          title="Click to remove"
                        />
                      ))}
                    </Box>
                  )}
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Add Role
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <select
                      value={selectedRoleToAdd}
                      onChange={(e) => setSelectedRoleToAdd(e.target.value ? parseInt(e.target.value, 10) : '')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: '1px solid rgba(0, 0, 0, 0.23)',
                        backgroundColor: 'white',
                        fontSize: 'inherit',
                      }}
                      disabled={availableRoles.length === 0 || assigning}
                    >
                      <option value="">{availableRoles.length === 0 ? 'No roles available' : 'Select a role'}</option>
                      {availableRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name} {role.description ? `- ${role.description}` : ''}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="outlined"
                      onClick={handleAddRole}
                      disabled={!selectedRoleToAdd || assigning || availableRoles.length === 0}
                      startIcon={<AddIcon />}
                    >
                      Add
                    </Button>
                  </Box>
                </Box>
              </>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Group Management Section */}
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Groups
            </Typography>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Current Groups
              </Typography>
              {currentGroups.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No groups assigned
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {currentGroups.map((group) => (
                    <Chip
                      key={group.id}
                      label={group.name}
                      onDelete={() => handleRemoveGroup(group.id)}
                      color="secondary"
                      deleteIcon={<CloseIcon />}
                    />
                  ))}
                </Box>
              )}
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Add Group
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <select
                  value={selectedGroupToAdd}
                  onChange={(e) => setSelectedGroupToAdd(e.target.value ? parseInt(e.target.value, 10) : '')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid rgba(0, 0, 0, 0.23)',
                    backgroundColor: 'white',
                    fontSize: 'inherit',
                  }}
                  disabled={availableGroups.length === 0}
                >
                  <option value="">{availableGroups.length === 0 ? 'No groups available' : 'Select a group'}</option>
                  {availableGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} {group.description ? `- ${group.description}` : ''}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outlined"
                  onClick={handleAddGroup}
                  disabled={!selectedGroupToAdd || availableGroups.length === 0}
                  startIcon={<AddIcon />}
                >
                  Add
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isUpdating || assigning || removing}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={isUpdating}>
            Save Changes
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
