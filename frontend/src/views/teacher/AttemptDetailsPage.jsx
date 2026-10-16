import React from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import { useGetAdminAttemptDetailsQuery } from '../../slices/proctoringApiSlice';
import axiosInstance from '../../axios';

export default function AttemptDetailsPage() {
  const { sessionId } = useParams();
  const { data, isLoading, error, refetch } = useGetAdminAttemptDetailsQuery(sessionId);
  const [preview, setPreview] = React.useState(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [reviewingId, setReviewingId] = React.useState('');
  const [reviewError, setReviewError] = React.useState('');
  const [reviewMessage, setReviewMessage] = React.useState('');
  if (isLoading) return <Box p={5} textAlign="center"><CircularProgress /></Box>;
  if (error) return <Alert severity="error">Failed to load attempt: {error?.data?.message || 'Unknown error'}</Alert>;
  const attempt = data?.attempt;
  const openEvidence = async (event) => {
    setPreviewLoading(true);
    try {
      const response = await axiosInstance.get(`/api/proctoring/evidence/${event.eventId}`, { responseType: 'blob', withCredentials: true });
      setPreview({ url: URL.createObjectURL(response.data), event });
    } catch (previewError) {
      setPreview({ error: previewError?.response?.data?.message || 'Evidence is unavailable.', event });
    } finally { setPreviewLoading(false); }
  };
  const closeEvidence = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };
  const reviewEvent = async (event, status) => {
    setReviewingId(event.eventId);
    setReviewError('');
    setReviewMessage('');
    try {
      await axiosInstance.patch(`/api/proctoring/events/${event.eventId}/review`, {
        status,
        reason: status === 'VIOLATION_CONFIRMED' ? 'Confirmed by reviewer after reviewing the recorded evidence.' : 'Reviewed; insufficient evidence to confirm a violation.',
      }, { withCredentials: true });
      setReviewMessage('Review decision saved.');
      await refetch();
    } catch (failure) {
      setReviewError(failure?.response?.data?.message || 'Unable to save review decision.');
    } finally { setReviewingId(''); }
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
          {attempt?.terminationReason && <Typography mt={1}>Termination reason: {attempt.terminationReason}</Typography>}
          <Typography mt={2}>Score: {attempt?.result ? `${attempt.result.totalMarks} (${Math.round(attempt.result.percentage)}%)` : 'Not available'}</Typography>
          <Typography>Classification: {attempt?.classification || 'PENDING'}</Typography>
        </DashboardCard></Grid>
        <Grid item xs={12} md={7}><DashboardCard title={`Monitoring signals (${attempt?.violations?.length || 0})`}>
          {reviewError && <Alert severity="error" sx={{ mb: 1 }}>{reviewError}</Alert>}
          {reviewMessage && <Alert severity="success" sx={{ mb: 1 }}>{reviewMessage}</Alert>}
          <Table component={Paper} size="small"><TableHead><TableRow><TableCell>Type</TableCell><TableCell>Decision</TableCell><TableCell>Reason</TableCell><TableCell>Confidence</TableCell><TableCell>Camera</TableCell><TableCell>Time</TableCell><TableCell>Evidence / Review</TableCell></TableRow></TableHead><TableBody>
            {(attempt?.violations || []).map((event) => {
              const decision = event.decisionStatus || (event.penaltyPoints > 0 ? 'VIOLATION_CONFIRMED' : 'WARNING');
              const color = decision === 'VIOLATION_CONFIRMED' ? 'error' : decision === 'REVIEW_REQUIRED' ? 'warning' : 'default';
              return <TableRow key={event._id}>
                <TableCell>{event.eventType}</TableCell><TableCell><Chip size="small" label={decision} color={color} /></TableCell>
                <TableCell>{event.decisionReason || event.description || 'Legacy event; no reviewer decision stored.'}</TableCell>
                <TableCell>{event.confidence != null ? `${Math.round(event.confidence * 100)}%` : '—'}</TableCell>
                <TableCell>{event.metadata?.cameraSource || '—'}</TableCell>
                <TableCell>{event.timestamp ? new Date(event.timestamp).toLocaleString() : '—'}</TableCell>
                <TableCell>
                  {event.evidenceStatus === 'UPLOADED' && event.evidencePath && <Button size="small" onClick={() => openEvidence(event)} disabled={previewLoading}>View Evidence</Button>}
                  {['REVIEW_REQUIRED', 'WARNING'].includes(decision) && <Box display="flex" gap={0.5}><Button size="small" disabled={Boolean(reviewingId)} onClick={() => reviewEvent(event, 'SAFE')}>Mark safe</Button><Button size="small" color="error" disabled={Boolean(reviewingId)} onClick={() => reviewEvent(event, 'VIOLATION_CONFIRMED')}>Confirm</Button></Box>}
                  {!event.evidencePath && !['REVIEW_REQUIRED', 'WARNING'].includes(decision) && (event.evidenceStatus || 'NOT_APPLICABLE')}
                </TableCell>
              </TableRow>;
            })}
            {!attempt?.violations?.length && <TableRow><TableCell colSpan={7} align="center">No proctoring signals recorded.</TableCell></TableRow>}
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
