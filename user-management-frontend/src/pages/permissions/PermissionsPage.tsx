import React, { useState, useEffect, useRef } from 'react';
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
  TablePagination,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useGetPermissionsQuery } from '@/api';
import { Permission } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';
import { CreatePermissionDialog } from './CreatePermissionDialog';
import { EditPermissionDialog } from './EditPermissionDialog';
import { DeletePermissionDialog } from './DeletePermissionDialog';

export function PermissionsPage() {
  const { canViewPermissions, canManagePermissions, canDeletePermissions } = usePermissions();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const debounceRef = useRef<number>(0);

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const { data: permissionsResponse, isLoading } = useGetPermissionsQuery({
    skip: page * rowsPerPage,
    limit: rowsPerPage,
    search: search || undefined,
  });
  const permissions = permissionsResponse?.items ?? [];
  const totalCount = permissionsResponse?.total ?? 0;

  const [selectedPerm, setSelectedPerm] = useState<Permission | null>(null);
  const [selectedPermForEdit, setSelectedPermForEdit] = useState<Permission | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (!canViewPermissions()) {
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
        {canManagePermissions() && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}>
            Create Permission
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by name, resource, or action..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
          size="small"
          sx={{ mb: 2 }}
        />

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
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
                        {canManagePermissions() && (
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
                        )}
                        {canDeletePermissions() && (
                          <IconButton
                            color="error"
                            onClick={() => {
                              setSelectedPerm(perm);
                              setOpenDelete(true);
                            }}
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
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={totalCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
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
