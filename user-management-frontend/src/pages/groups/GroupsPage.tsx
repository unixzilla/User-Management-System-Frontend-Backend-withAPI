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
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from '@tanstack/react-router';
import { useGetGroupsQuery, useDeleteGroupMutation } from '@/api';
import { UserGroup } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';
import { CreateGroupDialog } from './CreateGroupDialog';
import { DeleteGroupDialog } from './DeleteGroupDialog';
import { EditGroupDialog } from './EditGroupDialog';

export function GroupsPage() {
  const navigate = useNavigate();
  const { canViewGroups, canManageGroups, canDeleteGroups } = usePermissions();
  const { data: groupsData, isLoading } = useGetGroupsQuery();
  const groups = groupsData?.items ?? [];
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState<UserGroup | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  if (!canViewGroups()) {
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
        <Typography variant="h4">Groups</Typography>
        {canManageGroups() && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}>
            Create Group
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
                <TableCell align="center">Members</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((group: UserGroup) => (
                <TableRow key={group.id} hover>
                  <TableCell>{group.id}</TableCell>
                  <TableCell>
                    <Button
                      onClick={() => navigate({ to: '/groups/$groupId', params: { groupId: group.id.toString() } })}
                      sx={{ textTransform: 'none', fontWeight: 500, p: 0, minWidth: 'unset' }}
                    >
                      {group.name}
                    </Button>
                  </TableCell>
                  <TableCell>{group.description || '-'}</TableCell>
                  <TableCell align="center">
                    {group.member_count > 0 ? (
                      <Button
                        onClick={() => navigate({ to: '/groups/$groupId', params: { groupId: group.id.toString() } })}
                        sx={{ textTransform: 'none', fontWeight: 600, p: 0, minWidth: 'unset' }}
                      >
                        {group.member_count}
                      </Button>
                    ) : (
                      group.member_count
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {canManageGroups() && (
                      <IconButton
                        color="primary"
                        onClick={() => {
                          setSelectedGroupForEdit(group);
                          setOpenEdit(true);
                        }}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                    {canDeleteGroups() && (
                      <IconButton
                        color="error"
                        onClick={() => {
                          setSelectedGroup(group);
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
      </Paper>

      <CreateGroupDialog open={openCreate} onClose={() => setOpenCreate(false)} />

      {selectedGroupForEdit && (
        <EditGroupDialog
          open={openEdit}
          onClose={() => {
            setOpenEdit(false);
            setSelectedGroupForEdit(null);
          }}
          group={selectedGroupForEdit}
        />
      )}

      {selectedGroup && (
        <DeleteGroupDialog
          open={openDelete}
          group={selectedGroup}
          onClose={() => {
            setOpenDelete(false);
            setSelectedGroup(null);
          }}
          onConfirm={() => {
            setOpenDelete(false);
            setSelectedGroup(null);
          }}
        />
      )}
    </Container>
  );
}
