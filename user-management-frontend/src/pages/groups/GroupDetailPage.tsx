import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  Button,
  IconButton,
  Chip,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate, useLocation } from '@tanstack/react-router';
import {
  useGetGroupsQuery,
  useGetGroupQuery,
  useAddMemberToGroupMutation,
  useRemoveMemberFromGroupMutation,
  useAssignRoleToGroupMutation,
  useRemoveRoleFromGroupMutation,
  useGetUsersQuery,
  useGetRolesQuery,
} from '@/api';
import { canManageGroups } from '@/utils/permissions';
import { useAppSelector } from '@/hooks.redux';
import { User, Role } from '@/types';
import { useSnackbar } from 'notistack';

export function GroupDetailPage() {
  const location = useLocation();
  const groupId = location.pathname.split('/').pop() || '';
  const numericGroupId = parseInt(groupId, 10);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user: currentUser } = useAppSelector((state) => state.auth);

  const { data: group, isLoading: groupLoading, error: groupError } = useGetGroupQuery(numericGroupId, {
    skip: !groupId || isNaN(numericGroupId),
  });
  const { data: usersData, isLoading: usersLoading } = useGetUsersQuery({});
  const allUsers = usersData?.items ?? [];
  const { data: allRoles = [], isLoading: rolesLoading } = useGetRolesQuery({});

  const [addMember, { isLoading: addingMember }] = useAddMemberToGroupMutation();
  const [removeMember, { isLoading: removingMember }] = useRemoveMemberFromGroupMutation();
  const [assignRoleToGroup, { isLoading: assigningRole }] = useAssignRoleToGroupMutation();
  const [removeRoleFromGroup, { isLoading: removingRole }] = useRemoveRoleFromGroupMutation();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [usersToAdd, setUsersToAdd] = useState<Set<string>>(new Set());
  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<number | ''>('');
  const [roleToRemove, setRoleToRemove] = useState<Role | null>(null);
  const [showRemoveRoleConfirm, setShowRemoveRoleConfirm] = useState(false);

  useEffect(() => {
    if (!searchKeyword.trim()) {
      setSearchResults([]);
      return;
    }
    const keyword = searchKeyword.toLowerCase();
    const members = group?.members ?? [];
    const results = allUsers.filter((user) => {
      const alreadyInGroup = members.some((m) => m.id === user.id);
      if (alreadyInGroup) return false;
      return user.email.toLowerCase().includes(keyword) || user.username.toLowerCase().includes(keyword);
    });
    setSearchResults(results);
  }, [searchKeyword, allUsers, group]);

  const handleUserToggle = (userId: string) => {
    setUsersToAdd((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const handleAddUsers = async () => {
    if (!group) return;
    try {
      await Promise.all(
        Array.from(usersToAdd).map((userId) =>
          addMember({ groupId: group.id, data: { user_id: userId } }).unwrap()
        )
      );
      enqueueSnackbar(`Added ${usersToAdd.size} user(s) to group`, { variant: 'success' });
      setUsersToAdd(new Set());
      setSearchKeyword('');
      setSearchResults([]);
    } catch (err: any) {
      enqueueSnackbar(err.data?.detail || 'Failed to add users', { variant: 'error' });
    }
  };

  const initiateRemoveUser = (user: User) => {
    setUserToRemove(user);
    setShowRemoveConfirm(true);
  };

  const confirmRemoveUser = async () => {
    if (!group || !userToRemove) return;
    try {
      await removeMember({ groupId: group.id, userId: userToRemove.id }).unwrap();
      enqueueSnackbar(`Removed ${userToRemove.username} from group`, { variant: 'success' });
      setShowRemoveConfirm(false);
      setUserToRemove(null);
    } catch (err: any) {
      enqueueSnackbar(err.data?.detail || 'Failed to remove user', { variant: 'error' });
    }
  };

  const handleAddRole = async () => {
    if (!group || !selectedRoleToAdd) return;
    try {
      await assignRoleToGroup({ groupId: group.id, roleId: selectedRoleToAdd as number }).unwrap();
      const role = allRoles.find((r) => r.id === selectedRoleToAdd);
      enqueueSnackbar(`Role "${role?.name}" assigned to group`, { variant: 'success' });
      setSelectedRoleToAdd('');
    } catch (err: any) {
      enqueueSnackbar(err.data?.detail || 'Failed to assign role', { variant: 'error' });
    }
  };

  const initiateRemoveRole = (role: Role) => {
    setRoleToRemove(role);
    setShowRemoveRoleConfirm(true);
  };

  const confirmRemoveRole = async () => {
    if (!group || !roleToRemove) return;
    try {
      await removeRoleFromGroup({ groupId: group.id, roleId: roleToRemove.id }).unwrap();
      enqueueSnackbar(`Role "${roleToRemove.name}" removed from group`, { variant: 'success' });
      setShowRemoveRoleConfirm(false);
      setRoleToRemove(null);
    } catch (err: any) {
      enqueueSnackbar(err.data?.detail || 'Failed to remove role', { variant: 'error' });
    }
  };

  if (groupLoading || usersLoading || rolesLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!group) {
    const errorMsg = groupError
      ? ((groupError as any)?.data?.detail || (groupError as any)?.error || 'Failed to load group')
      : `Group with ID ${groupId} not found`;
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">{errorMsg}</Alert>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate({ to: '/groups' })} sx={{ mt: 2 }}>
            Back to Groups
          </Button>
        </Box>
      </Container>
    );
  }

  const members = group.members ?? [];
  const groupRoles = group.roles ?? [];
  const availableRoles = allRoles.filter((r) => !groupRoles.some((gr) => gr.id === r.id));
  const canManage = canManageGroups(currentUser);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate({ to: '/groups' })} sx={{ mb: 2 }}>
          Back to Groups
        </Button>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h4">{group.name}</Typography>
          {group.description && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              {group.description}
            </Typography>
          )}
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Chip label={`${members.length} member${members.length !== 1 ? 's' : ''}`} size="small" />
            <Chip label={`${groupRoles.length} role${groupRoles.length !== 1 ? 's' : ''}`} size="small" color="primary" variant="outlined" />
          </Box>
        </Paper>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Roles section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>Roles Assigned to Group</Typography>
        {groupRoles.length === 0 ? (
          <Alert severity="info">No roles assigned to this group yet.</Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Role</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>{role.name}</TableCell>
                    <TableCell>{role.description || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        color="error"
                        onClick={() => initiateRemoveRole(role)}
                        disabled={!canManage || removingRole}
                      >
                        <RemoveCircleIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {canManage && availableRoles.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              select
              size="small"
              label="Add role"
              value={selectedRoleToAdd}
              onChange={(e) => setSelectedRoleToAdd(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              slotProps={{
                htmlInput: { sx: { minWidth: 150 } },
              }}
            >
              <MenuItem value="">Select a role</MenuItem>
              {availableRoles.map((role) => (
                <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>
              ))}
            </TextField>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddRole}
              disabled={!selectedRoleToAdd || assigningRole}
              size="small"
            >
              Assign
            </Button>
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Members section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>Members</Typography>
        {members.length === 0 ? (
          <Alert severity="info">No members in this group yet.</Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.map((user: User) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        color="error"
                        onClick={() => initiateRemoveUser(user)}
                        disabled={!canManage || removingMember}
                      >
                        <RemoveCircleIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Add members section */}
      {canManage && (
        <Box>
          <Typography variant="h6" gutterBottom>Add Members</Typography>
          <TextField
            fullWidth
            placeholder="Search by username or email..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon /></InputAdornment>
                ),
              },
            }}
            sx={{ mb: 2 }}
          />

          {searchKeyword && (
            <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
              {searchResults.length === 0 ? (
                <Box sx={{ p: 2 }}>
                  <Typography color="text.secondary" variant="body2">
                    No matching users found (or users already in this group)
                  </Typography>
                </Box>
              ) : (
                <Table size="small">
                  <TableBody>
                    {searchResults.map((user) => (
                      <TableRow
                        key={user.id}
                        hover
                        onClick={() => handleUserToggle(user.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell padding="checkbox">
                          <input type="checkbox" checked={usersToAdd.has(user.id)} readOnly />
                        </TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          )}

          {usersToAdd.size > 0 && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip label={`${usersToAdd.size} selected`} onDelete={() => setUsersToAdd(new Set())} />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddUsers}
                disabled={addingMember}
                size="small"
              >
                Add to Group
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Remove member confirmation */}
      <Dialog open={showRemoveConfirm} onClose={() => setShowRemoveConfirm(false)}>
        <DialogTitle>Remove Member</DialogTitle>
        <DialogContent>
          <Typography>
            Remove <strong>{userToRemove?.username}</strong> from group <strong>{group.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRemoveConfirm(false)} disabled={removingMember}>Cancel</Button>
          <Button onClick={confirmRemoveUser} color="error" variant="contained" disabled={removingMember}>Remove</Button>
        </DialogActions>
      </Dialog>

      {/* Remove role confirmation */}
      <Dialog open={showRemoveRoleConfirm} onClose={() => setShowRemoveRoleConfirm(false)}>
        <DialogTitle>Remove Role from Group</DialogTitle>
        <DialogContent>
          <Typography>
            Remove role <strong>{roleToRemove?.name}</strong> from group <strong>{group.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRemoveRoleConfirm(false)} disabled={removingRole}>Cancel</Button>
          <Button onClick={confirmRemoveRole} color="error" variant="contained" disabled={removingRole}>Remove</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
