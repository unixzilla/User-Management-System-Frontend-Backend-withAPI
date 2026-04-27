import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  Collapse,
  IconButton,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useGetErrorsQuery } from '@/api';
import { ErrorLog } from '@/types';
import { formatDateTime } from '@/utils/format';
import { canViewErrors } from '@/utils/permissions';
import { useAppSelector } from '@/hooks.redux';

function ErrorRow({ error }: { error: ErrorLog }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow hover sx={{ cursor: 'pointer', '& > *': { borderBottom: 'unset' } }}>
        <TableCell padding="checkbox">
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{formatDateTime(error.timestamp)}</TableCell>
        <TableCell>
          <Chip label={error.method} size="small" variant="outlined" />
        </TableCell>
        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{error.path}</TableCell>
        <TableCell>
          <Chip label={error.status_code} size="small" color="error" />
        </TableCell>
        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
          {error.request_id.substring(0, 8)}...
        </TableCell>
        <TableCell>{error.exception_type || '-'}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell sx={{ py: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 3, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>Detail</Typography>
              <Typography variant="body2">{error.detail}</Typography>

              {error.exception_message && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>Exception</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {error.exception_type}: {error.exception_message}
                  </Typography>
                </Box>
              )}

              {error.traceback && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>Traceback</Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 300, overflow: 'auto', bgcolor: 'grey.100' }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                      {error.traceback}
                    </Typography>
                  </Paper>
                </Box>
              )}

              <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Request ID: {error.request_id}
                </Typography>
                {error.ip_address && (
                  <Typography variant="caption" color="text.secondary">
                    IP: {error.ip_address}
                  </Typography>
                )}
                {error.user_id && (
                  <Typography variant="caption" color="text.secondary">
                    User: {error.user_id}
                  </Typography>
                )}
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export function ErrorLogsPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const { user } = useAppSelector((state) => state.auth);

  const { data, isLoading, isError, refetch } = useGetErrorsQuery({
    skip: page * rowsPerPage,
    limit: rowsPerPage,
    ...(search ? { search } : {}),
  });

  const hasAccess = canViewErrors(user);

  if (!hasAccess) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>
          Access denied: you need the <strong>errors.read</strong> permission to view error logs.
        </Alert>
      </Container>
    );
  }

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Error Logs</Typography>
        <IconButton onClick={() => refetch()} title="Refresh">
          <RefreshIcon />
        </IconButton>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          placeholder="Search by request ID, path, exception type..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start"><SearchIcon /></InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 400 }}
        />
        <IconButton onClick={handleSearch}><SearchIcon /></IconButton>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Alert severity="error">Failed to load error logs.</Alert>
      ) : (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Path</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Request ID</TableCell>
                  <TableCell>Exception</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No errors logged yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  (data?.items ?? []).map((error) => (
                    <ErrorRow key={error._id} error={error} />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data?.total ?? 0}
            page={page}
            onPageChange={(_e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Paper>
      )}
    </Container>
  );
}
