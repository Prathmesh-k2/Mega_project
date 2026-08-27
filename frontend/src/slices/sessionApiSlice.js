import { apiSlice } from './apiSlice';

const SESSIONS_URL = '/api/sessions';

export const sessionApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    startSession: builder.mutation({
      query: (data) => ({
        url: `${SESSIONS_URL}/start`,
        method: 'POST',
        body: data,
      }),
    }),
    getSession: builder.query({
      query: (sessionId) => ({
        url: `${SESSIONS_URL}/${sessionId}`,
        method: 'GET',
      }),
    }),
    autoSaveAnswers: builder.mutation({
      query: ({ sessionId, answers }) => ({
        url: `${SESSIONS_URL}/${sessionId}/autosave`,
        method: 'PUT',
        body: { answers },
      }),
    }),
    submitSession: builder.mutation({
      query: ({ sessionId, answers }) => ({
        url: `${SESSIONS_URL}/${sessionId}/submit`,
        method: 'POST',
        body: { answers },
      }),
    }),
    terminateSession: builder.mutation({
      query: ({ sessionId, reason }) => ({
        url: `${SESSIONS_URL}/${sessionId}/terminate`,
        method: 'POST',
        body: { reason },
      }),
    }),
  }),
});

export const {
  useStartSessionMutation,
  useGetSessionQuery,
  useAutoSaveAnswersMutation,
  useSubmitSessionMutation,
  useTerminateSessionMutation,
} = sessionApiSlice;
