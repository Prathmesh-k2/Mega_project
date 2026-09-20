import React from 'react';
import { Grid, Box, Card, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PageContainer from 'src/components/container/PageContainer';
import { useFormik } from 'formik';
import * as yup from 'yup';

import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useUpdateUserMutation } from '../../slices/usersApiSlice';
import { setCredentials } from '../../slices/authSlice';
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
});

const UserAccount = () => {
  const { userInfo } = useSelector((state) => state.auth);

  const initialUserValues = {
    name: userInfo?.name || '',
    email: userInfo?.email || '',
    password: '',
    confirm_password: '',
  };

  const formik = useFormik({
    initialValues: initialUserValues,
    validationSchema: userValidationSchema,
    onSubmit: (values) => {
      handleSubmit(values);
    },
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [updateProfile] = useUpdateUserMutation();

  // Phase 1: role cannot be changed from profile (no role in payload)
  const handleSubmit = async ({ name, email, password, confirm_password }) => {
    if (password && password !== confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      const payload = { _id: userInfo?._id, name, email };
      if (password) payload.password = password;

      const res = await updateProfile(payload).unwrap();
      dispatch(setCredentials({ ...userInfo, ...res }));
      toast.success('Profile updated successfully');
      navigate('/');
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
