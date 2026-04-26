export interface Permission {
  id: number;
  name: string;
  description: string | null;
  resource: string;
  action: string;
}

export interface PermissionCreate {
  name: string;
  description?: string | null;
  resource: string;
  action: string;
}

export interface PermissionUpdate {
  name?: string;
  description?: string | null;
  resource?: string;
  action?: string;
}

export interface RolePermissionsUpdate {
  permission_ids: number[];
}
