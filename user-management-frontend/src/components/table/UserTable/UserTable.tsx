'use client';

import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { User } from '@/types';
import { userTableColumns } from './UserTableColumns';

interface UserTableProps {
  users: User[];
  loading?: boolean;
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (page: number, rowsPerPage: number) => void;
  onRowClick?: (user: User) => void;
}

export function UserTable({
  users,
  loading = false,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowClick,
}: UserTableProps) {
  return (
    <DataTable
      columns={userTableColumns}
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
