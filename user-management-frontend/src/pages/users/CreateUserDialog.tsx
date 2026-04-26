import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  FormControl,
  InputLabel,
  Select,
  Chip,
  OutlinedInput,
  FormHelperText,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userCreateSchema, type UserCreateSchema } from '@/utils/validation';
import { useCreateUserMutation } from '@/api';
import { useSnackbar } from 'notistack';

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateUserDialog({ open, onClose }: CreateUserDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [createUser, { isLoading }] = useCreateUserMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserCreateSchema>({
    resolver: zodResolver(userCreateSchema),
  });

  const [roles, setRoles] = React.useState<number[]>([]);
  const [availableRoles] = React.useState<Role[]>([]); // Would fetch from API

  React.useEffect(() => {
    if (open) {
      reset();
      setRoles([]);
    }
  }, [open, reset]);

  const onSubmit = async (data: UserCreateSchema) => {
    try {
      await createUser(data).unwrap();
      enqueueSnackbar('User created successfully', { variant: 'success' });
      reset();
      onClose();
    } catch (err: any) {
      enqueueSnackbar(err.data?.detail || 'Failed to create user', { variant: 'error' });
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Create New User</DialogTitle>
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
              label="Password"
              type="password"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
              fullWidth
            />
            <TextField
              label="Full Name (optional)"
              {...register('full_name')}
              error={!!errors.full_name}
              helperText={errors.full_name?.message}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={isLoading}>
            Create
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// Temporary type for role selection
interface Role {
  id: number;
  name: string;
}
