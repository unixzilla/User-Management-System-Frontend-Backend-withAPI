export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Extract a user-facing error message from an RTK Query error.
 *  Handles FastAPI 422 validation errors (detail is an array) and
 *  string details (400/403/404/409). Falls back to defaultMsg. */
export const getErrorMessage = (err: any, defaultMsg: string): string => {
  const detail = err?.data?.detail;
  if (!detail) return defaultMsg;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e: any) => e.msg)
      .filter(Boolean)
      .join('; ');
  }
  return defaultMsg;
};
