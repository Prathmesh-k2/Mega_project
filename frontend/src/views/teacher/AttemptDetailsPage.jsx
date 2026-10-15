import React from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import { useGetAdminAttemptDetailsQuery } from '../../slices/proctoringApiSlice';
import axiosInstance from '../../axios';

export default function AttemptDetailsPage() {
  const { sessionId } = useParams();
  const { data, isLoading, error } = useGetAdminAttemptDetailsQuery(sessionId);
  const [preview, setPreview] = React.useState(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  if (isLoading) return <Box p={5} textAlign="center"><CircularProgress /></Box>;
  if (error) return <Alert severity="error">Failed to load attempt: {error?.data?.message || 'Unknown error'}</Alert>;
  const attempt = data?.attempt;
  const openEvidence = async (event) => {
    setPreviewLoading(true);
    try {
      const response = await axiosInstance.get(`/api/proctoring/evidence/${event.eventId}`, {
        responseType: 'blob',
        withCredentials: true,
      });
      const url = URL.createObjectURL(response.data);
      setPreview({ url, event });
    } catch (previewError) {
      setPreview({ error: previewError?.response?.data?.message || 'Evidence is unavailable.', event });
    } finally {
      setPreviewLoading(false);
    }
  };
  const closeEvidence = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };
  return (
    <PageContainer title="Attempt details" description="Exam attempt and proctoring evidence">
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}><DashboardCard title="Attempt">
          <Typography variant="h6">{attempt?.exam?.examName || attempt?.examId}</Typography>
          <Typography>Student: {attempt?.studentId?.name} ({attempt?.studentId?.email})</Typography>
          <Typography>Started: {attempt?.startTime ? new Date(attempt.startTime).toLocaleString() : '—'}</Typography>
          <Typography>Ended: {attempt?.endTime ? new Date(attempt.endTime).toLocaleString() : '—'}</Typography>
          <Box mt={2}><Chip label={attempt?.status} color={attempt?.status === 'TERMINATED' ? 'error' : attempt?.status === 'ACTIVE' ? 'success' : 'default'} /></Box>
          <Typography mt={2}>Score: {attempt?.result ? `${attempt.result.totalMarks} (${Math.round(attempt.result.percentage)}%)` : 'Not available'}</Typography>
          <Typography>Classification: {attempt?.classification || 'PENDING'}</Typography>
        </DashboardCard></Grid>
        <Grid item xs={12} md={7}><DashboardCard title={`Proctoring events (${attempt?.violations?.length || 0})`}>
          <Table component={Paper} size="small"><TableHead><TableRow><TableCell>Type</TableCell><TableCell>Severity</TableCell><TableCell>Confidence</TableCell><TableCell>Camera</TableCell><TableCell>Time</TableCell><TableCell>Evidence</TableCell></TableRow></TableHead><TableBody>
            {(attempt?.violations || []).map((event) => <TableRow key={event._id}><TableCell>{event.eventType}</TableCell><TableCell>{event.severity}</TableCell><TableCell>{event.confidence != null ? `${Math.round(event.confidence * 100)}%` : '—'}</TableCell><TableCell>{event.metadata?.cameraSource || '—'}</TableCell><TableCell>{event.timestamp ? new Date(event.timestamp).toLocaleString() : '—'}</TableCell><TableCell>
              {event.evidenceStatus === 'UPLOADED' && event.evidencePath ? <Button size="small" onClick={() => openEvidence(event)} disabled={previewLoading}>View Evidence</Button> : (event.evidenceStatus || 'NOT_APPLICABLE')}
            </TableCell></TableRow>)}
            {!attempt?.violations?.length && <TableRow><TableCell colSpan={6} align="center">No proctoring events recorded.</TableCell></TableRow>}
          </TableBody></Table>
        </DashboardCard></Grid>
      </Grid>
      <Dialog open={Boolean(preview)} onClose={closeEvidence} maxWidth="md">
        <DialogTitle>{preview?.event?.eventType} — {preview?.event?.timestamp ? new Date(preview.event.timestamp).toLocaleString() : ''}</DialogTitle>
        <DialogContent>
          {preview?.url ? <img src={preview.url} alt={`Evidence for ${preview.event.eventType}`} style={{ maxWidth: '100%', display: 'block' }} /> : preview?.error || 'Loading evidence...'}
          {preview?.event?.metadata?.cameraSource && <Typography variant="caption">Camera: {preview.event.metadata.cameraSource}</Typography>}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
