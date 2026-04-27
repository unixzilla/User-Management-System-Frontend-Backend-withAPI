import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  CircularProgress,
  Box,
} from '@mui/material';

export interface ColumnDef<T> {
  id: keyof T | string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'right' | 'center';
  format?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  loading?: boolean;
  page: number;
  rowsPerPage: number;
  totalCount?: number;
  onPageChange: (page: number, rowsPerPage: number) => void;
  onRowClick?: (row: T) => void;
  getRowId: (row: T) => string | number;
}

export function DataTable<T>({
  columns,
  rows,
  loading = false,
  page,
  rowsPerPage,
  totalCount = rows.length,
  onPageChange,
  onRowClick,
  getRowId,
}: DataTableProps<T>) {
  const handleChangePage = (_: unknown, newPage: number) => {
    onPageChange(newPage, rowsPerPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    onPageChange(0, parseInt(event.target.value, 10));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id as string}
                  align={column.align || 'left'}
                  sx={{ minWidth: column.minWidth }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const id = getRowId(row);
              return (
                <TableRow
                  key={id}
                  hover={!!onRowClick}
                  onClick={() => onRowClick?.(row)}
                  sx={{ cursor: onRowClick ? 'pointer' : 'inherit' }}
                >
                  {columns.map((column) => {
                    let value: unknown;
                    if (typeof column.id === 'string' && column.id.includes('.')) {
                      value = (row as Record<string, unknown>)[column.id];
                    } else {
                      value = (row as Record<string, unknown>)[column.id as string];
                    }
                    return (
                      <TableCell key={column.id as string} align={column.align || 'left'}>
                        {column.format ? column.format(value, row) : (value as React.ReactNode)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}
