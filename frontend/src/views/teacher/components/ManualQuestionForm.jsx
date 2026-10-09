import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Stack, Typography, Button } from '@mui/material';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';

const ManualQuestionForm = ({ open, initialData, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    marks: 1,
    difficulty: 'medium',
    topic: '',
    source: 'MANUAL',
  });

  useEffect(() => {
    if (initialData && open) {
      // Normalize options if they are stored as objects
      const normalizedOptions = initialData.options?.map(opt => typeof opt === 'string' ? opt : opt.optionText) || ['', '', '', ''];
      setFormData({
        ...initialData,
        options: normalizedOptions,
        correctAnswer: initialData.correctAnswer || (initialData.options?.find(o => o.isCorrect)?.optionText || ''),
        marks: initialData.marks || initialData.ansmarks || 1
      });
    } else if (open) {
      setFormData({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        marks: 1,
        difficulty: 'medium',
        topic: '',
        source: 'MANUAL',
      });
    }
  }, [initialData, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{initialData ? 'Edit Question' : 'Add Manual Question'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} pt={1}>
          <CustomTextField
            label="Question Text"
            fullWidth
            multiline
            rows={2}
            value={formData.question}
            onChange={(e) => handleChange('question', e.target.value)}
          />
          <Typography variant="subtitle2">Options:</Typography>
          {formData.options.map((opt, i) => (
            <CustomTextField
              key={i}
              label={`Option ${String.fromCharCode(65 + i)}`}
              fullWidth
              value={opt}
              onChange={(e) => handleOptionChange(i, e.target.value)}
            />
          ))}

          <CustomTextField
            label="Correct Answer (Exact text match)"
            fullWidth
            value={formData.correctAnswer}
            onChange={(e) => handleChange('correctAnswer', e.target.value)}
          />

          <Stack direction="row" spacing={2}>
            <CustomTextField
              label="Marks"
              type="number"
              fullWidth
              value={formData.marks}
              onChange={(e) => handleChange('marks', Number(e.target.value))}
            />
            <CustomTextField
              label="Difficulty"
              fullWidth
              value={formData.difficulty}
              onChange={(e) => handleChange('difficulty', e.target.value)}
            />
            <CustomTextField
              label="Topic"
              fullWidth
              value={formData.topic}
              onChange={(e) => handleChange('topic', e.target.value)}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={handleSubmit}>
          Save Question
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualQuestionForm;
