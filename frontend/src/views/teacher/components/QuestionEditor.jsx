import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Stack, MenuItem, Paper, Alert } from '@mui/material';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';

const QuestionEditor = ({ questionData, index, totalQuestions, onSaveAndNext, onPrevious, onFinish, subjectName }) => {
  const [formData, setFormData] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    marks: 1,
    difficulty: 'medium',
    topic: subjectName || 'General',
    source: 'MANUAL',
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (questionData) {
      const normalizedOptions = questionData.options?.map(opt => typeof opt === 'string' ? opt : opt.optionText) || ['', '', '', ''];
      setFormData({
        ...questionData,
        options: normalizedOptions,
        correctAnswer: questionData.correctAnswer || (questionData.options?.find(o => o.isCorrect)?.optionText || ''),
        marks: questionData.marks || questionData.ansmarks || 1
      });
    } else {
      setFormData({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        marks: 1,
        difficulty: 'medium',
        topic: subjectName || 'General',
        source: 'MANUAL',
      });
    }
    setError(null);
  }, [questionData, index, subjectName]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOptionChange = (idx, value) => {
    const newOptions = [...formData.options];
    newOptions[idx] = value;
    const oldVal = formData.options[idx];
    
    // Auto-update correct answer if it matches the edited option precisely 
    let newCorrect = formData.correctAnswer;
    if (newCorrect === oldVal && oldVal !== '') {
      newCorrect = value;
    }
    
    setFormData(prev => ({ ...prev, options: newOptions, correctAnswer: newCorrect }));
  };

  const validate = () => {
    if (!formData.question || !formData.question.trim()) return "Question text is required.";
    const hasEmptyOption = formData.options.some(opt => !opt || !opt.trim());
    if (hasEmptyOption) return "All 4 options must be filled.";
    if (!formData.correctAnswer || !formData.correctAnswer.trim()) return "Please select a correct answer.";
    if (!formData.options.includes(formData.correctAnswer)) return "Correct answer must perfectly match one of the options.";
    if (!formData.marks || formData.marks <= 0) return "Marks must be a positive number.";
    return null;
  };

  const handleSaveAndNext = () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    onSaveAndNext(formData);
  };

  const handleFinish = () => {
    const err = validate();
    if (err) {
      setError("Please complete this question before finishing, or navigate back and finish later.");
      return;
    }
    onFinish(formData);
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 }, display: 'flex', flexDirection: 'column' }}>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h5">Question {index + 1} of {totalQuestions}</Typography>
        <Typography variant="body2" color="textSecondary">Source: {formData.source}</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={3} sx={{ flexGrow: 1 }}>
        <CustomTextField
          label="Question"
          fullWidth
          multiline
          rows={3}
          value={formData.question}
          onChange={(e) => handleChange('question', e.target.value)}
        />
        
        <Box>
           <Typography variant="subtitle2" mb={1} color="textSecondary">Options:</Typography>
           <Stack spacing={2}>
             {formData.options.map((opt, i) => (
               <CustomTextField
                 key={`opt-${i}`}
                 label={`Option ${String.fromCharCode(65 + i)}`}
                 fullWidth
                 value={opt}
                 onChange={(e) => handleOptionChange(i, e.target.value)}
               />
             ))}
           </Stack>
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
           <CustomTextField
             select
             label="Correct Answer"
             fullWidth
             value={formData.correctAnswer}
             onChange={(e) => handleChange('correctAnswer', e.target.value)}
           >
              {formData.options.map((opt, i) => (
                 <MenuItem key={`corr-${i}`} value={opt} disabled={!opt.trim()}>
                    {opt.trim() ? `Option ${String.fromCharCode(65 + i)}: ${opt}` : `Option ${String.fromCharCode(65 + i)}`}
                 </MenuItem>
              ))}
           </CustomTextField>
           <CustomTextField
              label="Marks"
              type="number"
              fullWidth
              value={formData.marks}
              onChange={(e) => handleChange('marks', Number(e.target.value))}
           />
        </Stack>

        <Stack direction="row" spacing={3}>
            <CustomTextField
              label="Difficulty (Optional)"
              fullWidth
              value={formData.difficulty}
              onChange={(e) => handleChange('difficulty', e.target.value)}
            />
            <CustomTextField
              label="Topic (Optional)"
              fullWidth
              value={formData.topic}
              onChange={(e) => handleChange('topic', e.target.value)}
            />
        </Stack>
      </Stack>

      <Box display="flex" justifyContent="space-between" mt={5} p={2} borderTop="1px solid #eee" bgcolor="background.paper" sticky="bottom" sx={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
        <Button variant="outlined" disabled={index === 0} onClick={onPrevious}>
          ← Previous
        </Button>
        
        {index < totalQuestions - 1 ? (
          <Button variant="contained" color="primary" onClick={handleSaveAndNext}>
            Save Question & Next →
          </Button>
        ) : (
          <Button variant="contained" color="success" onClick={handleFinish}>
            Save Question & Review →
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default QuestionEditor;
