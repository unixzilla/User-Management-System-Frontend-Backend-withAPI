import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  MenuItem,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { permissionUpdateSchema, type PermissionUpdateSchema } from '@/utils/validation';
import { useUpdatePermissionMutation, useGetResourcesQuery } from '@/api';
import { useSnackbar } from 'notistack';
import { Permission } from '@/types';

const ACTIONS = ['read', 'write', 'delete'];

interface EditPermissionDialogProps {
  open: boolean;
  onClose: () => void;
  permission: Permission;
}

export function EditPermissionDialog({ open, onClose, permission }: EditPermissionDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [updatePermission, { isLoading }] = useUpdatePermissionMutation();
  const { data: resourcesResponse } = useGetResourcesQuery();
  const resources = resourcesResponse?.items ?? [];

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PermissionUpdateSchema>({
    resolver: zodResolver(permissionUpdateSchema),
    defaultValues: {
      name: permission.name,
      description: permission.description || '',
      resource: permission.resource,
      action: permission.action,
    },
  });

  React.useEffect(() => {
    if (open && permission) {
      reset({
        name: permission.name,
        description: permission.description || '',
        resource: permission.resource,
        action: permission.action,
      });
    }
  }, [open, permission, reset]);

  const onSubmit = async (data: PermissionUpdateSchema) => {
    try {
      await updatePermission({ permissionId: permission.id, data }).unwrap();
      enqueueSnackbar('Permission updated successfully', { variant: 'success' });
      onClose();
    } catch (err: any) {
      enqueueSnackbar(err.data?.detail || 'Failed to update permission', { variant: 'error' });
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Edit Permission</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Permission Name"
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
              fullWidth
            />
            <Controller
              name="resource"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Resource"
                  error={!!errors.resource}
                  helperText={errors.resource?.message}
                  fullWidth
                  select
                >
                  {resources.map((r) => (
                    <MenuItem key={r.id} value={r.name}>{r.name}</MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="action"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Action"
                  error={!!errors.action}
                  helperText={errors.action?.message}
                  fullWidth
                  select
                >
                  {ACTIONS.map((a) => (
                    <MenuItem key={a} value={a}>{a}</MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Description (optional)"
              {...register('description')}
              error={!!errors.description}
              helperText={errors.description?.message}
              fullWidth
              multiline
              rows={2}
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
