import React, { useState } from 'react';
import { Alert, Box, Button, Card, Stack, TextField, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import PageContainer from 'src/components/container/PageContainer';
import { useResetPasswordMutation, useSendPasswordResetOtpMutation } from '../../slices/usersApiSlice';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [sendOtp, { isLoading: sending }] = useSendPasswordResetOtpMutation();
  const [resetPassword, { isLoading: resetting }] = useResetPasswordMutation();

  const handleSendOtp = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const result = await sendOtp({ email: email.trim() }).unwrap();
      setSent(true);
      setMessage(result.message);
    } catch (error) {
      setMessage(error?.data?.message || 'The reset email could not be sent.');
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    try {
      const result = await resetPassword({ email: email.trim(), otp, password }).unwrap();
      setMessage(result.message);
      setTimeout(() => navigate('/auth/login'), 1200);
    } catch (error) {
      setMessage(error?.data?.message || 'The password could not be reset.');
    }
  };

  return (
    <PageContainer title="Forgot password" description="Reset your account password">
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Card sx={{ p: 4, width: '100%', maxWidth: 460 }}>
          <Typography variant="h4" mb={1}>Reset password</Typography>
          <Typography color="text.secondary" mb={3}>
            Request a one-time code, then choose a new password.
          </Typography>
          {message && <Alert severity={message.includes('successfully') || message.includes('sent') ? 'info' : 'error'} sx={{ mb: 2 }}>{message}</Alert>}
          <Stack component="form" spacing={2} onSubmit={sent ? handleReset : handleSendOtp}>
            <TextField label="Email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={sent} />
            {sent && (
              <>
                <TextField label="6-digit OTP" required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputProps={{ maxLength: 6, inputMode: 'numeric' }} />
                <TextField label="New password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} helperText="At least 6 characters" />
                <TextField label="Confirm password" type="password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </>
            )}
            <Button type="submit" variant="contained" disabled={sending || resetting}>
              {sent ? (resetting ? 'Resetting…' : 'Reset password') : (sending ? 'Sending…' : 'Send reset OTP')}
            </Button>
            {sent && <Button type="button" onClick={() => { setSent(false); setMessage(''); }}>Use a different email</Button>}
            <Button component={Link} to="/auth/login">Back to login</Button>
          </Stack>
        </Card>
      </Box>
    </PageContainer>
  );
}
