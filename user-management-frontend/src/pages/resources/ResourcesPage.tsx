import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useGetResourcesQuery } from '@/api';
import { Resource } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';
import { CreateResourceDialog } from './CreateResourceDialog';
import { EditResourceDialog } from './EditResourceDialog';
import { DeleteResourceDialog } from './DeleteResourceDialog';

export function ResourcesPage() {
  const { canManageResources } = usePermissions();
  const { data: resourcesResponse, isLoading } = useGetResourcesQuery();
  const resources = resourcesResponse?.items ?? [];

  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedResourceForEdit, setSelectedResourceForEdit] = useState<Resource | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  if (!canManageResources()) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h5" color="error">
            You do not have permission to access this page.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Resources</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}>
          Create Resource
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {resources.map((resource) => (
                <TableRow key={resource.id} hover>
                  <TableCell>{resource.id}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{resource.name}</TableCell>
                  <TableCell>{resource.description || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      onClick={() => {
                        setSelectedResourceForEdit(resource);
                        setOpenEdit(true);
                      }}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => {
                        setSelectedResource(resource);
                        setOpenDelete(true);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <CreateResourceDialog open={openCreate} onClose={() => setOpenCreate(false)} />

      {selectedResourceForEdit && (
        <EditResourceDialog
          open={openEdit}
          onClose={() => {
            setOpenEdit(false);
            setSelectedResourceForEdit(null);
          }}
          resource={selectedResourceForEdit}
        />
      )}

      {selectedResource && (
        <DeleteResourceDialog
          open={openDelete}
          resource={selectedResource}
          onClose={() => {
            setOpenDelete(false);
            setSelectedResource(null);
          }}
          onConfirm={() => {
            setOpenDelete(false);
            setSelectedResource(null);
          }}
        />
      )}
    </Container>
  );
}
