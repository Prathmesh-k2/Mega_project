import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Code, Visibility, VisibilityOff, Search, CheckCircle } from '@mui/icons-material';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import axiosInstance from '../../axios';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useNavigate } from 'react-router-dom';
import Chart from 'react-apexcharts';

const ResultPage = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedResult, setSelectedResult] = useState(null);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState('all');
  const [exams, setExams] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch all exams first
        const examsResponse = await axiosInstance.get('/api/users/exam', {
          withCredentials: true,
        });
        setExams(examsResponse.data);

        // Fetch results based on user role
        if (userInfo?.role === 'teacher') {
          // For teachers, fetch all results
          const resultsResponse = await axiosInstance.get('/api/users/results/all', {
            withCredentials: true,
          });
          setResults(resultsResponse.data.data);
        } else {
          // For students, fetch only their visible results
          const resultsResponse = await axiosInstance.get('/api/users/results/user', {
            withCredentials: true,
          });
          setResults(resultsResponse.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch data');
        toast.error('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userInfo]);

  const handleToggleVisibility = async (resultId) => {
    try {
      await axiosInstance.put(
        `/api/users/results/${resultId}/toggle-visibility`,
        {},
        {
          withCredentials: true,
        },
      );
      toast.success('Visibility updated successfully');
      // Refresh results
      const response = await axiosInstance.get('/api/users/results/all', {
        withCredentials: true,
      });
      setResults(response.data.data);
    } catch (err) {
      toast.error('Failed to update visibility');
    }
  };

  const handleViewCode = (result) => {
    setSelectedResult(result);
    setCodeDialogOpen(true);
  };

  const handleExamChange = (examId) => {
    setSelectedExam(examId);
  };

  const getExam = (examId) =>
    exams.find((exam) => exam.examId === examId || exam._id === examId);
  const getExamName = (examId) => getExam(examId)?.examName || examId || 'Unknown exam';

  const filteredResults = results.filter((result) => {
    const matchesSearch =
      result.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesExam = selectedExam === 'all' || result.examId === selectedExam;
    return matchesSearch && matchesExam;
  });

  const groupedResults = filteredResults.reduce((groups, result) => {
    const key = result.examId || 'unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(result);
    return groups;
  }, {});

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Student View
  if (userInfo?.role === 'student') {
    const sortedResults = [...results].sort((a,b) => b.percentage - a.percentage);
    const highestExam = sortedResults.length > 0 ? sortedResults[0] : null;
    const weakestExam = sortedResults.length > 0 ? sortedResults[sortedResults.length - 1] : null;

    const chartOptions = {
      chart: { type: 'bar', toolbar: { show: false } },
      xaxis: { categories: results.map(r => getExamName(r.examId)) },
      colors: ['#5D87FF'],
      plotOptions: { bar: { borderRadius: 4, dataLabels: { position: 'top' } } },
      dataLabels: { enabled: true, formatter: val => val + '%' },
      yaxis: { max: 100 }
    };
    const chartSeries = [{ name: 'Score', data: results.map(r => Number(r.percentage.toFixed(1))) }];

    return (
      <PageContainer title="My Exam Results" description="View your exam results">
        <Grid container spacing={3}>
          {/* Summary Cards */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Total Exams Taken</Typography>
                <Typography variant="h3">{results.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: 'success.light', color: 'success.dark' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Highest Score (Strong Concept)</Typography>
                <Typography variant="h4">{highestExam ? getExamName(highestExam.examId) : 'N/A'}</Typography>
                <Typography variant="subtitle1">{highestExam ? `${highestExam.percentage.toFixed(1)}%` : ''}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: 'error.light', color: 'error.dark' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Lowest Score (Weak Concept)</Typography>
                <Typography variant="h4">{weakestExam ? getExamName(weakestExam.examId) : 'N/A'}</Typography>
                <Typography variant="subtitle1">{weakestExam ? `${weakestExam.percentage.toFixed(1)}%` : ''}</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Graphical Analysis */}
          <Grid item xs={12}>
            <DashboardCard title="Performance Analytics">
               {results.length > 0 ? (
                  <Chart options={chartOptions} series={chartSeries} type="bar" height={300} />
               ) : (
                  <Typography variant="body1">No tests taken yet.</Typography>
               )}
            </DashboardCard>
          </Grid>

          {/* Results Table */}
          <Grid item xs={12}>
            <DashboardCard title="My Results">
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Exam Name</TableCell>
                      <TableCell>Score</TableCell>
                      <TableCell>Submission Date</TableCell>
                      <TableCell>Proctoring</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result._id}>
                        <TableCell>{getExamName(result.examId)}</TableCell>
                        <TableCell>
                          <Chip
                            label={`${result.percentage.toFixed(1)}%`}
                            color={result.percentage >= 70 ? 'success' : 'warning'}
                          />
                        </TableCell>
                        <TableCell>{new Date(result.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {result.sessionId && (
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="primary"
                              onClick={() => navigate(`/exam/${result.examId}/report/${result.sessionId}`)}
                            >
                              Report
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DashboardCard>
          </Grid>
        </Grid>

        {/* Code View Dialog */}
        <Dialog
          open={codeDialogOpen}
          onClose={() => setCodeDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>My Code Submissions</DialogTitle>
          <DialogContent>
            {selectedResult?.codingSubmissions?.map((submission, index) => (
              <Box key={index} mb={3}>
                <Typography variant="h6" gutterBottom>
                  Question {index + 1}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Language: {submission.language}
                </Typography>
                <SyntaxHighlighter language={submission.language} style={docco}>
                  {submission.code}
                </SyntaxHighlighter>
                <Box mt={1}>
                  <Chip icon={<CheckCircle />} label="Success" color="success" />
                  {submission.executionTime && (
                    <Chip label={`Execution Time: ${submission.executionTime}ms`} sx={{ ml: 1 }} />
                  )}
                </Box>
              </Box>
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCodeDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </PageContainer>
    );
  }

  // Teacher View
  return (
    <PageContainer title="Results Dashboard" description="View and manage exam results">
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Students
              </Typography>
              <Typography variant="h3">{filteredResults.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Average Score
              </Typography>
              <Typography variant="h3">
                {filteredResults.length > 0
                  ? `${(
                      filteredResults.reduce((acc, curr) => acc + curr.percentage, 0) /
                      filteredResults.length
                    ).toFixed(1)}%`
                  : '0%'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Submissions
              </Typography>
              <Typography variant="h3">
                {filteredResults.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Results Table */}
        <Grid item xs={12}>
          <DashboardCard title="Exam Results">
            {/* Exam Filter and Search */}
            <Box mb={3} display="flex" gap={2}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Select Exam</InputLabel>
                <Select
                  value={selectedExam}
                  onChange={(e) => handleExamChange(e.target.value)}
                  label="Select Exam"
                >
                  <MenuItem value="all">All Exams</MenuItem>
                  {exams.map((exam) => (
                    <MenuItem key={exam.examId || exam._id} value={exam.examId || exam._id}>
                      {exam.examName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Search Students"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 200 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {Object.entries(groupedResults).map(([examId, examResults]) => {
              const rankedResults = [...examResults].sort(
                (a, b) => Number(b.percentage || 0) - Number(a.percentage || 0),
              );
              const average = examResults.reduce(
                (sum, result) => sum + Number(result.percentage || 0),
                0,
              ) / examResults.length;

              return (
                <Box key={examId} mb={3}>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    px={2}
                    py={1.5}
                    bgcolor="primary.light"
                  >
                    <Typography variant="h6">{getExamName(examId)}</Typography>
                    <Typography variant="body2">
                      {examResults.length} submitted · Average {average.toFixed(1)}%
                    </Typography>
                  </Box>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Rank</TableCell>
                          <TableCell>Student Name</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Score / Marks</TableCell>
                          <TableCell>Submission Date</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rankedResults.map((result, index) => (
                          <TableRow key={result._id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{result.userId?.name || 'Unknown student'}</TableCell>
                            <TableCell>{result.userId?.email || '—'}</TableCell>
                            <TableCell>
                              <Chip
                                label={`${Number(result.percentage || 0).toFixed(1)}% · ${result.totalMarks || 0} marks`}
                                color={Number(result.percentage || 0) >= 70 ? 'success' : 'warning'}
                              />
                            </TableCell>
                            <TableCell>
                              {result.createdAt ? new Date(result.createdAt).toLocaleString() : '—'}
                            </TableCell>
                            <TableCell>
                              <IconButton
                                onClick={() => handleToggleVisibility(result._id)}
                                color={result.showToStudent ? 'success' : 'default'}
                                title={result.showToStudent ? 'Visible to student' : 'Hidden from student'}
                              >
                                {result.showToStudent ? <Visibility /> : <VisibilityOff />}
                              </IconButton>
                              {result.sessionId && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  sx={{ ml: 1 }}
                                  onClick={() => navigate(`/exam/${result.examId}/report/${result.sessionId}`)}
                                >
                                  Report
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              );
            })}
            {Object.keys(groupedResults).length === 0 && (
              <Alert severity="info">No submitted exam results match the selected filters.</Alert>
            )}
          </DashboardCard>
        </Grid>
      </Grid>

      {/* Code View Dialog */}
      <Dialog
        open={codeDialogOpen}
        onClose={() => setCodeDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Student Code Submissions</DialogTitle>
        <DialogContent>
          {selectedResult?.codingSubmissions?.map((submission, index) => (
            <Box key={index} mb={3}>
              <Typography variant="h6" gutterBottom>
                Question {index + 1}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Language: {submission.language}
              </Typography>
              <SyntaxHighlighter language={submission.language} style={docco}>
                {submission.code}
              </SyntaxHighlighter>
              <Box mt={1}>
                <Chip icon={<CheckCircle />} label="Success" color="success" />
                {submission.executionTime && (
                  <Chip label={`Execution Time: ${submission.executionTime}ms`} sx={{ ml: 1 }} />
                )}
              </Box>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCodeDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default ResultPage;
