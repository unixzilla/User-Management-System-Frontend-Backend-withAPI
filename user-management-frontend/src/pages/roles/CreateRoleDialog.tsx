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
import { roleCreateSchema, type RoleCreateSchema } from '@/utils/validation';
import { useCreateRoleMutation } from '@/api';
import { useSnackbar } from 'notistack';

interface CreateRoleDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateRoleDialog({ open, onClose }: CreateRoleDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [createRole, { isLoading }] = useCreateRoleMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleCreateSchema>({
    resolver: zodResolver(roleCreateSchema),
  });

  React.useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: RoleCreateSchema) => {
    try {
      await createRole(data).unwrap();
      enqueueSnackbar('Role created successfully', { variant: 'success' });
      reset();
      onClose();
    } catch (err: any) {
      enqueueSnackbar(err.data?.detail || 'Failed to create role', { variant: 'error' });
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Create New Role</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Role Name"
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
              fullWidth
            />
            <TextField
              label="Description (optional)"
              {...register('description')}
              error={!!errors.description}
              helperText={errors.description?.message}
              fullWidth
              multiline
              rows={3}
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
