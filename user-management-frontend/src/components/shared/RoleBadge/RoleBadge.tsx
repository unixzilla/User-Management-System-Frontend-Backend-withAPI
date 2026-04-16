'use client';

import React from 'react';
import Chip from '@mui/material/Chip';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';

const ROLE_CONFIG: Record<
  string,
  { bgcolor: string; color: string; icon: React.ReactNode }
> = {
  admin: { bgcolor: '#d32f2f', color: '#fff', icon: <AdminPanelSettingsIcon fontSize="small" /> },
  editor: { bgcolor: '#ed6c02', color: '#fff', icon: <EditIcon fontSize="small" /> },
  viewer: { bgcolor: '#0288d1', color: '#fff', icon: <VisibilityIcon fontSize="small" /> },
};

interface RoleBadgeProps {
  role: string;
  size?: 'small' | 'medium';
}

export function RoleBadge({ role, size = 'small' }: RoleBadgeProps) {
  const config = ROLE_CONFIG[role.toLowerCase()] ?? { bgcolor: '#9e9e9e', color: '#fff', icon: null };
  const chipProps: React.ComponentProps<typeof Chip> = {
    label: role,
    size,
    variant: 'outlined',
    sx: {
      fontWeight: 500,
      textTransform: 'capitalize',
      bgcolor: config.bgcolor,
      color: config.color,
      '& .MuiChip-icon': { color: config.color },
    },
  };
  if (config.icon) {
    chipProps.icon = config.icon as React.ReactElement;
  }
  return <Chip {...chipProps} />;
}
