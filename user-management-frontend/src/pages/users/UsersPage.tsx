'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { UserTable } from '@/components/table/UserTable/UserTable';
import { useGetUsersQuery } from '@/api';
import { User } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';
import { CreateUserDialog } from './CreateUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { DeleteUserDialog } from './DeleteUserDialog';

export function UsersPage() {
  const { canDeleteUser } = usePermissions();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const { data: users = [], isLoading } = useGetUsersQuery({
    skip: page * rowsPerPage,
    limit: rowsPerPage,
  });
  const totalCount = users.length;

  const handlePageChange = (newPage: number, newRowsPerPage: number) => {
    setPage(newPage);
    if (newRowsPerPage !== rowsPerPage) {
      setRowsPerPage(newRowsPerPage);
    }
  };

  const handleRowClick = (user: User) => {
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
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}>
          Create User
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <UserTable
          users={users}
          loading={isLoading}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={totalCount}
          onPageChange={handlePageChange}
          onRowClick={handleRowClick}
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
