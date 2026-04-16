import { User } from '@/types';

export const hasRole = (user: User | null, role: string): boolean =>
  !!user?.roles?.includes(role);

export const isAdmin = (user: User | null): boolean => hasRole(user, 'admin');

export const canViewUser = (currentUser: User | null, targetUserId: string): boolean =>
  !!currentUser && (currentUser.id === targetUserId || isAdmin(currentUser));

export const canEditUser = canViewUser;

export const canDeleteUser = (user: User | null): boolean => isAdmin(user);

export const canManageRoles = (user: User | null): boolean => isAdmin(user);
