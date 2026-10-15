import React from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, MenuItem, Pagination, Paper,
  Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import { useGetAdminStudentsQuery } from '../../slices/proctoringApiSlice';

export default function StudentManagementPage() {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [submittedSearch, setSubmittedSearch] = React.useState('');
  const { data, isLoading, isFetching, error } = useGetAdminStudentsQuery({
    page, search: submittedSearch, status,
  });

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSubmittedSearch(search.trim());
  };

  return (
    <PageContainer title="Students" description="Manage student exam attempts">
      <DashboardCard title="Students">
        <Box component="form" onSubmit={submitSearch} display="flex" gap={2} mb={3} flexWrap="wrap">
          <TextField size="small" label="Search name or email" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Select size="small" displayEmpty value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
            <MenuItem value="">All statuses</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
          </Select>
          <Button type="submit" variant="contained">Search</Button>
        </Box>
        {error && <Alert severity="error">Failed to load students: {error?.data?.message || 'Unknown error'}</Alert>}
        {isLoading || isFetching ? <CircularProgress /> : (
          <>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Email</TableCell><TableCell>Status</TableCell><TableCell>Attempts</TableCell><TableCell>Completed</TableCell><TableCell>Latest activity</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {(data?.students || []).map((student) => (
                    <TableRow key={student._id} hover>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell><Chip size="small" label={student.status} color={student.status === 'approved' ? 'success' : 'warning'} /></TableCell>
                      <TableCell>{student.totalAttempts}</TableCell>
                      <TableCell>{student.completedAttempts}</TableCell>
                      <TableCell>{student.latestActivity ? new Date(student.latestActivity).toLocaleString() : '—'}</TableCell>
                      <TableCell><Button size="small" onClick={() => navigate(`/admin/students/${student._id}`)}>View</Button></TableCell>
                    </TableRow>
                  ))}
                  {!data?.students?.length && <TableRow><TableCell colSpan={7} align="center"><Typography py={3}>No students found.</Typography></TableCell></TableRow>}
                </TableBody>
              </Table>
            </TableContainer>
            {data?.pagination?.pages > 1 && <Pagination sx={{ mt: 2 }} page={page} count={data.pagination.pages} onChange={(_, value) => setPage(value)} />}
          </>
        )}
      </DashboardCard>
    </PageContainer>
  );
}
