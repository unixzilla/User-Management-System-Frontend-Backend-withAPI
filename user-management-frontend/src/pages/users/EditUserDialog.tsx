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
import { useUpdateUserMutation, useAssignRoleMutation, useRemoveRoleMutation, useGetRolesQuery } from '@/api';
import { useSnackbar } from 'notistack';
import { User } from '@/types';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';

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
  const { data: allRoles = [], isLoading: rolesLoading } = useGetRolesQuery({});

  // Local copy of user roles for instant UI updates after assign/remove
  const [userRoles, setUserRoles] = useState<string[]>(user.roles);

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
      is_verified: user.is_verified,
    },
  });

  const currentRoles = React.useMemo(() => {
    return allRoles.filter((role) => userRoles.includes(role.name));
  }, [allRoles, userRoles]);

  const availableRoles = React.useMemo(() => {
    return allRoles.filter((role) => !userRoles.includes(role.name));
  }, [allRoles, userRoles]);

  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<number | ''>('');

  React.useEffect(() => {
    if (open && user) {
      reset({
        email: user.email,
        username: user.username,
        full_name: user.full_name || '',
        is_active: user.is_active,
        is_verified: user.is_verified,
      });
      setSelectedRoleToAdd('');
      setUserRoles(user.roles);
    }
  }, [open, user, reset]);

  const onSubmit = async (data: UserUpdateSchema) => {
    try {
      await updateUser({ userId: user.id, data }).unwrap();
      enqueueSnackbar('User updated successfully', { variant: 'success' });
      onClose();
    } catch (err: any) {
      enqueueSnackbar(err.data?.detail || 'Failed to update user', { variant: 'error' });
    }
  };

  const handleClose = () => {
    setSelectedRoleToAdd('');
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
      enqueueSnackbar(err.data?.detail || 'Failed to assign role', { variant: 'error' });
    }
  };

  const handleRemoveRole = async (roleId: number) => {
    const role = allRoles.find((r) => r.id === roleId);
    try {
      await removeRole({ userId: user.id, roleId }).unwrap();
      if (role) setUserRoles((prev) => prev.filter((name) => name !== role.name));
      enqueueSnackbar('Role removed successfully', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.data?.detail || 'Failed to remove role', { variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* User Info Fields */}
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
                    />
                  }
                  label="Active"
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
                {/* Current Roles */}
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

                {/* Add New Role */}
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
