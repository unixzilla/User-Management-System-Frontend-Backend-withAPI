import React from 'react';
import Avatar from '@mui/material/Avatar';
import PersonIcon from '@mui/icons-material/Person';

interface UserAvatarProps {
  username?: string | null;
  size?: 'small' | 'medium' | 'large';
}

export function UserAvatar({ username, size = 'medium' }: UserAvatarProps) {
  const sizeMap = {
    small: 32,
    medium: 40,
    large: 56,
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Avatar sx={{ width: sizeMap[size], height: sizeMap[size], bgcolor: 'primary.main' }}>
      {getInitials(username)}
    </Avatar>
  );
}
