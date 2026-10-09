import React from 'react';
import { Box, Typography, Button, Stack, MenuItem } from '@mui/material';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { useFormik } from 'formik';
import * as yup from 'yup';

const validationSchema = yup.object({
  topic: yup.string().required('Topic is required'),
  difficulty: yup.string().required('Difficulty is required'),
  numberOfQuestions: yup.number().min(1).required('Required'),
  marksPerQuestion: yup.number().min(1).required('Required'),
});

const AIGeneratorForm = ({ onSubmit, isLoading }) => {
  const formik = useFormik({
    initialValues: {
      topic: '',
      difficulty: 'medium',
      numberOfQuestions: 10,
      marksPerQuestion: 2,
    },
    validationSchema,
    onSubmit: (values) => {
      onSubmit(values);
    },
  });

  return (
    <Box component="form" onSubmit={formik.handleSubmit}>
      <Typography variant="h4" mb={3}>
        AI Exam Generator Configuration
      </Typography>

      <Stack spacing={3} mb={3}>
        <CustomTextField
          id="topic"
          name="topic"
          label="Topic (e.g. Stack, Queue, Object Oriented Programming)"
          value={formik.values.topic}
          onChange={formik.handleChange}
          error={formik.touched.topic && Boolean(formik.errors.topic)}
          helperText={formik.touched.topic && formik.errors.topic}
          fullWidth
        />

        <CustomTextField
          id="difficulty"
          name="difficulty"
          label="Difficulty"
          select
          value={formik.values.difficulty}
          onChange={formik.handleChange}
          error={formik.touched.difficulty && Boolean(formik.errors.difficulty)}
          helperText={formik.touched.difficulty && formik.errors.difficulty}
          fullWidth
        >
          <MenuItem value="easy">Easy</MenuItem>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="hard">Hard</MenuItem>
          <MenuItem value="mixed">Mixed</MenuItem>
        </CustomTextField>

        <Stack direction="row" spacing={3}>
          <CustomTextField
            id="numberOfQuestions"
            name="numberOfQuestions"
            label="Number of Questions"
            type="number"
            value={formik.values.numberOfQuestions}
            onChange={formik.handleChange}
            error={formik.touched.numberOfQuestions && Boolean(formik.errors.numberOfQuestions)}
            helperText={formik.touched.numberOfQuestions && formik.errors.numberOfQuestions}
            fullWidth
          />
          <CustomTextField
            id="marksPerQuestion"
            name="marksPerQuestion"
            label="Marks Per Question"
            type="number"
            value={formik.values.marksPerQuestion}
            onChange={formik.handleChange}
            error={formik.touched.marksPerQuestion && Boolean(formik.errors.marksPerQuestion)}
            helperText={formik.touched.marksPerQuestion && formik.errors.marksPerQuestion}
            fullWidth
          />
        </Stack>
      </Stack>

      <Button
        variant="contained"
        color="secondary"
        type="submit"
        fullWidth
        size="large"
        disabled={isLoading}
      >
        {isLoading ? 'Generating questions... Please wait.' : 'Generate Questions with AI'}
      </Button>
    </Box>
  );
};

export default AIGeneratorForm;
