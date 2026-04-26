export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  roles: string[];
}

export interface UserCreate {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface UserUpdate {
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
  password?: string;
  is_active?: boolean;
  is_verified?: boolean;
}

export interface UserListParams {
  skip?: number;
  limit?: number;
  active_only?: boolean;
  search?: string;
}

export interface PaginatedUserResponse {
  items: User[];
  total: number;
  skip: number;
  limit: number;
}
