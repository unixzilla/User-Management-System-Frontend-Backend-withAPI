import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileUpdateSchema, type ProfileUpdateSchema } from '@/utils/validation';
import { useUpdateUserMutation } from '@/api';
import { useSnackbar } from 'notistack';
import { useAppDispatch } from '@/hooks.redux';
import { setCredentials } from '@/store/authSlice';
import { storage } from '@/utils/storage';
import { User } from '@/types';

interface EditProfileDialogProps {
  open: boolean;
  onClose: () => void;
  user: User;
}

export function EditProfileDialog({ open, onClose, user }: EditProfileDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useAppDispatch();
  const [updateUser, { isLoading }] = useUpdateUserMutation();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProfileUpdateSchema>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      full_name: user.full_name || '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  React.useEffect(() => {
    if (open && user) {
      reset({
        full_name: user.full_name || '',
        password: '',
        confirmPassword: '',
      });
    }
  }, [open, user, reset]);

  const onSubmit = async (data: ProfileUpdateSchema) => {
    const updateData: any = {};
    if (data.full_name !== undefined && data.full_name !== null) {
      updateData.full_name = data.full_name;
    }
    if (data.password) {
      updateData.password = data.password;
    }

    try {
      const updatedUser = await updateUser({ userId: user.id, data: updateData }).unwrap();

      // Update localStorage
      storage.setUser(updatedUser);
      // Update Redux auth state
      dispatch(
        setCredentials({
          user: updatedUser,
          tokens: {
            access_token: storage.getAccessToken()!,
            refresh_token: storage.getRefreshToken()!,
            token_type: 'bearer',
          },
        })
      );

      enqueueSnackbar('Profile updated successfully', { variant: 'success' });
      onClose();
    } catch (err: any) {
      enqueueSnackbar(err.data?.detail || 'Failed to update profile', { variant: 'error' });
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Full Name"
              {...register('full_name')}
              error={!!errors.full_name}
              helperText={errors.full_name?.message}
              fullWidth
            />
            <TextField
              label="New Password (leave blank to keep current)"
              type="password"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
              fullWidth
            />
            {password && (
              <TextField
                label="Confirm New Password"
                type="password"
                {...register('confirmPassword')}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
                fullWidth
              />
            )}
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
