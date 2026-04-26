import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  Button,
  Divider,
  TextField,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useAppSelector } from '@/hooks.redux';
import { formatDateTime } from '@/utils/format';
import { UserAvatar } from '@/components/common/Avatar/Avatar';
import { EditProfileDialog } from './EditProfileDialog';

export function ProfilePage() {
  const { user } = useAppSelector((state) => state.auth);
  const [openEdit, setOpenEdit] = useState(false);

  if (!user) return null;

  return (
    <Container maxWidth="md">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">My Profile</Typography>
        <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setOpenEdit(true)}>
          Edit Profile
        </Button>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
          <UserAvatar username={user.username} size="large" />
          <Box>
            <Typography variant="h5">
              {user.full_name || user.username}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              @{user.username}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              {user.roles.map((role) => (
                <span key={role} style={{ textTransform: 'capitalize' }}>
                  {role}
                </span>
              ))}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Email
            </Typography>
            <Typography>{user.email}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Username
            </Typography>
            <Typography>{user.username}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Full Name
            </Typography>
            <Typography>{user.full_name || '-'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Verified
            </Typography>
            <Typography>{user.is_verified ? 'Yes' : 'No'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Created At
            </Typography>
            <Typography>{formatDateTime(user.created_at)}</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Edit Profile Dialog */}
      {user && (
        <EditProfileDialog
          open={openEdit}
          onClose={() => setOpenEdit(false)}
          user={user}
        />
      )}
    </Container>
  );
}
