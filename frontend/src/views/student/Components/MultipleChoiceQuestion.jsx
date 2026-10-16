import React from 'react';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useNavigate, useParams } from 'react-router';
import axiosInstance from '../../../axios';
import { toast } from 'react-toastify';

export default function MultipleChoiceQuestion({
  questions,
  currentQuestionIndex = 0,
  setCurrentQuestionIndex,
  answers = {},
  setAnswers,
  disabled = false,
}) {
  const questionList = Array.isArray(questions) ? questions : [];
  const navigate = useNavigate();
  const { examId } = useParams();
  const currentQuestion = Math.min(currentQuestionIndex, Math.max(questionList.length - 1, 0));
  const currentQuestionData = questionList[currentQuestion];
  const selectedOption = currentQuestionData ? answers[currentQuestionData._id] || '' : '';
  const isLastQuestion = questionList.length > 0 && currentQuestion === questionList.length - 1;

  const handleOptionChange = (event) => {
    if (!currentQuestionData || !setAnswers) return;
    setAnswers((previous) => ({ ...previous, [currentQuestionData._id]: event.target.value }));
  };

  const handleNextQuestion = async () => {
    if (!currentQuestionData) {
      return;
    }

    if (isLastQuestion) {
      try {
        // Convert Map to object for API
        // Send results to the backend
        await axiosInstance.post(
          '/api/users/results',
          {
            examId,
            answers,
          },
          {
            withCredentials: true,
          },
        );

        navigate(`/exam/${examId}/codedetails`);
      } catch (error) {
        console.error('Error saving results:', error);
        toast.error('Failed to save results');
      }
    }

    if (currentQuestion < questionList.length - 1) {
      setCurrentQuestionIndex?.(currentQuestion + 1);
    }
  };

  if (!currentQuestionData) {
    return (
      <Typography variant="body1" role="status">
        No questions are available for this exam yet.
      </Typography>
    );
  }

  return (
    <Card
      sx={{ width: '100%', maxWidth: 1000, boxShadow: 2 }}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h4" mb={3}>
          Question {currentQuestion + 1}:
        </Typography>
        <Typography variant="body1" mb={3}>
          {currentQuestionData.question}
        </Typography>
        <Box mb={4}>
          <FormControl component="fieldset">
            <RadioGroup
              aria-label="quiz"
              name="quiz"
              value={selectedOption}
              onChange={handleOptionChange}
              aria-disabled={disabled}
            >
              {(Array.isArray(currentQuestionData.options) ? currentQuestionData.options : []).map((option) => (
                <FormControlLabel
                  key={option._id || option.id}
                  value={option._id || option.id}
                  control={<Radio disabled={disabled} />}
                  label={option.optionText}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </Box>
        <Stack direction="row" spacing={2} justifyContent="space-between">
          <Button
            variant="contained"
            color="primary"
            onClick={handleNextQuestion}
            disabled={disabled || !selectedOption}
            style={{ marginLeft: 'auto' }}
          >
            {isLastQuestion ? 'Proceed to Coding' : 'Next Question'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
