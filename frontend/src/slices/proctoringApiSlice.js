import { apiSlice } from './apiSlice';

const PROCTORING_URL = '/api/proctoring';
const ADMIN_URL = '/api/admin';

export const proctoringApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Log a violation event
    logViolation: builder.mutation({
      query: (data) => ({
        url: `${PROCTORING_URL}/events`,
        method: 'POST',
        body: data,
      }),
    }),
    // Log evidence
    logEvidence: builder.mutation({
      query: (data) => ({
        url: `${PROCTORING_URL}/evidence`,
        method: 'POST',
        body: data,
      }),
    }),
    // Get session violations
    getSessionViolations: builder.query({
      query: (sessionId) => ({
        url: `${PROCTORING_URL}/sessions/${sessionId}`,
        method: 'GET',
      }),
    }),
    // Get proctoring report
    getSessionReport: builder.query({
      query: (sessionId) => ({
        url: `${PROCTORING_URL}/report/${sessionId}`,
        method: 'GET',
      }),
    }),
    // Admin dashboard stats
    getDashboardStats: builder.query({
      query: () => ({
        url: `${ADMIN_URL}/dashboard`,
        method: 'GET',
      }),
    }),
    // Admin analytics
    getAnalytics: builder.query({
      query: () => ({
        url: `${ADMIN_URL}/analytics`,
        method: 'GET',
      }),
    }),
    // Admin active monitoring
    getActiveMonitoring: builder.query({
      query: () => ({
        url: `${ADMIN_URL}/active-sessions`,
        method: 'GET',
      }),
      pollingInterval: 10000, // Refresh every 10 seconds
    }),
  }),
});

export const {
  useLogViolationMutation,
  useLogEvidenceMutation,
  useGetSessionViolationsQuery,
  useGetSessionReportQuery,
  useGetDashboardStatsQuery,
  useGetAnalyticsQuery,
  useGetActiveMonitoringQuery,
} = proctoringApiSlice;
