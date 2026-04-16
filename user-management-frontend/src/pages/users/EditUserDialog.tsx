'use client';

import React from 'react';
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
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userUpdateSchema, type UserUpdateSchema } from '@/utils/validation';
import { useUpdateUserMutation } from '@/api';
import { useSnackbar } from 'notistack';
import { User } from '@/types';

interface EditUserDialogProps {
  open: boolean;
  onClose: () => void;
  user: User;
}

export function EditUserDialog({ open, onClose, user }: EditUserDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [updateUser, { isLoading }] = useUpdateUserMutation();

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

  React.useEffect(() => {
    if (open && user) {
      reset({
        email: user.email,
        username: user.username,
        full_name: user.full_name || '',
        is_active: user.is_active,
        is_verified: user.is_verified,
      });
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
    onClose();
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
                    />
                  }
                  label="Active"
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={isLoading}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
