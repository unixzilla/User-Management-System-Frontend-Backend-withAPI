import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const passwordField = z.string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/[0-9]/, 'Must contain a digit')
  .regex(/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/, 'Must contain a special character');

export const userCreateSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(100, 'Username too long'),
  password: passwordField,
  full_name: z.string().optional(),
});

export const userUpdateSchema = z.object({
  email: z.string().email('Invalid email address').optional().nullable(),
  username: z.string().min(3).max(100).optional().nullable(),
  full_name: z.string().optional().nullable(),
  password: passwordField.optional().or(z.literal('')),
  is_active: z.boolean().optional(),
});

export const roleCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  description: z.string().max(255, 'Description too long').optional().nullable(),
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type UserCreateSchema = z.infer<typeof userCreateSchema>;
export type UserUpdateSchema = z.infer<typeof userUpdateSchema>;
export type RoleCreateSchema = z.infer<typeof roleCreateSchema>;

export const roleUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long').optional(),
  description: z.string().max(255, 'Description too long').optional().nullable(),
});

export type RoleUpdateSchema = z.infer<typeof roleUpdateSchema>;

export const groupCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  description: z.string().max(255, 'Description too long').optional().nullable(),
});
export type GroupCreateSchema = z.infer<typeof groupCreateSchema>;

export const groupUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(255).optional().nullable(),
});
export type GroupUpdateSchema = z.infer<typeof groupUpdateSchema>;

export const permissionCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  description: z.string().max(255, 'Description too long').optional().nullable(),
  resource: z.string().min(1, 'Resource is required').max(50, 'Resource too long'),
  action: z.string().min(1, 'Action is required').max(50, 'Action too long'),
});
export type PermissionCreateSchema = z.infer<typeof permissionCreateSchema>;

export const permissionUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(255).optional().nullable(),
  resource: z.string().min(1).max(50).optional(),
  action: z.string().min(1).max(50).optional(),
});
export type PermissionUpdateSchema = z.infer<typeof permissionUpdateSchema>;

export const resourceCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  description: z.string().max(255, 'Description too long').optional().nullable(),
});
export type ResourceCreateSchema = z.infer<typeof resourceCreateSchema>;

export const resourceUpdateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(255).optional().nullable(),
});
export type ResourceUpdateSchema = z.infer<typeof resourceUpdateSchema>;

export const profileUpdateSchema = z.object({
  full_name: z.string().optional().nullable(),
  password: passwordField.optional().or(z.literal('')),
  confirmPassword: z.string().optional(),
}).refine(data => !data.password || data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type ProfileUpdateSchema = z.infer<typeof profileUpdateSchema>;
