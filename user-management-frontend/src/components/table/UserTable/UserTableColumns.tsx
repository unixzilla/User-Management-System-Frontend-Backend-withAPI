import { ColumnDef } from '../DataTable/DataTable';
import { User } from '@/types';
import { RoleBadge } from '@/components/shared/RoleBadge/RoleBadge';
import { formatDate } from '@/utils/format';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';

export function getUserTableColumns(onDelete?: (user: User) => void): ColumnDef<User>[] {
  const columns: ColumnDef<User>[] = [
    {
      id: 'username',
      label: 'Username',
      minWidth: 120,
      format: (value: unknown) => value as string,
    },
    {
      id: 'email',
      label: 'Email',
      minWidth: 180,
      format: (value: unknown) => value as string,
    },
    {
      id: 'full_name',
      label: 'Full Name',
      minWidth: 140,
      format: (value: unknown) => (value as string) || '-',
    },
    {
      id: 'is_active',
      label: 'Active',
      minWidth: 80,
      align: 'center',
      format: (value: unknown) =>
        value ? (
          <CheckIcon color="success" fontSize="small" />
        ) : (
          <CloseIcon color="error" fontSize="small" />
        ),
    },
    {
      id: 'roles',
      label: 'Roles',
      minWidth: 200,
      format: (value: unknown) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {(value as string[]).map((role) => (
            <RoleBadge key={role} role={role} />
          ))}
        </Box>
      ),
    },
    {
      id: 'created_at',
      label: 'Created',
      minWidth: 110,
      format: (value: unknown) => formatDate(value as string),
    },
  ];

  if (onDelete) {
    columns.push({
      id: 'actions' as keyof User,
      label: 'Actions',
      minWidth: 80,
      align: 'right',
      format: (_value: unknown, row: User) => (
        <IconButton
          color="error"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(row);
          }}
        >
          <DeleteIcon />
        </IconButton>
      ),
    });
  }

  return columns;
}
