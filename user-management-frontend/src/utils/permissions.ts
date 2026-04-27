import { User } from '@/types';

export const hasPermission = (user: User | null, permission: string): boolean =>
  !!user?.permissions?.includes(permission) || !!user?.permissions?.includes('admin');

export const hasRole = (user: User | null, role: string): boolean =>
  !!user?.roles?.includes(role);

export const isAdmin = (user: User | null): boolean =>
  hasPermission(user, 'admin');

// View permissions (read)
export const canViewUsers = (user: User | null): boolean =>
  hasPermission(user, 'users.read');

export const canViewRoles = (user: User | null): boolean =>
  hasPermission(user, 'roles.read');

export const canViewGroups = (user: User | null): boolean =>
  hasPermission(user, 'groups.read');

export const canViewPermissions = (user: User | null): boolean =>
  hasPermission(user, 'permissions.read');

export const canViewResources = (user: User | null): boolean =>
  hasPermission(user, 'resources.read');

// Manage permissions (write)
export const canEditUsers = (user: User | null): boolean =>
  hasPermission(user, 'users.write');

export const canDeleteUsers = (user: User | null): boolean =>
  hasPermission(user, 'users.delete');

export const canManageRoles = (user: User | null): boolean =>
  hasPermission(user, 'roles.write');

export const canDeleteRoles = (user: User | null): boolean =>
  hasPermission(user, 'roles.delete');

export const canManageGroups = (user: User | null): boolean =>
  hasPermission(user, 'groups.write');

export const canDeleteGroups = (user: User | null): boolean =>
  hasPermission(user, 'groups.delete');

export const canManagePermissions = (user: User | null): boolean =>
  hasPermission(user, 'permissions.write');

export const canDeletePermissions = (user: User | null): boolean =>
  hasPermission(user, 'permissions.delete');

export const canManageResources = (user: User | null): boolean =>
  hasPermission(user, 'resources.write');

export const canDeleteResources = (user: User | null): boolean =>
  hasPermission(user, 'resources.delete');

// Composite checks
export const canViewUser = (currentUser: User | null, targetUserId: string): boolean =>
  !!currentUser && (currentUser.id === targetUserId || canViewUsers(currentUser));

export const canEditUser = canViewUser;

export const canDeleteUser = (user: User | null): boolean => canDeleteUsers(user);
