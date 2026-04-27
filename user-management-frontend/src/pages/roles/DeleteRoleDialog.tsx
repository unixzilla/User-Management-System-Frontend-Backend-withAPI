import React from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog';
import { useDeleteRoleMutation } from '@/api';
import { useSnackbar } from 'notistack';
import { Role } from '@/types';
import { getErrorMessage } from '@/utils/format';

interface DeleteRoleDialogProps {
  open: boolean;
  role: Role;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteRoleDialog({ open, role, onClose, onConfirm }: DeleteRoleDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [deleteRole] = useDeleteRoleMutation();

  const handleConfirm = async () => {
    try {
      await deleteRole(role.id).unwrap();
      enqueueSnackbar(`Role "${role.name}" deleted successfully`, { variant: 'success' });
      onConfirm();
    } catch (err: any) {
      enqueueSnackbar(getErrorMessage(err, 'Failed to delete role (may be assigned to users)'), { variant: 'error' });
    }
  };

  return (
    <ConfirmDialog
      open={open}
      title="Delete Role"
      message={`Are you sure you want to delete the role "${role.name}"? This cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      onConfirm={handleConfirm}
      onCancel={onClose}
    />
  );
}
