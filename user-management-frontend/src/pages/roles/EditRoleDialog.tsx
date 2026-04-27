import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Chip,
  Typography,
  Paper,
  CircularProgress,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { roleUpdateSchema, type RoleUpdateSchema } from '@/utils/validation';
import {
  useUpdateRoleMutation,
  useGetPermissionsQuery,
  useGetRolePermissionsQuery,
  useAssignPermissionToRoleMutation,
  useRemovePermissionFromRoleMutation,
} from '@/api';
import { useSnackbar } from 'notistack';
import { Role, Permission } from '@/types';
import { getErrorMessage } from '@/utils/format';

interface EditRoleDialogProps {
  open: boolean;
  onClose: () => void;
  role: Role;
}

export function EditRoleDialog({ open, onClose, role }: EditRoleDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [updateRole, { isLoading }] = useUpdateRoleMutation();
  const [assignPermission] = useAssignPermissionToRoleMutation();
  const [removePermission] = useRemovePermissionFromRoleMutation();
  const { data: permData, isLoading: permsLoading } = useGetPermissionsQuery();
  const allPermissions = permData?.items ?? [];
  const { data: currentRolePerms = [], isLoading: rolePermsLoading } = useGetRolePermissionsQuery(
    role.id,
    { skip: !role.id }
  );
  const currentPermIds = new Set(currentRolePerms.map((p: Permission) => p.id));

  const [selectedPermIds, setSelectedPermIds] = useState<Set<number>>(new Set());

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleUpdateSchema>({
    resolver: zodResolver(roleUpdateSchema),
    defaultValues: {
      name: role.name,
      description: role.description || '',
    },
  });

  React.useEffect(() => {
    if (open && role) {
      reset({
        name: role.name,
        description: role.description || '',
      });
    }
  }, [open, role, reset]);

  React.useEffect(() => {
    if (open && currentRolePerms.length > 0) {
      setSelectedPermIds(new Set(currentRolePerms.map((p: Permission) => p.id)));
    }
  }, [open, currentRolePerms]);

  const togglePermission = (permId: number) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const permissionsByResource = useMemo(() => {
    const map: Record<string, Permission[]> = {};
    for (const p of allPermissions) {
      const r = p.resource;
      if (!map[r]) map[r] = [];
      map[r].push(p);
    }
    return map;
  }, [allPermissions]);

  const onSubmit = async (data: RoleUpdateSchema) => {
    try {
      await updateRole({ roleId: role.id, data }).unwrap();

      // Sync permissions: assign new, remove old
      const toAssign = Array.from(selectedPermIds).filter((id) => !currentPermIds.has(id));
      const toRemove = Array.from(currentPermIds).filter((id) => !selectedPermIds.has(id));

      await Promise.all([
        ...toAssign.map((permId) =>
          assignPermission({ roleId: role.id, permissionId: permId }).unwrap()
        ),
        ...toRemove.map((permId) =>
          removePermission({ roleId: role.id, permissionId: permId }).unwrap()
        ),
      ]);

      enqueueSnackbar('Role updated successfully', { variant: 'success' });
      onClose();
    } catch (err: any) {
      enqueueSnackbar(getErrorMessage(err, 'Failed to update role'), { variant: 'error' });
    }
  };

  const handleClose = () => {
    reset();
    setSelectedPermIds(new Set());
    onClose();
  };

  const isAdminRole = role.name === 'admin';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Edit Role</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Role Name"
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
              fullWidth
              disabled={isAdminRole}
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

            <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 600 }}>
              Permissions
            </Typography>
            {permsLoading || rolePermsLoading ? (
              <CircularProgress size={20} />
            ) : (
              Object.entries(permissionsByResource).map(([resource, perms]) => (
                <Paper key={resource} variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, textTransform: 'capitalize', fontWeight: 600 }}>
                    {resource}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {perms.map((perm) => {
                      const selected = selectedPermIds.has(perm.id);
                      const isAdminPerm = perm.name === 'admin';
                      return (
                        <Chip
                          key={perm.id}
                          label={`${perm.action}${perm.description ? ` — ${perm.description}` : ''}`}
                          color={selected ? 'primary' : 'default'}
                          variant={selected ? 'filled' : 'outlined'}
                          onClick={() => togglePermission(perm.id)}
                          disabled={isAdminPerm && currentPermIds.has(perm.id)}
                          size="small"
                          sx={{ cursor: 'pointer' }}
                        />
                      );
                    })}
                  </Box>
                </Paper>
              ))
            )}
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
