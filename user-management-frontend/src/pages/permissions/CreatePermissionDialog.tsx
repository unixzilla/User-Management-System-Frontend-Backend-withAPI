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
import { permissionCreateSchema, type PermissionCreateSchema } from '@/utils/validation';
import { useCreatePermissionMutation, useGetResourcesQuery } from '@/api';
import { useSnackbar } from 'notistack';
import { getErrorMessage } from '@/utils/format';

const ACTIONS = ['read', 'write', 'delete'];

interface CreatePermissionDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreatePermissionDialog({ open, onClose }: CreatePermissionDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [createPermission, { isLoading }] = useCreatePermissionMutation();
  const { data: resourcesResponse } = useGetResourcesQuery();
  const resources = resourcesResponse?.items ?? [];

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PermissionCreateSchema>({
    resolver: zodResolver(permissionCreateSchema),
  });

  React.useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: PermissionCreateSchema) => {
    try {
      await createPermission(data).unwrap();
      enqueueSnackbar('Permission created successfully', { variant: 'success' });
      reset();
      onClose();
    } catch (err: any) {
      enqueueSnackbar(getErrorMessage(err, 'Failed to create permission'), { variant: 'error' });
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Create New Permission</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Permission Name"
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message || 'e.g. users.read'}
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
            Create
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
