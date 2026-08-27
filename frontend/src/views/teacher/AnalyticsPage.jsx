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
  LinearProgress,
} from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import { useGetAnalyticsQuery } from '../../slices/proctoringApiSlice';

const severityColors = {
  LOW: '#4caf50',
  MEDIUM: '#ff9800',
  HIGH: '#f44336',
  CRITICAL: '#9c27b0',
};

const AnalyticsPage = () => {
  const { data, isLoading, error } = useGetAnalyticsQuery();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">Failed to load analytics: {error?.data?.message || 'Unknown'}</Alert>
    );
  }

  const {
    violationsByType = [],
    violationsBySeverity = [],
    classificationDist = [],
    scoresByExam = [],
    violationsTimeline = [],
    confidenceByType = [],
    topViolators = [],
  } = data || {};

  const totalViolations = violationsByType.reduce((sum, v) => sum + v.count, 0);

  return (
    <PageContainer title="Analytics" description="AI_Evalu8 Proctoring Analytics">
      <Box>
        <Typography variant="h4" mb={3} fontWeight="bold">
          📈 Proctoring Analytics
        </Typography>

        {/* Violations by Type */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={6}>
            <DashboardCard title="Violations by Type">
              {violationsByType.length === 0 ? (
                <Typography color="textSecondary" p={2}>
                  No violations recorded yet
                </Typography>
              ) : (
                <Box p={2}>
                  {violationsByType.map((v) => {
                    const pct = totalViolations > 0 ? (v.count / totalViolations) * 100 : 0;
                    return (
                      <Box key={v._id} mb={2}>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" fontWeight="500">
                            {v._id?.replace(/_/g, ' ')}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {v.count} ({pct.toFixed(1)}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{ height: 8, borderRadius: 4 }}
                          color={pct > 30 ? 'error' : pct > 15 ? 'warning' : 'primary'}
                        />
                      </Box>
                    );
                  })}
                </Box>
              )}
            </DashboardCard>
          </Grid>

          {/* Violations by Severity */}
          <Grid item xs={12} md={6}>
            <DashboardCard title="Violations by Severity">
              <Grid container spacing={2} p={2}>
                {violationsBySeverity.map((v) => (
                  <Grid item xs={6} key={v._id}>
                    <Card
                      sx={{
                        bgcolor: `${severityColors[v._id]}15`,
                        borderLeft: `4px solid ${severityColors[v._id]}`,
                      }}
                    >
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary">
                          {v._id}
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {v.count}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {violationsBySeverity.length === 0 && (
                  <Grid item xs={12}>
                    <Typography color="textSecondary">No data</Typography>
                  </Grid>
                )}
              </Grid>
            </DashboardCard>
          </Grid>
        </Grid>

        {/* Classification & Exam Scores */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={4}>
            <DashboardCard title="Session Classification">
              <Box p={2}>
                {classificationDist.map((c) => (
                  <Box
                    key={c._id}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={1.5}
                  >
                    <Chip
                      label={c._id}
                      color={
                        c._id === 'SAFE' ? 'success' : c._id === 'WARNING' ? 'warning' : 'error'
                      }
                      size="small"
                    />
                    <Typography variant="h5" fontWeight="bold">
                      {c.count}
                    </Typography>
                  </Box>
                ))}
                {classificationDist.length === 0 && (
                  <Typography color="textSecondary">No classified sessions yet</Typography>
                )}
              </Box>
            </DashboardCard>
          </Grid>

          <Grid item xs={12} md={8}>
            <DashboardCard title="Scores by Exam">
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Exam</TableCell>
                      <TableCell>Sessions</TableCell>
                      <TableCell>Avg Fairness</TableCell>
                      <TableCell>Total Violations</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scoresByExam.map((e) => (
                      <TableRow key={e._id} hover>
                        <TableCell>{e.examName}</TableCell>
                        <TableCell>{e.totalSessions}</TableCell>
                        <TableCell>
                          <Chip
                            label={`${Math.round(e.avgFairness || 0)}/100`}
                            color={e.avgFairness >= 70 ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{e.totalViolations}</TableCell>
                      </TableRow>
                    ))}
                    {scoresByExam.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No exam data
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </DashboardCard>
          </Grid>
        </Grid>

        {/* Confidence Stats & Top Violators */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={6}>
            <DashboardCard title="Detection Confidence by Type">
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Event Type</TableCell>
                      <TableCell>Count</TableCell>
                      <TableCell>Avg Confidence</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {confidenceByType.map((c) => (
                      <TableRow key={c._id} hover>
                        <TableCell sx={{ fontSize: '0.8rem' }}>
                          {c._id?.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>{c.count}</TableCell>
                        <TableCell>{((c.avgConfidence || 0) * 100).toFixed(0)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DashboardCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <DashboardCard title="Students with Most Violations">
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Student</TableCell>
                      <TableCell>Violations</TableCell>
                      <TableCell>Sessions</TableCell>
                      <TableCell>Avg Fairness</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topViolators.map((v) => (
                      <TableRow key={v._id} hover>
                        <TableCell>{v.student?.name || 'Unknown'}</TableCell>
                        <TableCell>
                          <Chip label={v.totalViolations} color="error" size="small" />
                        </TableCell>
                        <TableCell>{v.sessionsCount}</TableCell>
                        <TableCell>{Math.round(v.avgFairness || 0)}/100</TableCell>
                      </TableRow>
                    ))}
                    {topViolators.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No data
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </DashboardCard>
          </Grid>
        </Grid>

        {/* Violations Timeline */}
        <DashboardCard title="Violations Timeline (Last 30 Days)">
          {violationsTimeline.length === 0 ? (
            <Typography color="textSecondary" p={2}>
              No violation data in the last 30 days
            </Typography>
          ) : (
            <Box p={2}>
              <Box display="flex" alignItems="flex-end" gap={0.5} height={120}>
                {violationsTimeline.map((day) => {
                  const maxCount = Math.max(...violationsTimeline.map((d) => d.count), 1);
                  const heightPct = (day.count / maxCount) * 100;
                  return (
                    <Box
                      key={day._id}
                      sx={{
                        flex: 1,
                        maxWidth: 20,
                        bgcolor: day.count > 10 ? 'error.main' : day.count > 5 ? 'warning.main' : 'primary.main',
                        height: `${heightPct}%`,
                        minHeight: 4,
                        borderRadius: '4px 4px 0 0',
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.8 },
                      }}
                      title={`${day._id}: ${day.count} violations`}
                    />
                  );
                })}
              </Box>
              <Typography variant="caption" color="textSecondary" mt={1}>
                Hover over bars to see details
              </Typography>
            </Box>
          )}
        </DashboardCard>
      </Box>
    </PageContainer>
  );
};

export default AnalyticsPage;
