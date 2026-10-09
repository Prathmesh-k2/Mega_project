import React from 'react';
import { Box, Typography, Stack, Card, CardActionArea } from '@mui/material';

const CreationMethodSelector = ({ onSelectMode }) => {
  return (
    <Box textAlign="center">
      <Typography variant="h3" mb={4}>Create New Exam</Typography>
      <Typography variant="h6" mb={2}>How do you want to create your exam?</Typography>
      
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center" mt={3}>
        <Card variant="outlined" sx={{ flex: 1, '&:hover': { borderColor: 'primary.main', borderStyle: 'solid', borderWidth: 2 } }}>
          <CardActionArea sx={{ p: 4, height: '100%', textAlign: 'center' }} onClick={() => onSelectMode('MANUAL')}>
            <Typography variant="h4" mb={2}>📝 Manual Creation</Typography>
            <Typography color="textSecondary" mb={1}>Create questions manually</Typography>
            <Typography color="textSecondary" mb={3}>Full control over every question</Typography>
            <Typography variant="subtitle2" color="primary">Click to continue →</Typography>
          </CardActionArea>
        </Card>
        
        <Card variant="outlined" sx={{ flex: 1, '&:hover': { borderColor: 'secondary.main', borderStyle: 'solid', borderWidth: 2 } }}>
          <CardActionArea sx={{ p: 4, height: '100%', textAlign: 'center' }} onClick={() => onSelectMode('AI')}>
            <Typography variant="h4" mb={2}>✨ AI Exam Generator</Typography>
            <Typography color="textSecondary" mb={1}>Generate questions using Groq AI</Typography>
            <Typography color="textSecondary" mb={3}>Review and edit before publishing</Typography>
            <Typography variant="subtitle2" color="secondary">Click to continue →</Typography>
          </CardActionArea>
        </Card>
      </Stack>
    </Box>
  );
};

export default CreationMethodSelector;
