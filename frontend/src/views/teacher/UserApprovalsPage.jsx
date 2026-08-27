import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Chip,
  CircularProgress,
  TextField,
  Avatar,
  Stack,
  Alert,
  Tooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import {
  useGetPendingUsersQuery,
  useApproveUserMutation,
  useRejectUserMutation,
} from '../../slices/usersApiSlice';
import { toast } from 'react-toastify';

const UserApprovalsPage = () => {
  const [filter, setFilter] = useState('');

  const {
    data: pendingUsers,
    isLoading,
    error,
    refetch,
  } = useGetPendingUsersQuery(undefined, { pollingInterval: 15000 });

  const [approveUser, { isLoading: approving }] = useApproveUserMutation();
  const [rejectUser, { isLoading: rejecting }] = useRejectUserMutation();

  const handleApprove = async (id, email) => {
    try {
      await approveUser(id).unwrap();
      toast.success(`✅ ${email} has been approved and can now log in.`);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to approve user');
    }
  };

  const handleReject = async (id, email) => {
    try {
      await rejectUser(id).unwrap();
      toast.info(`❌ ${email} registration has been rejected.`);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to reject user');
    }
  };

  const filtered = (pendingUsers || []).filter(
    (u) =>
      u.name?.toLowerCase().includes(filter.toLowerCase()) ||
      u.email?.toLowerCase().includes(filter.toLowerCase()) ||
      u.role?.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <PageContainer title="User Approvals" description="Approve or reject new user registrations">
      <DashboardCard title="User Registration Approvals">
        <Box>
          {/* Info bar */}
          <Alert severity="info" sx={{ mb: 2 }}>
            New users who register on the platform need your approval before they can log in. Review
            their details below and <strong>Approve</strong> or <strong>Reject</strong> each
            request.
          </Alert>

          {/* Filter */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <TextField
              label="Filter by name, email or role"
              variant="outlined"
              fullWidth
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search pending registrations..."
            />
          </Paper>

          {/* Loading */}
          {isLoading && (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          )}

          {/* Error */}
          {error && (
            <Alert severity="error">
              {error?.data?.message || error?.error || 'Failed to load pending users.'}
            </Alert>
          )}

          {/* Empty state */}
          {!isLoading && !error && filtered.length === 0 && (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              py={6}
            >
              <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No pending approval requests
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All registered users have been reviewed.
              </Typography>
            </Box>
          )}

          {/* Table */}
          {!isLoading && !error && filtered.length > 0 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>#</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>User</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Role</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Requested On</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((user, idx) => (
                    <TableRow
                      key={user._id}
                      hover
                      sx={{
                        '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                      }}
                    >
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>
                            {user.name?.[0]?.toUpperCase() || 'U'}
                          </Avatar>
                          <Typography fontWeight={500}>{user.name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          icon={
                            user.role === 'teacher' ? (
                              <SchoolIcon fontSize="small" />
                            ) : (
                              <PersonIcon fontSize="small" />
                            )
                          }
                          label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          color={user.role === 'teacher' ? 'secondary' : 'primary'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="Approve this user">
                            <span>
                              <Button
                                variant="contained"
                                color="success"
                                size="small"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => handleApprove(user._id, user.email)}
                                disabled={approving || rejecting}
                                sx={{ textTransform: 'none' }}
                              >
                                Approve
                              </Button>
                            </span>
                          </Tooltip>
                          <Tooltip title="Reject and remove this registration">
                            <span>
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<CancelIcon />}
                                onClick={() => handleReject(user._id, user.email)}
                                disabled={approving || rejecting}
                                sx={{ textTransform: 'none' }}
                              >
                                Reject
                              </Button>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pending count badge */}
          {!isLoading && pendingUsers && pendingUsers.length > 0 && (
            <Box mt={2} display="flex" justifyContent="flex-end">
              <Chip
                label={`${pendingUsers.length} pending approval${pendingUsers.length !== 1 ? 's' : ''}`}
                color="warning"
                variant="filled"
              />
            </Box>
          )}
        </Box>
      </DashboardCard>
    </PageContainer>
  );
};

export default UserApprovalsPage;
