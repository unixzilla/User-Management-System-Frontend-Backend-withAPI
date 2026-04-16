import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const userCreateSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(100, 'Username too long'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().optional(),
});

export const userUpdateSchema = z.object({
  email: z.string().email('Invalid email address').optional().nullable(),
  username: z.string().min(3).max(100).optional().nullable(),
  full_name: z.string().optional().nullable(),
  password: z.string().min(8).optional().or(z.literal('')), // Allow empty string for "no change"
  is_active: z.boolean().optional(),
  is_verified: z.boolean().optional(),
});

export const roleCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  description: z.string().max(255, 'Description too long').optional().nullable(),
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type UserCreateSchema = z.infer<typeof userCreateSchema>;
export type UserUpdateSchema = z.infer<typeof userUpdateSchema>;
export type RoleCreateSchema = z.infer<typeof roleCreateSchema>;
