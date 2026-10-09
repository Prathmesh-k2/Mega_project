import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';

const ExamForm = ({ formik, title, onSubmitForm, isSaving }) => {
  const { values, errors, touched, handleChange } = formik;

  return (
    <Box component="form" onSubmit={onSubmitForm}>
      {title && (
        <Typography variant="h3" textAlign="center" color="textPrimary" mb={3}>
          {title}
        </Typography>
      )}

      <Stack spacing={3} mb={3}>
        <CustomTextField
          id="examName"
          name="examName"
          label="Exam Name"
          fullWidth
          value={values.examName}
          onChange={handleChange}
          error={touched.examName && Boolean(errors.examName)}
          helperText={touched.examName && errors.examName}
        />
        
        <CustomTextField
          id="subject"
          name="subject"
          label="Subject"
          fullWidth
          value={values.subject}
          onChange={handleChange}
          error={touched.subject && Boolean(errors.subject)}
          helperText={touched.subject && errors.subject}
        />

        <CustomTextField
          id="description"
          name="description"
          label="Description (Optional)"
          fullWidth
          multiline
          rows={2}
          value={values.description}
          onChange={handleChange}
        />

        <Stack direction="row" spacing={3}>
          <CustomTextField
            id="totalQuestions"
            name="totalQuestions"
            label="Total Questions"
            type="number"
            fullWidth
            value={values.totalQuestions}
            onChange={handleChange}
            error={touched.totalQuestions && Boolean(errors.totalQuestions)}
            helperText={touched.totalQuestions && errors.totalQuestions}
          />
          <CustomTextField
            id="duration"
            name="duration"
            label="Duration (minutes)"
            type="number"
            fullWidth
            value={values.duration}
            onChange={handleChange}
            error={touched.duration && Boolean(errors.duration)}
            helperText={touched.duration && errors.duration}
          />
        </Stack>

        <Stack direction="row" spacing={3}>
          <CustomTextField
            id="liveDate"
            name="liveDate"
            label="Start Date and Time"
            type="datetime-local"
            fullWidth
            value={values.liveDate}
            onChange={handleChange}
            error={touched.liveDate && Boolean(errors.liveDate)}
            helperText={touched.liveDate && errors.liveDate}
            InputLabelProps={{ shrink: true }}
          />
          <CustomTextField
            id="deadDate"
            name="deadDate"
            label="End Date and Time"
            type="datetime-local"
            fullWidth
            value={values.deadDate}
            onChange={handleChange}
            error={touched.deadDate && Boolean(errors.deadDate)}
            helperText={touched.deadDate && errors.deadDate}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </Stack>

      <Button
        color="primary"
        variant="contained"
        size="large"
        fullWidth
        type="submit"
        disabled={formik.isSubmitting || isSaving}
      >
        {isSaving ? "Saving..." : "Save Draft and Continue"}
      </Button>
    </Box>
  );
};

export default ExamForm;
