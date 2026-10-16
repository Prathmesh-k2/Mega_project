import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';

const NumberOfQuestions = ({
  questions = [],
  answers = {},
  currentQuestionIndex = 0,
  onQuestionSelect,
  submitTest,
  examDurationInSeconds,
  paused = false,
}) => {
  const totalQuestions = questions.length;
  const answeredCount = questions.reduce(
    (count, question) => count + (answers[question._id] ? 1 : 0),
    0,
  );
  const [timeLeft, setTimeLeft] = useState(examDurationInSeconds * 60);
  const submitTestRef = useRef(submitTest);
  const hasTimeRemaining = timeLeft > 0;

  useEffect(() => {
    submitTestRef.current = submitTest;
  }, [submitTest]);

  useEffect(() => {
    setTimeLeft(examDurationInSeconds * 60);
  }, [examDurationInSeconds]);

  useEffect(() => {
    if (paused || !hasTimeRemaining) return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          toast.warning('Time is up! Submitting your test...');
          submitTestRef.current?.();
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paused, hasTimeRemaining]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Box width="100%">
      <Stack spacing={1.5} width="100%">
        <Typography variant="subtitle1" fontWeight={700}>
          Question {totalQuestions ? currentQuestionIndex + 1 : 0} / {totalQuestions}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Answered: {answeredCount} | Remaining: {Math.max(totalQuestions - answeredCount, 0)}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          Time left: {formatTime(timeLeft)}
        </Typography>
        <Button variant="contained" onClick={submitTest} color="error" disabled={paused} fullWidth>
          Finish Test
        </Button>
      </Stack>

      <Box
        mt={2}
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))',
          gap: 0.75,
          maxHeight: 180,
          overflowY: 'auto',
          p: 0.25,
        }}
        aria-label="Question navigation"
      >
        {questions.map((question, index) => {
          const isCurrent = index === currentQuestionIndex;
          const isAnswered = Boolean(answers[question._id]);
          return (
            <Button
              key={question._id || index}
              type="button"
              variant={isCurrent ? 'contained' : 'outlined'}
              color={isCurrent ? 'primary' : isAnswered ? 'success' : 'inherit'}
              disabled={paused}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`Question ${index + 1}, ${isAnswered ? 'answered' : 'not answered'}${isCurrent ? ', current' : ''}`}
              onClick={() => onQuestionSelect(index)}
              sx={{ minWidth: 36, width: 38, height: 38, p: 0, fontWeight: 700 }}
            >
              {index + 1}
            </Button>
          );
        })}
      </Box>

      <Stack direction="row" spacing={1.5} mt={1} flexWrap="wrap">
        <Typography variant="caption" color="primary.main">● Current</Typography>
        <Typography variant="caption" color="success.main">● Answered</Typography>
        <Typography variant="caption" color="text.secondary">● Remaining</Typography>
      </Stack>
    </Box>
  );
};

export default NumberOfQuestions;
