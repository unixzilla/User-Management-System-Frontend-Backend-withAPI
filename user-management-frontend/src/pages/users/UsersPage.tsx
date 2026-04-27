import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  TextField,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { UserTable } from '@/components/table/UserTable/UserTable';
import { useGetUsersQuery } from '@/api';
import { User } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';
import { CreateUserDialog } from './CreateUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { DeleteUserDialog } from './DeleteUserDialog';

export function UsersPage() {
  const { canEditUsers, canDeleteUsers } = usePermissions();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
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

  const { data, isLoading } = useGetUsersQuery({
    skip: page * rowsPerPage,
    limit: rowsPerPage,
    search: search || undefined,
  });
  const users = data?.items ?? [];
  const totalCount = data?.total ?? 0;

  const handlePageChange = (newPage: number, newRowsPerPage: number) => {
    setPage(newPage);
    if (newRowsPerPage !== rowsPerPage) {
      setRowsPerPage(newRowsPerPage);
    }
  };

  const handleRowClick = (user: User) => {
    if (!canEditUsers()) return;
    setSelectedUser(user);
    setOpenEdit(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setOpenEdit(true);
  };

  const handleDelete = (user: User) => {
    setDeleteUser(user);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Users</Typography>
        {canEditUsers() && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}>
            Create User
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by username or email..."
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
        <UserTable
          users={users}
          loading={isLoading}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={totalCount}
          onPageChange={handlePageChange}
          onRowClick={handleRowClick}
          onDelete={canDeleteUsers() ? handleDelete : undefined}
        />
      </Paper>

      {/* Create Dialog */}
      <CreateUserDialog open={openCreate} onClose={() => setOpenCreate(false)} />

      {/* Edit Dialog */}
      {selectedUser && (
        <EditUserDialog
          open={openEdit}
          onClose={() => {
            setOpenEdit(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
        />
      )}

      {/* Delete Dialog */}
      {deleteUser && (
        <DeleteUserDialog
          open={!!deleteUser}
          user={deleteUser}
          onClose={() => {
            setDeleteUser(null);
          }}
          onConfirm={() => {
            setDeleteUser(null);
          }}
        />
      )}
    </Container>
  );
}
