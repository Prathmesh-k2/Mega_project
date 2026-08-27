import React from 'react';
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
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as ExamIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  CheckCircle as SafeIcon,
  Error as DangerIcon,
  TrendingUp as TrendIcon,
  Visibility as ActiveIcon,
} from '@mui/icons-material';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import { useGetDashboardStatsQuery } from '../../slices/proctoringApiSlice';

const StatCard = ({ title, value, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h3" fontWeight="bold">
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            bgcolor: `${color}.light`,
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const getClassificationChip = (classification) => {
  const map = {
    SAFE: { color: 'success', icon: <SafeIcon fontSize="small" /> },
    WARNING: { color: 'warning', icon: <WarningIcon fontSize="small" /> },
    MALPRACTICE: { color: 'error', icon: <DangerIcon fontSize="small" /> },
    PENDING: { color: 'default', icon: null },
  };
  const config = map[classification] || map.PENDING;
  return (
    <Chip
      icon={config.icon}
      label={classification}
      color={config.color}
      size="small"
      variant="outlined"
    />
  );
};

const AdminDashboard = () => {
  const { data, isLoading, error } = useGetDashboardStatsQuery(undefined, {
    pollingInterval: 30000,
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">Failed to load dashboard: {error?.data?.message || 'Unknown error'}</Alert>
    );
  }

  const stats = data?.stats || {};
  const recentSessions = data?.recentSessions || [];

  return (
    <PageContainer title="Admin Dashboard" description="AI_Evalu8 Admin Dashboard">
      <Box>
        <Typography variant="h4" mb={3} fontWeight="bold">
          📊 Admin Dashboard
        </Typography>

        {/* Stats Cards */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Students"
              value={stats.totalStudents || 0}
              icon={<PeopleIcon sx={{ color: 'primary.main' }} />}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Exams"
              value={stats.totalExams || 0}
              icon={<ExamIcon sx={{ color: 'info.main' }} />}
              color="info"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Active Sessions"
              value={stats.activeSessions || 0}
              icon={<ActiveIcon sx={{ color: 'success.main' }} />}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Avg Fairness Score"
              value={stats.avgFairnessScore || 100}
              icon={<SecurityIcon sx={{ color: 'warning.main' }} />}
              color="warning"
            />
          </Grid>
        </Grid>

        {/* Classification Distribution */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={4}>
            <Card sx={{ bgcolor: '#e8f5e9' }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  Safe Sessions
                </Typography>
                <Typography variant="h3" color="success.main" fontWeight="bold">
                  {stats.safeSessions || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ bgcolor: '#fff3e0' }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  Warning Sessions
                </Typography>
                <Typography variant="h3" color="warning.main" fontWeight="bold">
                  {stats.warningSessions || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ bgcolor: '#ffebee' }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  Malpractice Cases
                </Typography>
                <Typography variant="h3" color="error.main" fontWeight="bold">
                  {stats.malpracticeSessions || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* More Stats */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={4}>
            <StatCard
              title="Total Sessions"
              value={stats.totalSessions || 0}
              icon={<TrendIcon sx={{ color: 'info.main' }} />}
              color="info"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard
              title="Total Violations"
              value={stats.totalViolations || 0}
              icon={<WarningIcon sx={{ color: 'error.main' }} />}
              color="error"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard
              title="Terminated Sessions"
              value={stats.terminatedSessions || 0}
              icon={<DangerIcon sx={{ color: 'error.main' }} />}
              color="error"
            />
          </Grid>
        </Grid>

        {/* Recent Sessions Table */}
        <DashboardCard title="Recent Exam Sessions">
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Exam ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Fairness</TableCell>
                  <TableCell>Violations</TableCell>
                  <TableCell>Classification</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentSessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No exam sessions yet
                    </TableCell>
                  </TableRow>
                ) : (
                  recentSessions.map((session) => (
                    <TableRow key={session._id} hover>
                      <TableCell>{session.studentId?.name || 'Unknown'}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {session.examId?.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={session.status}
                          color={
                            session.status === 'ACTIVE'
                              ? 'success'
                              : session.status === 'TERMINATED'
                                ? 'error'
                                : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{session.fairnessScore}/100</TableCell>
                      <TableCell>{session.totalViolations}</TableCell>
                      <TableCell>{getClassificationChip(session.classification)}</TableCell>
                      <TableCell>
                        {new Date(session.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DashboardCard>
      </Box>
    </PageContainer>
  );
};

export default AdminDashboard;
