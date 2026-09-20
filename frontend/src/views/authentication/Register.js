import React, { useEffect, useState } from 'react';
import { Grid, Box, Card, Typography, Stack } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import PageContainer from 'src/components/container/PageContainer';
import AuthRegister from './auth/AuthRegister';
import { useFormik } from 'formik';
import * as yup from 'yup';

import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useRegisterMutation, useSendOtpMutation } from './../../slices/usersApiSlice';
import Loader from './Loader';

const userValidationSchema = yup.object({
  name: yup.string().min(2).max(25).required('Please enter your name'),
  email: yup.string('Enter your email').email('Enter a valid email').required('Email is required'),
  otp: yup
    .string()
    .matches(/^[0-9]{6}$/, 'OTP must be exactly 6 digits')
    .required('OTP is required'),
  password: yup
    .string('Enter your password')
    .min(6, 'Password should be of minimum 6 characters length')
    .required('Password is required'),
  confirm_password: yup
    .string()
    .required('Confirm Password is required')
    .oneOf([yup.ref('password'), null], 'Password must match'),
});

const initialUserValues = {
  name: '',
  email: '',
  otp: '',
  password: '',
  confirm_password: '',
};

const Register = () => {
  const [otpSent, setOtpSent] = useState(false);

  const formik = useFormik({
    initialValues: initialUserValues,
    validationSchema: userValidationSchema,
    onSubmit: (values) => {
      handleSubmit(values);
    },
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [register, { isLoading }] = useRegisterMutation();
  const [sendOtp, { isLoading: otpLoading }] = useSendOtpMutation();

  const { userInfo } = useSelector((state) => state.auth);

  useEffect(() => {
    if (userInfo) {
      navigate('/');
    }
  }, [navigate, userInfo]);

  // Send OTP handler
  const handleSendOtp = async (email) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address first.');
      return;
    }
    try {
      await sendOtp({ email }).unwrap();
      setOtpSent(true);
      toast.success('OTP sent! Check your email (or server console in dev mode).');
    } catch (err) {
      toast.error(err?.data?.message || err.error || 'Failed to send OTP');
    }
  };

  // Phase 1: do not send role — backend always creates students
  const handleSubmit = async ({ name, email, password, confirm_password, otp }) => {
    if (password !== confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      const res = await register({ name, email, password, otp }).unwrap();
      formik.resetForm();
      setOtpSent(false);
      toast.success(
        res.message ||
          'Registration submitted! Please wait for admin approval before logging in.',
        { autoClose: 6000 },
      );
      navigate('/auth/login');
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  return (
    <PageContainer title="Register" description="this is Register page">
      <Box
        sx={{
          position: 'relative',
          '&:before': {
            content: '""',
            background: 'radial-gradient(#d2f1df, #d3d7fa, #bad8f4)',
            backgroundSize: '400% 400%',
            animation: 'gradient 15s ease infinite',
            position: 'absolute',
            height: '100%',
            width: '100%',
            opacity: '0.3',
          },
        }}
      >
        <Grid container spacing={0} justifyContent="center" sx={{ height: '100vh' }}>
          <Grid
            item
            xs={12}
            sm={12}
            lg={6}
            xl={12}
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            <Card elevation={9} sx={{ p: 2, zIndex: 1, width: '100%', maxWidth: '500px' }}>
              <Box display="flex" alignItems="center" justifyContent="center">
                <Typography
                  variant="h4"
                  component="h1"
                  style={{
                    fontWeight: 'bold',
                    color: '#1976d2',
                    margin: '20px 0',
                    textAlign: 'center',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  AI_Evalu8
                </Typography>
              </Box>
              <AuthRegister
                formik={formik}
                onSendOtp={handleSendOtp}
                otpSent={otpSent}
                otpLoading={otpLoading}
                subtext={
                  <Typography variant="subtitle1" textAlign="center" color="textSecondary" mb={1}>
                    CONDUCT SECURE ONLINE EXAMS NOW
                  </Typography>
                }
                subtitle={
                  <Stack direction="row" justifyContent="center" spacing={1} mt={3}>
                    <Typography color="textSecondary" variant="h6" fontWeight="400">
                      Already have an Account?
                    </Typography>
                    <Typography
                      component={Link}
                      to="/auth/login"
                      fontWeight="500"
                      sx={{
                        textDecoration: 'none',
                        color: 'primary.main',
                      }}
                    >
                      Sign In
                    </Typography>
                    {isLoading && <Loader />}
                  </Stack>
                }
              />
            </Card>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};
export default Register;
