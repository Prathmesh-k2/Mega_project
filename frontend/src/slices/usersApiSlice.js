import { apiSlice } from './apiSlice';
const USERS_URL = '/api/users';

// inject endpoint we can create our enpoint here
// and the got injected in api slice endpoints part
export const userApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Login Api
    login: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/auth`,
        method: 'POST',
        body: data,
      }),
    }),
    // Register Mutation Api
    register: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}`,
        method: 'POST',
        body: data,
      }),
    }),
    // LogOut Api
    logout: builder.mutation({
      query: () => ({
        url: `${USERS_URL}/logout`,
        method: 'POST',
      }),
    }),
    // Update profile
    updateUser: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/profile`,
        method: 'PUT',
        body: data,
      }),
    }),
    // [NEW] Send OTP to email
    sendOtp: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/send-otp`,
        method: 'POST',
        body: data,
      }),
    }),
    // [NEW] Get all pending (unapproved) users
    getPendingUsers: builder.query({
      query: () => ({
        url: `${USERS_URL}/pending`,
        method: 'GET',
      }),
      providesTags: ['PendingUsers'],
    }),
    // [NEW] Approve a user
    approveUser: builder.mutation({
      query: (id) => ({
        url: `${USERS_URL}/approve/${id}`,
        method: 'PUT',
      }),
      invalidatesTags: ['PendingUsers'],
    }),
    // [NEW] Reject a user
    rejectUser: builder.mutation({
      query: (id) => ({
        url: `${USERS_URL}/reject/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PendingUsers'],
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useUpdateUserMutation,
  useSendOtpMutation,
  useGetPendingUsersQuery,
  useApproveUserMutation,
  useRejectUserMutation,
} = userApiSlice;
