import React, { useState } from 'react';
import { Grid, Box, Typography, Alert } from '@mui/material';
import QuestionNavigator from './QuestionNavigator';
import QuestionEditor from './QuestionEditor';

const QuestionWorkspace = ({ questions, totalQuestions, subjectName, currentIndex, setCurrentIndex, onUpdateQuestion, onFinishWorkspace }) => {
  const [globalError, setGlobalError] = useState(null);

  const handleSelect = (index) => {
    setCurrentIndex(index);
    setGlobalError(null);
  };

  const handleSaveAndNext = (questionData) => {
    onUpdateQuestion(currentIndex, questionData);
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    setGlobalError(null);
  };

  const handleFinish = (finalQuestionData) => {
    onUpdateQuestion(currentIndex, finalQuestionData);
    
    const updatedQuestions = [...questions];
    updatedQuestions[currentIndex] = finalQuestionData;
    
    const missingIndices = [];
    updatedQuestions.forEach((q, idx) => {
      if (q === null) missingIndices.push(idx + 1);
    });

    if (missingIndices.length > 0) {
      setGlobalError(`Please complete the following questions: Question ${missingIndices.join(', Question ')}`);
      return;
    }
    
    onFinishWorkspace(updatedQuestions);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
    setGlobalError(null);
  };

  return (
    <Box>
      <Typography variant="h3" mb={3} textAlign="center">
        Question Workspace
      </Typography>

      {globalError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {globalError}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ minHeight: '600px' }}>
        <Grid item xs={12} md={4} lg={3}>
          <QuestionNavigator 
            totalQuestions={totalQuestions}
            questions={questions}
            currentIndex={currentIndex}
            onSelect={handleSelect}
          />
        </Grid>
        
        <Grid item xs={12} md={8} lg={9}>
          <QuestionEditor 
            questionData={questions[currentIndex]}
            index={currentIndex}
            totalQuestions={totalQuestions}
            subjectName={subjectName}
            onSaveAndNext={handleSaveAndNext}
            onPrevious={handlePrevious}
            onFinish={handleFinish}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default QuestionWorkspace;
