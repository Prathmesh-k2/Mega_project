import React, { useEffect } from 'react';
import { Grid, Box, Card, Typography, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PageContainer from 'src/components/container/PageContainer';
import Logo from 'src/layouts/full/shared/logo/Logo';
import { useFormik } from 'formik';
import * as yup from 'yup';

import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useUpdateUserMutation } from '../../slices/usersApiSlice';
import { setCredentials } from '../../slices/authSlice';
import Loader from './Loader';
import AuthUpdate from './auth/AuthUpdate';

const userValidationSchema = yup.object({
  name: yup.string().min(2).max(25).required('Please enter your name'),
  email: yup.string('Enter your email').email('Enter a valid email').required('Email is required'),
  // Password is optional — leave blank to keep existing password
  password: yup
    .string('Enter your password')
    .min(2, 'Password should be at least 2 characters')
    .nullable()
    .optional(),
  confirm_password: yup
    .string()
    .nullable()
    .optional()
    .oneOf([yup.ref('password'), null, ''], 'Passwords must match'),
  role: yup.string().oneOf(['student', 'teacher'], 'Invalid role').required('Role is required'),
});

const UserAccount = () => {
  const { userInfo } = useSelector((state) => state.auth);

  const initialUserValues = {
    name: userInfo.name || '',
    email: userInfo.email || '',
    password: '',
    confirm_password: '',
    role: userInfo.role || 'student',
  };

  const formik = useFormik({
    initialValues: initialUserValues,
    validationSchema: userValidationSchema,
    onSubmit: (values, action) => {
      handleSubmit(values);
    },
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [updateProfile, { isLoading }] = useUpdateUserMutation();

  const handleSubmit = async ({ name, email, password, confirm_password, role }) => {
    if (password && password !== confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      const payload = { _id: userInfo._id, name, email, role };
      if (password) payload.password = password;

      const res = await updateProfile(payload).unwrap();
      // Merge with existing userInfo to preserve any fields the backend doesn't return
      dispatch(setCredentials({ ...userInfo, ...res }));

      const roleChanged = role !== userInfo.role;
      toast.success(
        roleChanged
          ? `Role changed to ${role}! Redirecting…`
          : 'Profile updated successfully',
      );

      // Re-navigate to root so sidebar & route guards re-evaluate with new role
      setTimeout(() => navigate('/'), roleChanged ? 1200 : 0);
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  return (
    <PageContainer title="UserAccount" description="this is UserAccount page">
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
            lg={12}
            xl={6}
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            <Card elevation={9} sx={{ p: 4, zIndex: 1, width: '100%', maxWidth: '500px' }}>
              <AuthUpdate
                formik={formik}
                onSubmit={handleSubmit}
                title={
                  <Typography variant="h3" textAlign="center" color="textPrimary" mb={1}>
                    Update Account Info
                  </Typography>
                }
              />
            </Card>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};
export default UserAccount;
