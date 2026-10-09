import React, { useState } from 'react';
import { Box, Typography, Button, Stack, Card, IconButton, Chip } from '@mui/material';
import { IconTrash, IconEdit } from '@tabler/icons-react';
import ManualQuestionForm from './ManualQuestionForm';

const QuestionReviewList = ({ questions, onDelete, onUpdate, onAddManual }) => {
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editIndex, setEditIndex] = useState(-1);

  const handleEditOpen = (question, index) => {
    setEditingQuestion({ ...question });
    setEditIndex(index);
  };

  const handleEditSave = (updatedQuestion) => {
    onUpdate(editIndex, updatedQuestion);
    setEditingQuestion(null);
    setEditIndex(-1);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Current Questions ({questions?.length || 0})</Typography>
        <Button variant="outlined" color="primary" onClick={onAddManual}>
          + Add Manual Question
        </Button>
      </Box>

      <Stack spacing={2}>
        {questions?.map((q, idx) => (
          <Card key={q._id || idx} variant="outlined" sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="h6" mb={1}>
                Q{idx + 1}. {q.question}
              </Typography>
              <Box>
                <IconButton color="primary" onClick={() => handleEditOpen(q, idx)}>
                  <IconEdit size={20} />
                </IconButton>
                <IconButton color="error" onClick={() => onDelete(idx, q._id)}>
                  <IconTrash size={20} />
                </IconButton>
              </Box>
            </Box>

            <Box pl={2} mb={1}>
              {q.options?.map((opt, oIdx) => (
                <Typography
                  key={oIdx}
                  variant="body2"
                  color={opt === (q.correctAnswer || (q.options.find(o => o.isCorrect)?.optionText)) ? "success.main" : "textSecondary"}
                  fontWeight={opt === (q.correctAnswer || (q.options.find(o => o.isCorrect)?.optionText)) ? "bold" : "normal"}
                >
                  {String.fromCharCode(65 + oIdx)}. {typeof opt === 'string' ? opt : opt.optionText} {opt === (q.correctAnswer || (q.options.find(o => o.isCorrect)?.optionText)) && "✓"}
                </Typography>
              ))}
            </Box>
            <Typography variant="caption" color="textSecondary" display="block">
               Marks: {q.marks || q.ansmarks || 1} | Difficulty: {q.difficulty || 'medium'} | Topic: {q.topic || 'N/A'} | Source: {q.source || 'MANUAL'}
            </Typography>
          </Card>
        ))}
        {(!questions || questions.length === 0) && (
          <Typography textAlign="center" color="textSecondary">No questions added yet.</Typography>
        )}
      </Stack>

      {/* Extracted form component serving the edit role */}
      <ManualQuestionForm 
         open={Boolean(editingQuestion)} 
         initialData={editingQuestion} 
         onClose={() => setEditingQuestion(null)}
         onSave={handleEditSave}
      />
    </Box>
  );
};

export default QuestionReviewList;
