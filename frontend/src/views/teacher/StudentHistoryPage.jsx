import React from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import { useGetAdminStudentHistoryQuery } from '../../slices/proctoringApiSlice';

export default function StudentHistoryPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetAdminStudentHistoryQuery(studentId);
  if (isLoading) return <Box p={5} textAlign="center"><CircularProgress /></Box>;
  if (error) return <Alert severity="error">Failed to load student history: {error?.data?.message || 'Unknown error'}</Alert>;
  const student = data?.student;
  return (
    <PageContainer title="Student history" description="Student profile and exam attempts">
      <DashboardCard title={student?.name || 'Student'}>
        <Typography>{student?.email}</Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>Account: {student?.isApproved ? 'Approved' : 'Pending'}</Typography>
        <Table component={Paper} size="small">
          <TableHead><TableRow><TableCell>Exam</TableCell><TableCell>Attempt</TableCell><TableCell>Started</TableCell><TableCell>Submitted</TableCell><TableCell>Status</TableCell><TableCell>Score</TableCell><TableCell>Events</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {(data?.attempts || []).map((attempt) => (
              <TableRow key={attempt._id}>
                <TableCell>{attempt.exam?.examName || attempt.examId}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{String(attempt._id).slice(-8)}</TableCell>
                <TableCell>{attempt.startTime ? new Date(attempt.startTime).toLocaleString() : '—'}</TableCell>
                <TableCell>{attempt.endTime ? new Date(attempt.endTime).toLocaleString() : '—'}</TableCell>
                <TableCell><Chip size="small" label={attempt.status} color={attempt.status === 'ACTIVE' ? 'success' : attempt.status === 'TERMINATED' ? 'error' : 'default'} /></TableCell>
                <TableCell>{attempt.result ? `${attempt.result.totalMarks} (${Math.round(attempt.result.percentage)}%)` : 'Not available'}</TableCell>
                <TableCell>{attempt.proctoring?.count || 0}</TableCell>
                <TableCell><Button size="small" onClick={() => navigate(`/admin/attempts/${attempt._id}`)}>Details</Button></TableCell>
              </TableRow>
            ))}
            {!data?.attempts?.length && <TableRow><TableCell colSpan={8} align="center">No exam attempts recorded.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </DashboardCard>
    </PageContainer>
  );
}
