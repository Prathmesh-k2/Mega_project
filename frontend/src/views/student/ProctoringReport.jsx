import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  CheckCircle as SafeIcon,
  Warning as WarningIcon,
  Error as DangerIcon,
  Security as SecurityIcon,
  Schedule as TimeIcon,
} from '@mui/icons-material';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import { useGetSessionReportQuery } from '../../slices/proctoringApiSlice';

const ProctoringReport = () => {
  const { sessionId } = useParams();
  const { data, isLoading, error } = useGetSessionReportQuery(sessionId);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load report</Alert>;
  }

  const report = data?.report;
  if (!report) {
    return <Alert severity="info">No report data available</Alert>;
  }

  const {
    student,
    exam,
    session,
    result,
    proctoring,
    violationsByType = {},
    violationsBySeverity = {},
    violations = [],
    evidence = [],
  } = report;

  const classColor =
    proctoring.classification === 'SAFE'
      ? 'success'
      : proctoring.classification === 'WARNING'
        ? 'warning'
        : 'error';

  const classIcon =
    proctoring.classification === 'SAFE' ? (
      <SafeIcon sx={{ fontSize: 48 }} color="success" />
    ) : proctoring.classification === 'WARNING' ? (
      <WarningIcon sx={{ fontSize: 48 }} color="warning" />
    ) : (
      <DangerIcon sx={{ fontSize: 48 }} color="error" />
    );

  return (
    <PageContainer title="Proctoring Report" description="Detailed exam proctoring report">
      <Box>
        <Typography variant="h4" mb={3} fontWeight="bold">
          📋 Proctoring Report
        </Typography>

        {/* Header Card */}
        <Card sx={{ mb: 3, borderLeft: `6px solid`, borderColor: `${classColor}.main` }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item>{classIcon}</Grid>
              <Grid item xs>
                <Typography variant="h5" fontWeight="bold">
                  {student?.name || 'Unknown Student'}
                </Typography>
                <Typography color="textSecondary">{student?.email}</Typography>
                <Typography variant="body2" mt={1}>
                  Exam: <strong>{exam?.name || exam?.examId}</strong>
                </Typography>
              </Grid>
              <Grid item textAlign="right">
                <Chip
                  label={proctoring.classification}
                  color={classColor}
                  sx={{ fontSize: '1rem', fontWeight: 'bold', mb: 1 }}
                />
                <Typography variant="body2" color="textSecondary">
                  {proctoring.decisionReason}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Score Cards */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  Fairness Score
                </Typography>
                <Typography variant="h3" fontWeight="bold" color={`${classColor}.main`}>
                  {proctoring.fairnessScore}/100
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={proctoring.fairnessScore}
                  color={classColor}
                  sx={{ height: 6, borderRadius: 3, mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  Event Score
                </Typography>
                <Typography variant="h3" fontWeight="bold">
                  {proctoring.eventScore}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Based on violation penalties
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  AI Behavior Score
                </Typography>
                <Typography variant="h3" fontWeight="bold">
                  {proctoring.aiScore}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Pattern analysis
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  Total Violations
                </Typography>
                <Typography variant="h3" fontWeight="bold" color="error.main">
                  {proctoring.totalViolations}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Total penalties: {proctoring.totalPenalties} pts
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Session & Result Info */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={6}>
            <DashboardCard title="Session Info">
              <Box p={2}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Status
                    </Typography>
                    <Chip
                      label={session?.status}
                      color={session?.status === 'TERMINATED' ? 'error' : 'success'}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Duration
                    </Typography>
                    <Typography fontWeight="500">
                      {session?.duration ? `${Math.round(session.duration / 60)} min` : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Start Time
                    </Typography>
                    <Typography variant="body2">
                      {session?.startTime ? new Date(session.startTime).toLocaleString() : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      End Time
                    </Typography>
                    <Typography variant="body2">
                      {session?.endTime ? new Date(session.endTime).toLocaleString() : 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </DashboardCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <DashboardCard title="Exam Result">
              <Box p={2}>
                {result ? (
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        MCQ Score
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {result.percentage?.toFixed(1)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Total Marks
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {result.totalMarks}
                      </Typography>
                    </Grid>
                  </Grid>
                ) : (
                  <Typography color="textSecondary">Result not yet calculated</Typography>
                )}
              </Box>
            </DashboardCard>
          </Grid>
        </Grid>

        {/* Violation Breakdown */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={6}>
            <DashboardCard title="Violations by Type">
              {Object.keys(violationsByType).length === 0 ? (
                <Typography p={2} color="textSecondary">
                  No violations
                </Typography>
              ) : (
                <Box p={2}>
                  {Object.entries(violationsByType).map(([type, count]) => (
                    <Box key={type} display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">{type.replace(/_/g, ' ')}</Typography>
                      <Chip label={count} color={count > 3 ? 'error' : 'warning'} size="small" />
                    </Box>
                  ))}
                </Box>
              )}
            </DashboardCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <DashboardCard title="Violations by Severity">
              <Box p={2}>
                {Object.entries(violationsBySeverity).map(([sev, count]) => (
                  <Box key={sev} display="flex" justifyContent="space-between" mb={1}>
                    <Chip
                      label={sev}
                      color={
                        sev === 'HIGH' || sev === 'CRITICAL'
                          ? 'error'
                          : sev === 'MEDIUM'
                            ? 'warning'
                            : 'success'
                      }
                      size="small"
                      variant="outlined"
                    />
                    <Typography fontWeight="bold">{count}</Typography>
                  </Box>
                ))}
              </Box>
            </DashboardCard>
          </Grid>
        </Grid>

        {/* Violation Timeline */}
        <DashboardCard title="Violation Timeline">
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Confidence</TableCell>
                  <TableCell>Penalty</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {violations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No violations recorded — Clean exam ✅
                    </TableCell>
                  </TableRow>
                ) : (
                  violations.map((v, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>
                        {new Date(v.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>{v.eventType?.replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        <Chip
                          label={v.severity}
                          color={
                            v.severity === 'HIGH' || v.severity === 'CRITICAL'
                              ? 'error'
                              : v.severity === 'MEDIUM'
                                ? 'warning'
                                : 'success'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{((v.confidence || 0) * 100).toFixed(0)}%</TableCell>
                      <TableCell>{v.penaltyPoints || 0}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DashboardCard>

        {/* Evidence Gallery */}
        {evidence.length > 0 && (
          <Box mt={3}>
            <DashboardCard title="Evidence Screenshots">
              <Grid container spacing={2} p={2}>
                {evidence.map((e, i) => (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Card>
                      <Box
                        component="img"
                        src={e.url}
                        alt={`Evidence ${i + 1}`}
                        sx={{ width: '100%', height: 200, objectFit: 'cover' }}
                      />
                      <CardContent>
                        <Typography variant="subtitle2">
                          {e.eventType?.replace(/_/g, ' ')}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {new Date(e.timestamp).toLocaleString()}
                        </Typography>
                        <Chip
                          label={e.severity}
                          color={e.severity === 'HIGH' ? 'error' : 'warning'}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </DashboardCard>
          </Box>
        )}
      </Box>
    </PageContainer>
  );
};

export default ProctoringReport;
