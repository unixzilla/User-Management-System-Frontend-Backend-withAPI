import React from 'react';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Toolbar,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import GroupIcon from '@mui/icons-material/Group';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CategoryIcon from '@mui/icons-material/Category';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useAppSelector } from '@/hooks.redux';
import {
  canViewUsers,
  canViewRoles,
  canViewGroups,
  canViewPermissions,
  canViewResources,
} from '@/utils/permissions';

const DRAWER_WIDTH = 240;

const MENU_ITEMS = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon />, guard: null },
  { label: 'Users', path: '/users', icon: <PeopleIcon />, guard: canViewUsers },
  { label: 'Roles', path: '/roles', icon: <AdminPanelSettingsIcon />, guard: canViewRoles },
  { label: 'Groups', path: '/groups', icon: <GroupIcon />, guard: canViewGroups },
  { label: 'Permissions', path: '/permissions', icon: <VpnKeyIcon />, guard: canViewPermissions },
  { label: 'Resources', path: '/resources', icon: <CategoryIcon />, guard: canViewResources },
  { label: 'Profile', path: '/profile', icon: <PersonIcon />, guard: null },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);

  const filteredItems = MENU_ITEMS.filter((item) => {
    if (!item.guard) return true;
    return user && item.guard(user);
  });

  const handleNavigation = (path: string) => {
    navigate({ to: path });
    onClose();
  };

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      <List>
        {filteredItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
        }}
      >
        {drawer}
      </Drawer>
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
}
