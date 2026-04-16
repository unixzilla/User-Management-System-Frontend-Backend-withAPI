import { User } from './user.types';

export interface Role {
  id: number;
  name: string;
  description: string | null;
  users?: User[]; // Optional: populated when we need users in this role
}

export interface RoleCreate {
  name: string;
  description?: string | null;
}

export interface RoleUpdate {
  name?: string;
  description?: string | null;
}
