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
import { groupUpdateSchema, type GroupUpdateSchema } from '@/utils/validation';
import { useUpdateGroupMutation } from '@/api';
import { useSnackbar } from 'notistack';
import { UserGroup } from '@/types';
import { getErrorMessage } from '@/utils/format';

interface EditGroupDialogProps {
  open: boolean;
  onClose: () => void;
  group: UserGroup;
}

export function EditGroupDialog({ open, onClose, group }: EditGroupDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [updateGroup, { isLoading }] = useUpdateGroupMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GroupUpdateSchema>({
    resolver: zodResolver(groupUpdateSchema),
  });

  React.useEffect(() => {
    if (open) {
      reset({ name: group.name, description: group.description });
    }
  }, [open, group, reset]);

  const onSubmit = async (data: GroupUpdateSchema) => {
    try {
      await updateGroup({ groupId: group.id, data }).unwrap();
      enqueueSnackbar('Group updated successfully', { variant: 'success' });
      onClose();
    } catch (err: any) {
      enqueueSnackbar(getErrorMessage(err, 'Failed to update group'), { variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Edit Group</DialogTitle>
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
          <Button type="submit" variant="contained" loading={isLoading}>Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
