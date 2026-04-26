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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from '@tanstack/react-router';
import { useGetRolesQuery, useAssignRoleMutation, useRemoveRoleMutation, useGetUsersQuery } from '@/api';
import { isAdmin, canManageRoles } from '@/utils/permissions';
import { useAppSelector } from '@/hooks.redux';
import { Role, User } from '@/types';
import { useSnackbar } from 'notistack';

// Import existing dialogs if needed (reuse confirm pattern)
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog';

export function RoleDetailPage(props: { roleId?: string }) {
  const roleId = props.roleId || '';
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user: currentUser } = useAppSelector((state) => state.auth);

  // Queries
  const { data: allRoles = [], isLoading: rolesLoading } = useGetRolesQuery({});
  const { data: usersData, isLoading: usersLoading } = useGetUsersQuery({});
  const allUsers = usersData?.items ?? [];

  // Mutations
  const [assignRole, { isLoading: assigning }] = useAssignRoleMutation();
  const [removeRole, { isLoading: removing }] = useRemoveRoleMutation();

  // Local state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [usersToAdd, setUsersToAdd] = useState<Set<string>>(new Set());
  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Find the current role from allRoles list
  const role = useMemo(() => {
    if (!roleId) return null;
    return allRoles.find((r) => r.id === parseInt(roleId, 10)) || null;
  }, [allRoles, roleId]);

  // Get users currently in this role
  const usersInRole = useMemo(() => {
    if (!role) return [];
    // Filter users whose roles array includes this role's name
    return allUsers.filter((user) => user.roles?.includes(role.name));
  }, [allUsers, role]);

  // Search functionality: find users that match keyword AND are not already in this role
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setSearchResults([]);
      return;
    }

    const keyword = searchKeyword.toLowerCase();
    const results = allUsers.filter((user) => {
      const alreadyInRole = usersInRole.some((ur) => ur.id === user.id);
      if (alreadyInRole) return false;

      const matchesEmail = user.email.toLowerCase().includes(keyword);
      const matchesUsername = user.username.toLowerCase().includes(keyword);
      return matchesEmail || matchesUsername;
    });
    setSearchResults(results);
  }, [searchKeyword, allUsers, usersInRole]);

  // Handle checkbox toggle for adding users
  const handleUserToggle = (userId: string) => {
    setUsersToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Add selected users to role
  const handleAddUsers = async () => {
    if (!role) return;

    try {
      await Promise.all(
        Array.from(usersToAdd).map((userId) =>
          assignRole({ userId, roleId: role.id }).unwrap()
        )
      );
      enqueueSnackbar(`Added ${usersToAdd.size} user(s) to role "${role.name}"`, { variant: 'success' });
      setUsersToAdd(new Set());
      setSearchKeyword('');
      setSearchResults([]);
    } catch (err: any) {
      enqueueSnackbar(err.data?.detail || 'Failed to add users to role', { variant: 'error' });
    }
  };

  // Initiate remove user from role
  const initiateRemoveUser = (user: User) => {
    setUserToRemove(user);
    setShowRemoveConfirm(true);
  };

  // Confirm remove user from role
  const confirmRemoveUser = async () => {
    if (!role || !userToRemove) return;

    try {
      await removeRole({ userId: userToRemove.id, roleId: role.id }).unwrap();
      enqueueSnackbar(`Removed ${userToRemove.username} from role "${role.name}"`, { variant: 'success' });
      setShowRemoveConfirm(false);
      setUserToRemove(null);
    } catch (err: any) {
      enqueueSnackbar(err.data?.detail || 'Failed to remove user from role', { variant: 'error' });
    }
  };

  // Admin role protection: prevent access to admin role detail
  useEffect(() => {
    if (role && role.name === 'admin' && !canManageRoles(currentUser)) {
      enqueueSnackbar('Access denied: Admin role management is restricted', { variant: 'error' });
      navigate({ to: '/roles' });
    }
  }, [role, currentUser, navigate, enqueueSnackbar]);

  // Loading states
  if (rolesLoading || usersLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Role not found
  if (!role) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">Role not found</Alert>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate({ to: '/roles' })} sx={{ mt: 2 }}>
            Back to Roles
          </Button>
        </Box>
      </Container>
    );
  }

  // Admin role protection (render warning if admin but not show management UI)
  const isAdminRole = role.name === 'admin';
  const canManage = canManageRoles(currentUser);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate({ to: '/roles' })} sx={{ mb: 2 }}>
          Back to Roles
        </Button>

        <Paper sx={{ p: 3, bgcolor: isAdminRole ? 'error.light' : 'background.paper' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="h4">{role.name}</Typography>
              {role.description && (
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  {role.description}
                </Typography>
              )}
              <Chip
                label={`${usersInRole.length} user${usersInRole.length !== 1 ? 's' : ''}`}
                size="small"
                sx={{ mt: 2 }}
              />
            </Box>
            {isAdminRole && (
              <Alert severity="warning" sx={{ ml: 2 }}>
                Protected Role
              </Alert>
            )}
          </Box>
        </Paper>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Users in this role section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Users in this Role
        </Typography>
        {usersInRole.length === 0 ? (
          <Alert severity="info">No users assigned to this role yet.</Alert>
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
                {usersInRole.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        color="error"
                        onClick={() => initiateRemoveUser(user)}
                        disabled={isAdminRole || !canManage || removing}
                        title={`Remove ${user.username} from ${role.name}`}
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

      {/* Add users to role section */}
      {!isAdminRole && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Add Users to Role
          </Typography>
          <TextField
            fullWidth
            placeholder="Search by username or email..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
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
                    No matching users found (or users already in this role)
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
                          <input
                            type="checkbox"
                            checked={usersToAdd.has(user.id)}
                            readOnly
                          />
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
              <Chip
                label={`${usersToAdd.size} selected`}
                onDelete={() => setUsersToAdd(new Set())}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddUsers}
                disabled={assigning}
                size="small"
              >
                Add to Role
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Remove user confirmation dialog */}
      <Dialog open={showRemoveConfirm} onClose={() => setShowRemoveConfirm(false)}>
        <DialogTitle>Remove User from Role</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove <strong>{userToRemove?.username}</strong> from the role{' '}
            <strong>{role.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRemoveConfirm(false)} disabled={removing}>
            Cancel
          </Button>
          <Button onClick={confirmRemoveUser} color="error" variant="contained" disabled={removing}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}