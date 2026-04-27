import React from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog';
import { useDeleteResourceMutation } from '@/api';
import { useSnackbar } from 'notistack';
import { Resource } from '@/types';
import { getErrorMessage } from '@/utils/format';

interface DeleteResourceDialogProps {
  open: boolean;
  resource: Resource;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteResourceDialog({ open, resource, onClose, onConfirm }: DeleteResourceDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [deleteResource] = useDeleteResourceMutation();

  const handleConfirm = async () => {
    try {
      await deleteResource(resource.id).unwrap();
      enqueueSnackbar(`Resource "${resource.name}" deleted successfully`, { variant: 'success' });
      onConfirm();
    } catch (err: any) {
      enqueueSnackbar(getErrorMessage(err, 'Failed to delete resource'), { variant: 'error' });
    }
  };

  return (
    <ConfirmDialog
      open={open}
      title="Delete Resource"
      message={`Are you sure you want to delete the resource "${resource.name}"? ALL associated permissions will be permanently deleted.`}
      confirmText="Delete"
      cancelText="Cancel"
      onConfirm={handleConfirm}
      onCancel={onClose}
    />
  );
}
