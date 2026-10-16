import React from 'react';
import { Box, Typography, Button, Paper, Stack, Divider, Chip } from '@mui/material';

const ExamReview = ({ examDetails, questions, onSaveDraft, onPublish, onEditQuestion, isProcessing }) => {
  return (
    <Box>
      <Typography variant="h3" mb={3} textAlign="center">
        Exam Review
      </Typography>
      
      <Paper variant="outlined" sx={{ p: 3, mb: 4, backgroundColor: 'primary.light', color: 'text.primary' }}>
        <Typography variant="h5" mb={2}>Exam Details</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}>
          <Box flex={1}>
            <Typography variant="body1"><strong>Exam Name:</strong> {examDetails.examName}</Typography>
            <Typography variant="body1"><strong>Subject:</strong> {examDetails.subject}</Typography>
            <Typography variant="body1"><strong>Duration:</strong> {examDetails.duration} minutes</Typography>
          </Box>
          <Box flex={1}>
            <Typography variant="body1"><strong>Total Questions:</strong> {examDetails.totalQuestions}</Typography>
            <Typography variant="body1">
              <strong>Total Marks:</strong> {questions.reduce((sum, q) => sum + Number(q?.marks || q?.ansmarks || 0), 0)}
            </Typography>
          </Box>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}>
          <Box flex={1}>
            <Typography variant="body2"><strong>Start:</strong> {new Date(examDetails.liveDate).toLocaleString()}</Typography>
          </Box>
          <Box flex={1}>
             <Typography variant="body2"><strong>End:</strong> {new Date(examDetails.deadDate).toLocaleString()}</Typography>
          </Box>
        </Stack>
      </Paper>

      <Typography variant="h5" mb={2}>Final Questions ({questions.length})</Typography>
      
      <Stack spacing={2} mb={4}>
        {questions.map((q, idx) => {
          if (!q) return null;
          const correctAnswer = q.correctAnswer || q.options?.find((option) => option?.isCorrect)?.optionText;
          return (
          <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Typography variant="subtitle1" fontWeight={600}>
                Question {idx + 1}
                <Typography variant="body1" component="span" display="block" mt={1} fontWeight="normal">
                  {q.question}
                </Typography>
              </Typography>
              <Chip label={`Source: ${q.source || 'MANUAL'}`} size="small" color={q.source === 'AI' ? 'secondary' : 'default'} />
            </Box>
            
            <Box pl={2} mb={2}>
              {q.options?.map((opt, oIdx) => {
                const optionText = typeof opt === 'string' ? opt : opt.optionText;
                const isCorrect = optionText === correctAnswer;
                return (
                <Typography
                  key={oIdx}
                  variant="body2"
                  color={isCorrect ? "success.main" : "textSecondary"}
                  fontWeight={isCorrect ? "bold" : "normal"}
                >
                  {String.fromCharCode(65 + oIdx)}. {optionText} {isCorrect && "✓"}
                </Typography>
                );
              })}
            </Box>
            
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="textSecondary">
                Marks: {q.marks || q.ansmarks || 1}
              </Typography>
              <Button variant="text" size="small" onClick={() => onEditQuestion(idx)}>
                Edit Question
              </Button>
            </Box>
          </Paper>
        )})}
      </Stack>

      <Box display="flex" justifyContent="flex-end" gap={2}>
        <Button variant="outlined" color="primary" onClick={onSaveDraft} disabled={isProcessing}>
          Save Draft
        </Button>
        <Button variant="contained" color="success" onClick={onPublish} disabled={isProcessing}>
          Publish Exam
        </Button>
      </Box>
    </Box>
  );
};

export default ExamReview;
