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
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useGetPermissionsQuery } from '@/api';
import { Permission } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';
import { CreatePermissionDialog } from './CreatePermissionDialog';
import { EditPermissionDialog } from './EditPermissionDialog';
import { DeletePermissionDialog } from './DeletePermissionDialog';

export function PermissionsPage() {
  const { canManagePermissions } = usePermissions();
  const { data: permissionsResponse, isLoading } = useGetPermissionsQuery();
  const permissions = permissionsResponse?.items ?? [];

  const [selectedPerm, setSelectedPerm] = useState<Permission | null>(null);
  const [selectedPermForEdit, setSelectedPermForEdit] = useState<Permission | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  if (!canManagePermissions()) {
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
        <Typography variant="h4">Permissions</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}>
          Create Permission
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Resource</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {permissions.map((perm) => (
                <TableRow key={perm.id} hover>
                  <TableCell>{perm.id}</TableCell>
                  <TableCell>
                    <Chip label={perm.name} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell>{perm.resource}</TableCell>
                  <TableCell>{perm.action}</TableCell>
                  <TableCell>{perm.description || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      onClick={() => {
                        setSelectedPermForEdit(perm);
                        setOpenEdit(true);
                      }}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => {
                        setSelectedPerm(perm);
                        setOpenDelete(true);
                      }}
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

      <CreatePermissionDialog open={openCreate} onClose={() => setOpenCreate(false)} />

      {selectedPermForEdit && (
        <EditPermissionDialog
          open={openEdit}
          onClose={() => {
            setOpenEdit(false);
            setSelectedPermForEdit(null);
          }}
          permission={selectedPermForEdit}
        />
      )}

      {selectedPerm && (
        <DeletePermissionDialog
          open={openDelete}
          permission={selectedPerm}
          onClose={() => {
            setOpenDelete(false);
            setSelectedPerm(null);
          }}
          onConfirm={() => {
            setOpenDelete(false);
            setSelectedPerm(null);
          }}
        />
      )}
    </Container>
  );
}
