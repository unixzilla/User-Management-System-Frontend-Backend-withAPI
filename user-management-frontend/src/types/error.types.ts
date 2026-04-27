export interface ErrorLog {
  _id: string;
  request_id: string;
  timestamp: string;
  method: string;
  path: string;
  status_code: number;
  detail: string;
  exception_type: string | null;
  exception_message: string | null;
  traceback: string | null;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface PaginatedErrorResponse {
  items: ErrorLog[];
  total: number;
  skip: number;
  limit: number;
}
