import type { User } from './user.types';
import type { Role } from './role.types';

export interface UserGroup {
  id: number;
  name: string;
  description: string | null;
  member_count: number;
  created_at?: string;
  updated_at?: string;
  members?: User[];
  roles?: Role[];
}

export interface UserGroupCreate {
  name: string;
  description?: string | null;
}

export interface UserGroupUpdate {
  name?: string;
  description?: string | null;
}

export interface GroupMemberAdd {
  user_id: string;
}
