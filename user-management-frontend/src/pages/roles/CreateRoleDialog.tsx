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
import { roleCreateSchema, type RoleCreateSchema } from '@/utils/validation';
import {
  useCreateRoleMutation,
  useGetPermissionsQuery,
  useAssignPermissionToRoleMutation,
} from '@/api';
import { useSnackbar } from 'notistack';
import { Permission } from '@/types';

interface CreateRoleDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateRoleDialog({ open, onClose }: CreateRoleDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [createRole, { isLoading }] = useCreateRoleMutation();
  const [assignPermission] = useAssignPermissionToRoleMutation();
  const { data: permData, isLoading: permsLoading } = useGetPermissionsQuery();
  const allPermissions = permData?.items ?? [];
  const [selectedPermIds, setSelectedPermIds] = useState<Set<number>>(new Set());

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleCreateSchema>({
    resolver: zodResolver(roleCreateSchema),
  });

  React.useEffect(() => {
    if (open) {
      reset();
      setSelectedPermIds(new Set());
    }
  }, [open, reset]);

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

  const onSubmit = async (data: RoleCreateSchema) => {
    try {
      const result = await createRole(data).unwrap();
      // Assign selected permissions
      if (selectedPermIds.size > 0) {
        await Promise.all(
          Array.from(selectedPermIds).map((permId) =>
            assignPermission({ roleId: result.id, permissionId: permId }).unwrap()
          )
        );
      }
      enqueueSnackbar('Role created successfully', { variant: 'success' });
      reset();
      setSelectedPermIds(new Set());
      onClose();
    } catch (err: any) {
      enqueueSnackbar(err.data?.detail || 'Failed to create role', { variant: 'error' });
    }
  };

  const handleClose = () => {
    reset();
    setSelectedPermIds(new Set());
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Create New Role</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Role Name"
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
              rows={2}
            />

            <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 600 }}>
              Permissions
            </Typography>
            {permsLoading ? (
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
                      return (
                        <Chip
                          key={perm.id}
                          label={`${perm.action}${perm.description ? ` — ${perm.description}` : ''}`}
                          color={selected ? 'primary' : 'default'}
                          variant={selected ? 'filled' : 'outlined'}
                          onClick={() => togglePermission(perm.id)}
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
            Create
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
