import React from 'react';
import { Box, Typography, Button, LinearProgress, Stack, Paper } from '@mui/material';
import { IconCheck, IconPointFilled, IconCircle } from '@tabler/icons-react';

const QuestionNavigator = ({ totalQuestions, questions, currentIndex, onSelect }) => {
  const completedCount = questions.filter(q => q !== null).length;
  const progressPercent = (completedCount / totalQuestions) * 100;

  return (
    <Paper variant="outlined" sx={{ p: 2, position: 'sticky', top: 20, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" mb={2}>QUESTIONS</Typography>
      
      <Stack spacing={1} sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, maxHeight: '60vh' }}>
        {Array.from({ length: totalQuestions }).map((_, i) => {
          const isCompleted = questions[i] !== null;
          const isSelected = i === currentIndex;
          
          let icon;
          if (isCompleted) {
             icon = <IconCheck size={18} color="green" />;
          } else if (isSelected) {
             icon = <IconPointFilled size={18} color="blue" />;
          } else {
             icon = <IconCircle size={18} color="gray" />;
          }

          return (
            <Button
              key={i}
              variant={isSelected ? "contained" : "text"}
              color={isSelected ? "primary" : "inherit"}
              onClick={() => onSelect(i)}
              sx={{ justifyContent: 'flex-start', textTransform: 'none', px: 2 }}
              startIcon={icon}
            >
              Question {i + 1}
            </Button>
          );
        })}
      </Stack>

      <Box pt={2} borderTop="1px solid #eee">
        <Typography variant="body2" mb={1} fontWeight="bold">
          Progress: {completedCount} / {totalQuestions} completed
        </Typography>
        <LinearProgress variant="determinate" value={progressPercent} sx={{ height: 8, borderRadius: 1 }} />
      </Box>
    </Paper>
  );
};

export default QuestionNavigator;
