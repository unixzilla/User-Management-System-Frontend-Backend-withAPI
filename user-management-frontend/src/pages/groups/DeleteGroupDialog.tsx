import React from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog';
import { useDeleteGroupMutation } from '@/api';
import { useSnackbar } from 'notistack';
import { UserGroup } from '@/types';
import { Alert, Box } from '@mui/material';

interface DeleteGroupDialogProps {
  open: boolean;
  group: UserGroup;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteGroupDialog({ open, group, onClose, onConfirm }: DeleteGroupDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [deleteGroup, { isLoading }] = useDeleteGroupMutation();
  const hasMembers = group.member_count > 0;

  const handleConfirm = async () => {
    try {
      await deleteGroup(group.id).unwrap();
      enqueueSnackbar(`Group "${group.name}" deleted successfully`, { variant: 'success' });
      onConfirm();
    } catch (err: any) {
      enqueueSnackbar(err.data?.detail || 'Failed to delete group', { variant: 'error' });
    }
  };

  return (
    <ConfirmDialog
      open={open}
      title="Delete Group"
      message={
        <Box>
          {hasMembers ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Cannot delete group "{group.name}" because it has {group.member_count} member(s).
              Remove all members from the group before deleting it.
            </Alert>
          ) : (
            `Are you sure you want to delete the group "${group.name}"?`
          )}
        </Box>
      }
      confirmText={hasMembers ? 'Delete (disabled - remove members first)' : 'Delete'}
      disabled={hasMembers}
      isLoading={isLoading}
      onConfirm={handleConfirm}
      onCancel={onClose}
    />
  );
}
