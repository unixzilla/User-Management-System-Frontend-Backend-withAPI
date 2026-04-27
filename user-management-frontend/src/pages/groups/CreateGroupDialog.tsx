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
import { groupCreateSchema, type GroupCreateSchema } from '@/utils/validation';
import { useCreateGroupMutation } from '@/api';
import { useSnackbar } from 'notistack';
import { getErrorMessage } from '@/utils/format';

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateGroupDialog({ open, onClose }: CreateGroupDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [createGroup, { isLoading }] = useCreateGroupMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GroupCreateSchema>({
    resolver: zodResolver(groupCreateSchema),
  });

  React.useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const onSubmit = async (data: GroupCreateSchema) => {
    try {
      await createGroup(data).unwrap();
      enqueueSnackbar('Group created successfully', { variant: 'success' });
      reset();
      onClose();
    } catch (err: any) {
      enqueueSnackbar(getErrorMessage(err, 'Failed to create group'), { variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Group Name"
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
          <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="contained" loading={isLoading}>Create</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
