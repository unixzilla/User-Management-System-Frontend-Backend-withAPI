import React from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog';
import { useDeleteUserMutation } from '@/api';
import { useSnackbar } from 'notistack';
import { User } from '@/types';
import { getErrorMessage } from '@/utils/format';

interface DeleteUserDialogProps {
  open: boolean;
  user: User;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteUserDialog({ open, user, onClose, onConfirm }: DeleteUserDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [deleteUser] = useDeleteUserMutation();

  const handleConfirm = async () => {
    try {
      await deleteUser(user.id).unwrap();
      enqueueSnackbar(`User "${user.username}" deleted successfully`, { variant: 'success' });
      onConfirm();
    } catch (err: any) {
      enqueueSnackbar(getErrorMessage(err, 'Failed to delete user'), { variant: 'error' });
    }
  };

  return (
    <ConfirmDialog
      open={open}
      title="Delete User"
      message={`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      onConfirm={handleConfirm}
      onCancel={onClose}
    />
  );
}
