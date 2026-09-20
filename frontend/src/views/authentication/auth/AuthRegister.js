import React from 'react';
import { Box, Typography, Button, CircularProgress, InputAdornment } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EmailIcon from '@mui/icons-material/Email';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { Stack } from '@mui/system';

const AuthRegister = ({ formik, title, subtitle, subtext, onSendOtp, otpSent, otpLoading }) => {
  const { values, errors, touched, handleBlur, handleChange } = formik;

  return (
    <>
      {title ? (
        <Typography fontWeight="700" variant="h2" mb={1}>
          {title}
        </Typography>
      ) : null}

      {subtext}

      <Box component="form">
        <Stack mb={1}>
          {/* Name */}
          <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="name" mb="5px">
            Name
          </Typography>
          <CustomTextField
            id="name"
            name="name"
            placeholder="Enter Your Name"
            variant="outlined"
            value={values.name}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.name && errors.name ? true : false}
            helperText={touched.name && errors.name ? errors.name : null}
            fullWidth
            required
          />

          {/* Email with Send OTP button */}
          <Typography
            variant="subtitle1"
            fontWeight={600}
            component="label"
            htmlFor="email"
            mb="5px"
            mt="10px"
          >
            Email Address
          </Typography>
          <Box display="flex" gap={1} alignItems="flex-start">
            <CustomTextField
              id="email"
              name="email"
              variant="outlined"
              placeholder="Enter Your Email"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.email && errors.email ? true : false}
              helperText={touched.email && errors.email ? errors.email : null}
              required
              fullWidth
              disabled={otpSent}
              InputProps={
                otpSent
                  ? {
                      endAdornment: (
                        <InputAdornment position="end">
                          <CheckCircleOutlineIcon color="success" />
                        </InputAdornment>
                      ),
                    }
                  : undefined
              }
            />
            <Button
              variant="outlined"
              onClick={() => onSendOtp(values.email)}
              disabled={otpSent || otpLoading || !values.email || !!errors.email}
              sx={{ whiteSpace: 'nowrap', minWidth: '110px', height: '54px', mt: '0px' }}
              startIcon={otpLoading ? <CircularProgress size={16} /> : <EmailIcon />}
            >
              {otpSent ? 'Sent ✓' : 'Send OTP'}
            </Button>
          </Box>

          {/* OTP field — shown only after OTP is sent */}
          {otpSent && (
            <>
              <Typography
                variant="subtitle1"
                fontWeight={600}
                component="label"
                htmlFor="otp"
                mb="5px"
                mt="10px"
              >
                Enter OTP{' '}
                <Typography component="span" variant="caption" color="text.secondary">
                  (sent to your email · expires in 5 min)
                </Typography>
              </Typography>
              <CustomTextField
                id="otp"
                name="otp"
                variant="outlined"
                placeholder="6-digit OTP code"
                value={values.otp}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.otp && errors.otp ? true : false}
                helperText={touched.otp && errors.otp ? errors.otp : null}
                required
                fullWidth
                inputProps={{ maxLength: 6, style: { letterSpacing: '0.4em', fontSize: '1.2rem' } }}
              />
            </>
          )}

          {/* Password */}
          <Typography
            variant="subtitle1"
            fontWeight={600}
            component="label"
            htmlFor="password"
            mb="5px"
            mt="10px"
          >
            Password
          </Typography>
          <CustomTextField
            id="password"
            name="password"
            type="password"
            variant="outlined"
            value={values.password}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.password && errors.password ? true : false}
            helperText={touched.password && errors.password ? errors.password : null}
            required
            fullWidth
          />

          {/* Confirm Password */}
          <Typography
            variant="subtitle1"
            fontWeight={600}
            component="label"
            htmlFor="confirm_password"
            mb="5px"
            mt="10px"
          >
            Confirm Password
          </Typography>
          <CustomTextField
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="false"
            variant="outlined"
            value={values.confirm_password}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.confirm_password && errors.confirm_password ? true : false}
            helperText={
              touched.confirm_password && errors.confirm_password ? errors.confirm_password : null
            }
            fullWidth
            required
          />
          {/* Phase 1: role dropdown removed — public signup is student-only */}
        </Stack>

        <Button
          color="primary"
          variant="contained"
          size="large"
          fullWidth
          disabled={!otpSent}
          onClick={formik.handleSubmit}
          sx={{ mt: 1 }}
        >
          {otpSent ? 'Sign Up' : 'Verify Email to Sign Up'}
        </Button>

        {!otpSent && (
          <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mt={1}>
            Please enter your email and click "Send OTP" to verify before signing up.
          </Typography>
        )}
      </Box>
      {subtitle}
    </>
  );
};
export default AuthRegister;
