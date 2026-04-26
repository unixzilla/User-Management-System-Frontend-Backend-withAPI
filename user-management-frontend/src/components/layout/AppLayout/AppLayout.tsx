import React, { useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Outlet } from '@tanstack/react-router';
import { Header } from '../Header/Header';
import { Sidebar } from '../Sidebar/Sidebar';

const DRAWER_WIDTH = 240;

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Header onMenuClick={handleDrawerToggle} />
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
