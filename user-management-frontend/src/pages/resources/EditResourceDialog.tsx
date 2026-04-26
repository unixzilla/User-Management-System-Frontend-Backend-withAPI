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
import { resourceUpdateSchema, type ResourceUpdateSchema } from '@/utils/validation';
import { useUpdateResourceMutation } from '@/api';
import { useSnackbar } from 'notistack';
import { Resource } from '@/types';

interface EditResourceDialogProps {
  open: boolean;
  onClose: () => void;
  resource: Resource;
}

export function EditResourceDialog({ open, onClose, resource }: EditResourceDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [updateResource, { isLoading }] = useUpdateResourceMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResourceUpdateSchema>({
    resolver: zodResolver(resourceUpdateSchema),
    defaultValues: {
      name: resource.name,
      description: resource.description || '',
    },
  });

  React.useEffect(() => {
    if (open && resource) {
      reset({
        name: resource.name,
        description: resource.description || '',
      });
    }
  }, [open, resource, reset]);

  const onSubmit = async (data: ResourceUpdateSchema) => {
    try {
      await updateResource({ resourceId: resource.id, data }).unwrap();
      enqueueSnackbar('Resource updated successfully', { variant: 'success' });
      onClose();
    } catch (err: any) {
      enqueueSnackbar(err.data?.detail || 'Failed to update resource', { variant: 'error' });
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Edit Resource</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Resource Name"
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
