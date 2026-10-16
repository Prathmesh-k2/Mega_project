import React, { useState } from 'react';
import { Grid, Box, Card, Button } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import CreationMethodSelector from './components/CreationMethodSelector';
import ExamForm from './components/ExamForm';
import AIGeneratorForm from './components/AIGeneratorForm';
import QuestionWorkspace from './components/QuestionWorkspace';
import ExamReview from './components/ExamReview';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { 
  useCreateExamMutation, 
  useGenerateAiQuestionsMutation, 
  useCreateQuestionMutation, 
  useUpdateQuestionMutation,
  usePublishExamMutation 
} from '../../slices/examApiSlice.js';
import { useNavigate } from 'react-router-dom';

const examValidationSchema = yup.object({
  examName: yup.string().required('Exam Name is required'),
  subject: yup.string().required('Subject is required'),
  totalQuestions: yup.number().min(1, 'Minimum 1 question').required('Required'),
  duration: yup.number().min(1, 'Minimum 1 minute').required('Required'),
  liveDate: yup.date().required('Live Date is required'),
  deadDate: yup.date().min(yup.ref('liveDate'), 'End date must be after start date').required('Dead Date is required'),
});

const CreateExamPage = () => {
  const navigate = useNavigate();
  // step constraints: 
  // 1 = Method Selector
  // 2 = Basic Details
  // 3 = Questions (Lists + Generation)
  // 4 = Final Publish Review
  const [step, setStep] = useState(1);
  const [creationMode, setCreationMode] = useState('MANUAL');
  const [examId, setExamId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const [createExam, { isLoading: isCreatingExam }] = useCreateExamMutation();
  const [generateAiQuestions, { isLoading: isGeneratingAi }] = useGenerateAiQuestionsMutation();
  const [createQuestion] = useCreateQuestionMutation();
  const [updateQuestion] = useUpdateQuestionMutation();
  const [publishExam, { isLoading: isPublishing }] = usePublishExamMutation();

  const formik = useFormik({
    initialValues: {
      examName: '',
      subject: '',
      description: '',
      totalQuestions: 10,
      duration: 30,
      liveDate: '',
      deadDate: '',
      settings: { roughPaperAllowed: true },
    },
    validationSchema: examValidationSchema,
    onSubmit: async (values) => {
      try {
        const payload = { ...values, creationMode };
        const examResponse = await createExam(payload).unwrap();
        if (examResponse && examResponse.examId) {
          setExamId(examResponse.examId);
          // Allocate workspace array slots matching totalQuestions explicitly
          setQuestions(new Array(Number(payload.totalQuestions)).fill(null));
          setCurrentQuestionIndex(0);
          toast.success('Exam Details Saved as Draft.');
          setStep(3); 
        }
      } catch (err) {
        toast.error(err?.data?.message || err?.message || 'Failed to create exam');
      }
    },
  });

  const handleModeSelect = (mode) => {
    setCreationMode(mode);
    setStep(2);
  };

  const handleAIGenerate = async (aiPayload) => {
    try {
      const response = await generateAiQuestions({ examId, data: aiPayload }).unwrap();
      if (response && response.questions) {
        const aiQ = response.questions.map(q => ({...q, source: 'AI'}));
        const newQuestions = [...questions];
        
        // Fill slots smoothly from top to bottom
        let aiIndex = 0;
        for (let i = 0; i < newQuestions.length && aiIndex < aiQ.length; i++) {
           if (!newQuestions[i]) {
              newQuestions[i] = aiQ[aiIndex];
              aiIndex++;
           }
        }
        setQuestions(newQuestions);
        toast.success(`AI Generated ${aiIndex} questions matching your empty slots!`);
      }
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'AI Generation Failed');
    }
  };

  const handleWorkspaceUpdate = (index, questionData) => {
    const updatedList = [...questions];
    updatedList[index] = questionData;
    setQuestions(updatedList);
  };

  const handleFinishWorkspace = (finalList) => {
    setQuestions(finalList);
    setStep(4);
  };

  const handleEditFromReview = (index) => {
    // Jump straight back to Step 3 QuestionWorkspace allowing correction precisely at index
    setCurrentQuestionIndex(index);
    setStep(3);
  };

  // Helper function to format options for the backend model
  const formatQuestionPayload = (q) => {
    return {
      ...q,
      examId,
      ansmarks: q.marks,
      options: q.options.map(opt => ({
        optionText: typeof opt === 'string' ? opt : opt.optionText,
        isCorrect: (typeof opt === 'string' ? opt : opt.optionText) === q.correctAnswer
      }))
    };
  };

  // Triggers when clicking standard "Save Draft" in final review
  const handleSaveDraft = async () => {
    try {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q) continue; // safety check
        
        const payload = formatQuestionPayload(q);

        if (!q._id) { 
          const res = await createQuestion(payload).unwrap();
          questions[i]._id = res._id;
        } else {
          await updateQuestion({ questionId: q._id, data: payload }).unwrap();
        }
      }
      toast.success('Draft Saved Successfully.');
      navigate('/admin-dashboard');
    } catch (err) {
      toast.error('Failed to save draft questions.');
    }
  };

  // Triggers publish workflow
  const handlePublish = async () => {
    try {
      // Step A: Sync questions DB mapping cleanly
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q) throw new Error("Missing questions.");
        
        const payload = formatQuestionPayload(q);

        if (!q._id) { 
          const result = await createQuestion(payload).unwrap();
          questions[i]._id = result._id; 
        } else {
          await updateQuestion({ questionId: q._id, data: payload }).unwrap();
        }
      }

      // Step B: Publish the Exam cleanly
      await publishExam(examId).unwrap();
      toast.success('Exam Published Successfully!');
      navigate('/admin-dashboard');
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Publish Failed. (Check total marks and question counts)');
    }
  };

  return (
    <PageContainer title="Create Exam" description="Create a new exam">
      <Box sx={{
        position: 'relative',
        '&:before': {
          content: '""',
          background: 'radial-gradient(#d2f1df, #d3d7fa, #bad8f4)',
          backgroundSize: '400% 400%',
          animation: 'gradient 15s ease infinite',
          position: 'absolute',
          height: '100%',
          width: '100%',
          opacity: '0.3',
        },
        minHeight: '100vh',
        py: 4
      }}>
        <Grid container justifyContent="center">
          <Grid item xs={12} md={11} lg={10}>
            <Card elevation={9} sx={{ p: 4, zIndex: 1 }}>
              
              {step === 1 && (
                <CreationMethodSelector onSelectMode={handleModeSelect} />
              )}

              {step === 2 && (
                <ExamForm 
                  formik={formik} 
                  title="Basic Exam Details" 
                  isSaving={isCreatingExam}
                  onSubmitForm={formik.handleSubmit} 
                />
              )}

              {step === 3 && (
                <Box>
                  {creationMode === 'AI' && (
                    <Box mb={4}>
                       <AIGeneratorForm onSubmit={handleAIGenerate} isLoading={isGeneratingAi} />
                    </Box>
                  )}
                  
                  <QuestionWorkspace 
                    questions={questions}
                    totalQuestions={Number(formik.values.totalQuestions)}
                    subjectName={formik.values.subject}
                    currentIndex={currentQuestionIndex}
                    setCurrentIndex={setCurrentQuestionIndex}
                    onUpdateQuestion={handleWorkspaceUpdate}
                    onFinishWorkspace={handleFinishWorkspace}
                  />

                </Box>
              )}

              {step === 4 && (
                <ExamReview 
                   examDetails={formik.values}
                   questions={questions}
                   onSaveDraft={handleSaveDraft}
                   onPublish={handlePublish}
                   onEditQuestion={handleEditFromReview}
                   isProcessing={isPublishing}
                />
              )}
              
            </Card>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default CreateExamPage;
