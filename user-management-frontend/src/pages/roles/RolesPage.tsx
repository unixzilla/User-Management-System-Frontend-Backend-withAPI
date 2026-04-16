'use client';

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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useGetRolesQuery, useDeleteRoleMutation } from '@/api';
import { Role } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';
import { CreateRoleDialog } from './CreateRoleDialog';
import { DeleteRoleDialog } from './DeleteRoleDialog';

export function RolesPage() {
  const { canManageRoles } = usePermissions();
  const { data: roles = [], isLoading } = useGetRolesQuery({});
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  if (!canManageRoles()) {
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
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}>
          Create Role
        </Button>
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
                  <TableCell>{role.name}</TableCell>
                  <TableCell>{role.description || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="error"
                      onClick={() => {
                        setSelectedRole(role);
                        setOpenDelete(true);
                      }}
                      disabled={role.name === 'admin'} // Protect admin role
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Role Dialog */}
      <CreateRoleDialog open={openCreate} onClose={() => setOpenCreate(false)} />

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
