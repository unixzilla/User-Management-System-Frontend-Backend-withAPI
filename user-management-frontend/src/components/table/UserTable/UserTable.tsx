import React, { useMemo } from 'react';
import { DataTable } from '../DataTable/DataTable';
import { User } from '@/types';
import { getUserTableColumns } from './UserTableColumns';

interface UserTableProps {
  users: User[];
  loading?: boolean;
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (page: number, rowsPerPage: number) => void;
  onRowClick?: (user: User) => void;
  onDelete?: (user: User) => void;
}

export function UserTable({
  users,
  loading = false,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowClick,
  onDelete,
}: UserTableProps) {
  const columns = useMemo(() => getUserTableColumns(onDelete), [onDelete]);

  return (
    <DataTable
      columns={columns}
      rows={users}
      loading={loading}
      page={page}
      rowsPerPage={rowsPerPage}
      totalCount={totalCount}
      onPageChange={onPageChange}
      onRowClick={onRowClick}
      getRowId={(user) => user.id}
    />
  );
}
