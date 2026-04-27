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
import { resourceCreateSchema, type ResourceCreateSchema } from '@/utils/validation';
import { useCreateResourceMutation } from '@/api';
import { useSnackbar } from 'notistack';
import { getErrorMessage } from '@/utils/format';

interface CreateResourceDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateResourceDialog({ open, onClose }: CreateResourceDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [createResource, { isLoading }] = useCreateResourceMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResourceCreateSchema>({
    resolver: zodResolver(resourceCreateSchema),
  });

  React.useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: ResourceCreateSchema) => {
    try {
      await createResource(data).unwrap();
      enqueueSnackbar('Resource created successfully', { variant: 'success' });
      reset();
      onClose();
    } catch (err: any) {
      enqueueSnackbar(getErrorMessage(err, 'Failed to create resource'), { variant: 'error' });
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Create New Resource</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Resource Name"
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message || 'e.g. orders, products'}
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
            Create
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
