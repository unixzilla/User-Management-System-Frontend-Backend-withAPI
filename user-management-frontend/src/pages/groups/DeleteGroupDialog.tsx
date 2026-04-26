import React from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog';
import { useDeleteGroupMutation } from '@/api';
import { useSnackbar } from 'notistack';
import { UserGroup } from '@/types';

interface DeleteGroupDialogProps {
  open: boolean;
  group: UserGroup;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteGroupDialog({ open, group, onClose, onConfirm }: DeleteGroupDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [deleteGroup, { isLoading }] = useDeleteGroupMutation();

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
      message={`Are you sure you want to delete the group "${group.name}"? Members will retain their directly assigned roles.`}
      confirmText="Delete"
      isLoading={isLoading}
      onConfirm={handleConfirm}
      onCancel={onClose}
    />
  );
}
