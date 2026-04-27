import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Link as MuiLink,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from '@tanstack/react-router';
import { useGetRolesQuery, useDeleteRoleMutation } from '@/api';
import { Role } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';
import { CreateRoleDialog } from './CreateRoleDialog';
import { DeleteRoleDialog } from './DeleteRoleDialog';
import { EditRoleDialog } from './EditRoleDialog';

export function RolesPage() {
  const navigate = useNavigate();
  const { canViewRoles, canManageRoles, canDeleteRoles } = usePermissions();
  const { data: roles = [], isLoading } = useGetRolesQuery({});
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<Role | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  if (!canViewRoles()) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h5" color="error">
            You do not have permission to access this page.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Roles</Typography>
        {canManageRoles() && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}>
            Create Role
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id} hover>
                  <TableCell>{role.id}</TableCell>
                  <TableCell>
                    <Button
                      onClick={() => navigate({ to: '/roles/$roleId', params: { roleId: role.id.toString() } })}
                      sx={{ textTransform: 'none', fontWeight: 500, p: 0, minWidth: 'unset' }}
                    >
                      {role.name}
                    </Button>
                  </TableCell>
                  <TableCell>{role.description || '-'}</TableCell>
                  <TableCell align="right">
                    {canManageRoles() && (
                      <IconButton
                        color="primary"
                        onClick={() => {
                          setSelectedRoleForEdit(role);
                          setOpenEdit(true);
                        }}
                        disabled={role.name === 'admin'}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                    {canDeleteRoles() && (
                      <IconButton
                        color="error"
                        onClick={() => {
                          setSelectedRole(role);
                          setOpenDelete(true);
                        }}
                        disabled={role.name === 'admin'}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Role Dialog */}
      <CreateRoleDialog open={openCreate} onClose={() => setOpenCreate(false)} />

      {/* Edit Role Dialog */}
      {selectedRoleForEdit && (
        <EditRoleDialog
          open={openEdit}
          onClose={() => {
            setOpenEdit(false);
            setSelectedRoleForEdit(null);
          }}
          role={selectedRoleForEdit}
        />
      )}

      {/* Delete Role Dialog */}
      {selectedRole && (
        <DeleteRoleDialog
          open={openDelete}
          role={selectedRole}
          onClose={() => {
            setOpenDelete(false);
            setSelectedRole(null);
          }}
          onConfirm={() => {
            setOpenDelete(false);
            setSelectedRole(null);
          }}
        />
      )}
    </Container>
  );
}
