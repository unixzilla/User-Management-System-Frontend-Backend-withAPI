export interface Resource {
  id: number;
  name: string;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ResourceCreate {
  name: string;
  description?: string | null;
}

export interface ResourceUpdate {
  name?: string;
  description?: string | null;
}
