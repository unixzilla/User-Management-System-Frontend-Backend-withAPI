import React from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog';
import { useDeletePermissionMutation } from '@/api';
import { useSnackbar } from 'notistack';
import { Permission } from '@/types';

interface DeletePermissionDialogProps {
  open: boolean;
  permission: Permission;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeletePermissionDialog({ open, permission, onClose, onConfirm }: DeletePermissionDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [deletePermission] = useDeletePermissionMutation();

  const handleConfirm = async () => {
    try {
      await deletePermission(permission.id).unwrap();
      enqueueSnackbar(`Permission "${permission.name}" deleted successfully`, { variant: 'success' });
      onConfirm();
    } catch (err: any) {
      enqueueSnackbar(err.data?.detail || 'Failed to delete permission', { variant: 'error' });
    }
  };

  return (
    <ConfirmDialog
      open={open}
      title="Delete Permission"
      message={`Are you sure you want to delete the permission "${permission.name}"? This will remove it from all assigned roles.`}
      confirmText="Delete"
      cancelText="Cancel"
      onConfirm={handleConfirm}
      onCancel={onClose}
    />
  );
}
