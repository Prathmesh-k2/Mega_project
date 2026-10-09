import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Grid, CircularProgress, Typography } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import BlankCard from 'src/components/shared/BlankCard';
import MultipleChoiceQuestion from './Components/MultipleChoiceQuestion';
import NumberOfQuestions from './Components/NumberOfQuestions';
import ProctoringManager from './Components/ProctoringManager';
import ExamCameraSetup from './ExamCameraSetup';
import { useGetExamsQuery, useGetQuestionsQuery } from '../../slices/examApiSlice';
import { useStartSessionMutation, useSubmitSessionMutation } from 'src/slices/sessionApiSlice';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';

const TestPage = () => {
  const { examId, testId } = useParams();
  const [selectedExam, setSelectedExam] = useState(null);
  const [examDurationInSeconds, setExamDurationInSeconds] = useState(0);
  const { data: userExamdata, isLoading: isExamsLoading } = useGetExamsQuery();
  const { userInfo } = useSelector((state) => state.auth);
  
  const [startSession] = useStartSessionMutation();
  const [submitSessionMutation] = useSubmitSessionMutation();
  
  const [sessionId, setSessionId] = useState(null);
  const [isExamActive, setIsExamActive] = useState(false);
  const webcamRef = useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMcqCompleted, setIsMcqCompleted] = useState(false);

  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isMobileSetupComplete, setIsMobileSetupComplete] = useState(false);
  const [permissionsError, setPermissionsError] = useState('');

  const requestPermissions = async () => {
    try {
      setPermissionsError('');

      // Request Fullscreen IMMEDIATELY on click to preserve the user gesture context
      try {
        const el = document.documentElement;
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        }
      } catch (fsErr) {
        setPermissionsError('Fullscreen access is required to take this exam. Please allow the browser to enter Fullscreen.');
        return; // Halt if fullscreen is denied
      }

      // Request both audio and video
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // We no longer stop the tracks here. The <Webcam> component will properly manage the active stream.
      // If we stop it, the webcam tag sometimes renders a black screen causing the AI to fail face detection.
      
      setPermissionsGranted(true);
    } catch (err) {
      console.error('Permission error:', err);
      setPermissionsError(
        'Camera and Microphone access are required to start the exam. Please click Allow in your browser address bar.'
      );
    }
  };

  useEffect(() => {
    if (userExamdata) {
      const exam = userExamdata.find((exam) => exam.examId === examId);
      if (exam) {
        setSelectedExam(exam);
        setExamDurationInSeconds(exam.duration);
        console.log('Exam duration (minutes):', exam.duration);
      }
    }
  }, [userExamdata, examId]);

  useEffect(() => {
    if (!examId || sessionId || !userInfo || !permissionsGranted || !isMobileSetupComplete) return;

    const initSession = async () => {
      try {
        const res = await startSession({
          examId,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
          }
        }).unwrap();
        
        setSessionId(res.session._id);
        setIsExamActive(true);
        if (res.resumed) {
          toast.info('Session resumed.');
          if (res.timeLeftSeconds) {
             setExamDurationInSeconds(res.timeLeftSeconds / 60);
          }
        } else {
          toast.success('Exam session started.');
        }
      } catch (err) {
        console.error('Failed to start session:', err);
        toast.error('Could not start exam session');
      }
    };

    initSession();
  }, [examId, startSession, sessionId, userInfo]);

  const [questions, setQuestions] = useState([]);
  const { data, isLoading } = useGetQuestionsQuery(examId);
  const [score, setScore] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (data) {
      setQuestions(data);
    }
  }, [data]);

  const handleMcqCompletion = () => {
    // Bypass the coding test and just submit
    handleTestSubmission();
  };

  const handleTestSubmission = async () => {
    if (isSubmitting || !sessionId) return; // Prevent multiple submissions

    try {
      setIsSubmitting(true);
      setIsExamActive(false);

      const result = await submitSessionMutation({ sessionId, answers: {} }).unwrap();
      console.log('Session submitted:', result);

      toast.success('Test submitted successfully!');
      navigate(`/exam/${examId}/report/${sessionId}`);
    } catch (error) {
      console.error('Error submitting session:', error);
      toast.error(
        error?.data?.message || 'Failed to submit exam. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleTerminate = (reason) => {
    toast.error(reason);
    setIsExamActive(false);
    navigate(`/exam/${examId}/report/${sessionId}`);
  };

  const saveUserTestScore = () => {
    setScore(score + 1);
  };

  if (isExamsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!permissionsGranted) {
    return (
      <PageContainer title="Exam Setup" description="Permission Check">
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          minHeight="100vh" 
          flexDirection="column"
          textAlign="center"
          sx={{ p: 4 }}
        >
          <img src="/assets/images/backgrounds/security.svg" alt="Security" width="150" style={{ marginBottom: '2rem' }} />
          <Typography variant="h3" gutterBottom>System Check</Typography>
          <Typography variant="body1" mb={3} maxWidth="500px" color="textSecondary">
            This is a secure proctored exam. To maintain academic integrity, you must grant access to your <b>Camera</b> and <b>Microphone</b>. The system will log behavior anomalies. 
          </Typography>
          {permissionsError && (
             <Box mb={3} maxWidth="500px">
                <div style={{ color: 'red', backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '8px' }}>
                   {permissionsError}
                </div>
             </Box>
          )}
          <button 
             onClick={requestPermissions}
             style={{
               padding: '12px 24px',
               fontSize: '16px',
               backgroundColor: '#1976d2',
               color: 'white',
               border: 'none',
               borderRadius: '4px',
               cursor: 'pointer'
             }}
          >
            Grant Permissions & Continue
          </button>
        </Box>
      </PageContainer>
    );
  }

  // Pre-Exam Hardware Setup Phase
  if (!isMobileSetupComplete) {
    return (
      <PageContainer title="Hardware Setup" description="Mobile Camera Setup">
        <Box pt="3rem" display="flex" justifyContent="center">
          <ExamCameraSetup 
            sessionId={sessionId} 
            isSetupComplete={false} 
            onSetupSuccess={() => setIsMobileSetupComplete(true)} 
          />
        </Box>
      </PageContainer>
    );
  }

  // Active Exam Phase
  return (
    <PageContainer title="TestPage" description="This is TestPage">
      <Box pt="3rem">
        <Grid container spacing={3}>
          {/* LEFT: NAVIGATION & TIMER */}
          <Grid item xs={12} md={2} lg={2}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <BlankCard>
                  <Box
                    maxHeight="600px"
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'start',
                      overflowY: 'auto',
                      height: '100%',
                      p: 2
                    }}
                  >
                    <NumberOfQuestions
                      questionLength={questions.length}
                      submitTest={handleTestSubmission}
                      examDurationInSeconds={examDurationInSeconds}
                    />
                  </Box>
                </BlankCard>
              </Grid>
            </Grid>
          </Grid>

          {/* CENTER: EXAM QUESTIONS */}
          <Grid item xs={12} md={8} lg={8}>
            <BlankCard>
              <Box
                width="100%"
                minHeight="400px"
                boxShadow={3}
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
              >
                {isLoading ? (
                  <CircularProgress />
                ) : (
                  <MultipleChoiceQuestion
                    submitTest={handleTestSubmission}
                    questions={data}
                    saveUserTestScore={saveUserTestScore}
                    sessionId={sessionId}
                  />
                )}
              </Box>
            </BlankCard>
          </Grid>

          {/* RIGHT: CAMERA FEEDS (MOBILE & LAPTOP) */}
          <Grid item xs={12} md={2} lg={2}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <BlankCard>
                  <Box p={2}>
                    <ExamCameraSetup 
                      sessionId={sessionId} 
                      isSetupComplete={true} 
                      onSetupSuccess={() => {}} 
                    />
                  </Box>
                </BlankCard>
              </Grid>
              
              <Grid item xs={12}>
                <BlankCard>
                  <Box
                    sx={{ width: '100%', height: 'auto', minHeight: 200, p: 2 }}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexDirection="column"
                  >
                    <Typography variant="caption" color="primary" gutterBottom align="center"><b>Laptop Camera Feed</b></Typography>
                    <ProctoringManager 
                       sessionId={sessionId} 
                       examId={examId}
                       webcamRef={webcamRef} 
                       isActive={isExamActive} 
                       onTerminate={handleTerminate} 
                    />
                  </Box>
                </BlankCard>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default TestPage;
