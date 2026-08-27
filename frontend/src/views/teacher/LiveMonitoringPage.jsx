import React from 'react';
import {
  Box,
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
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Visibility as ActiveIcon,
  Timer as TimerIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import { useGetActiveMonitoringQuery } from '../../slices/proctoringApiSlice';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const LiveMonitoringPage = () => {
  const { data: sessions, isLoading, error } = useGetActiveMonitoringQuery(undefined, {
    pollingInterval: 5000,
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load monitoring data</Alert>;
  }

  const activeSessions = sessions || [];

  return (
    <PageContainer title="Live Monitoring" description="Monitor active exam sessions in real-time">
      <Box>
        <Typography variant="h4" mb={3} fontWeight="bold">
          🔴 Live Monitoring
        </Typography>

        {/* Summary */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <ActiveIcon color="success" />
                  <Typography variant="h6">
                    {activeSessions.length} Active Session{activeSessions.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <WarningIcon color="warning" />
                  <Typography variant="h6">
                    {activeSessions.filter((s) => s.totalViolations > 0).length} With Violations
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <TimerIcon color="info" />
                  <Typography variant="h6">Auto-refreshing every 5s</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Active Sessions Table */}
        <DashboardCard title="Active Exam Sessions">
          {activeSessions.length === 0 ? (
            <Box py={6} textAlign="center">
              <ActiveIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                No active exam sessions
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Sessions will appear here when students start their exams.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Student</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Exam</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Time Left</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Violations</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Fairness</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Classification</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Last Event</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeSessions.map((session) => (
                    <TableRow
                      key={session._id}
                      hover
                      sx={{
                        bgcolor:
                          session.classification === 'MALPRACTICE'
                            ? '#ffebee'
                            : session.classification === 'WARNING'
                              ? '#fff3e0'
                              : 'inherit',
                      }}
                    >
                      <TableCell>
                        <Typography fontWeight="500">
                          {session.studentId?.name || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {session.studentId?.email}
                        </Typography>
                      </TableCell>
                      <TableCell>{session.examName}</TableCell>
                      <TableCell>
                        <Chip
                          icon={<TimerIcon />}
                          label={formatTime(session.timeLeftSeconds || 0)}
                          color={session.timeLeftSeconds < 300 ? 'error' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={session.totalViolations || 0}
                          color={
                            session.totalViolations > 5
                              ? 'error'
                              : session.totalViolations > 0
                                ? 'warning'
                                : 'success'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          fontWeight="bold"
                          color={
                            session.fairnessScore >= 70
                              ? 'success.main'
                              : session.fairnessScore >= 30
                                ? 'warning.main'
                                : 'error.main'
                          }
                        >
                          {session.fairnessScore}/100
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={session.classification || 'PENDING'}
                          color={
                            session.classification === 'SAFE'
                              ? 'success'
                              : session.classification === 'WARNING'
                                ? 'warning'
                                : session.classification === 'MALPRACTICE'
                                  ? 'error'
                                  : 'default'
                          }
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {session.latestViolation ? (
                          <Box>
                            <Chip
                              label={session.latestViolation.eventType?.replace(/_/g, ' ')}
                              size="small"
                              color={
                                session.latestViolation.severity === 'HIGH' ? 'error' : 'warning'
                              }
                            />
                            <Typography variant="caption" display="block" color="textSecondary">
                              {new Date(session.latestViolation.timestamp).toLocaleTimeString()}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="textSecondary">
                            None
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DashboardCard>
      </Box>
    </PageContainer>
  );
};

export default LiveMonitoringPage;
