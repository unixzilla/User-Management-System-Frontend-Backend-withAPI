import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useNavigate } from '@tanstack/react-router';
import { useAppSelector } from '@/hooks.redux';
import { isAdmin } from '@/utils/permissions';
import { UserAvatar } from '@/components/common/Avatar/Avatar';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const admin = isAdmin(user);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Welcome Card */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <UserAvatar username={user?.username} size="large" />
              <Box>
                <Typography variant="h5">
                  Welcome, {user?.full_name || user?.username}!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {user?.roles.map((role) => (
                    <span key={role} style={{ textTransform: 'capitalize' }}>
                      {role}
                    </span>
                  ))}
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Quick Stats */}
        {admin && (
          <>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PeopleIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        Total Users
                      </Typography>
                      <Typography variant="h4">--</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AdminPanelSettingsIcon color="secondary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        Roles
                      </Typography>
                      <Typography variant="h4">--</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Quick Actions */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {admin && (
                <Button
                  variant="contained"
                  startIcon={<PeopleIcon />}
                  onClick={() => navigate({ to: '/users' })}
                >
                  Manage Users
                </Button>
              )}
              {admin && (
                <Button
                  variant="outlined"
                  startIcon={<AdminPanelSettingsIcon />}
                  onClick={() => navigate({ to: '/roles' })}
                >
                  Manage Roles
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<AccountCircleIcon />}
                onClick={() => navigate({ to: '/profile' })}
              >
                Edit Profile
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
