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
import { roleUpdateSchema, type RoleUpdateSchema } from '@/utils/validation';
import { useUpdateRoleMutation } from '@/api';
import { useSnackbar } from 'notistack';
import { Role } from '@/types';

interface EditRoleDialogProps {
  open: boolean;
  onClose: () => void;
  role: Role;
}

export function EditRoleDialog({ open, onClose, role }: EditRoleDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [updateRole, { isLoading }] = useUpdateRoleMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleUpdateSchema>({
    resolver: zodResolver(roleUpdateSchema),
    defaultValues: {
      name: role.name,
      description: role.description || '',
    },
  });

  React.useEffect(() => {
    if (open && role) {
      reset({
        name: role.name,
        description: role.description || '',
      });
    }
  }, [open, role, reset]);

  const onSubmit = async (data: RoleUpdateSchema) => {
    try {
      await updateRole({ roleId: role.id, data }).unwrap();
      enqueueSnackbar('Role updated successfully', { variant: 'success' });
      onClose();
    } catch (err: any) {
      enqueueSnackbar(err.data?.detail || 'Failed to update role', { variant: 'error' });
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Edit Role</DialogTitle>
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
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
