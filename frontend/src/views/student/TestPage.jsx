import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Grid, CircularProgress, Typography, Button } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import BlankCard from 'src/components/shared/BlankCard';
import MultipleChoiceQuestion from './Components/MultipleChoiceQuestion';
import NumberOfQuestions from './Components/NumberOfQuestions';
import ProctoringManager from './Components/ProctoringManager';
import ExamCameraSetup from './ExamCameraSetup';
import WebCam from './Components/WebCam';
import { useGetExamsQuery, useGetQuestionsQuery } from '../../slices/examApiSlice';
import {
  useStartSessionMutation,
  useSubmitSessionMutation,
  useTerminateSessionMutation,
} from 'src/slices/sessionApiSlice';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';

const TestPage = () => {
  const { examId } = useParams();
  const [selectedExam, setSelectedExam] = useState(null);
  const [examDurationInSeconds, setExamDurationInSeconds] = useState(0);
  const { data: userExamdata, isLoading: isExamsLoading } = useGetExamsQuery();
  const { userInfo } = useSelector((state) => state.auth);

  const [startSession] = useStartSessionMutation();
  const [submitSessionMutation] = useSubmitSessionMutation();
  const [terminateSessionMutation] = useTerminateSessionMutation();
  
  const [sessionId, setSessionId] = useState(null);
  const [initialFullscreenExitCount, setInitialFullscreenExitCount] = useState(0);
  const [isExamActive, setIsExamActive] = useState(false);
  const webcamRef = useRef(null);
  const mobileVideoRef = useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isMobileSetupComplete, setIsMobileSetupComplete] = useState(false);
  const [laptopCameraReady, setLaptopCameraReady] = useState(false);
  const [laptopCameraError, setLaptopCameraError] = useState('');
  const [cameraRetryKey, setCameraRetryKey] = useState(0);
  const [permissionsError, setPermissionsError] = useState('');
  const [isFullscreenRecovery, setIsFullscreenRecovery] = useState(false);

  const requestPermissions = async () => {
    let permissionStream;
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
      permissionStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      permissionStream.getTracks().forEach((track) => track.stop());
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
        setInitialFullscreenExitCount(res.session.violationSummary?.fullscreenExitCount || 0);
        const savedAnswers = res.session.answers instanceof Map
          ? Object.fromEntries(res.session.answers)
          : (res.session.answers || {});
        setAnswers(savedAnswers);
        
        if (res.session.status === 'TERMINATED' || res.session.status === 'COMPLETED') {
           toast.error('This exam session is permanently locked (Terminated/Completed).');
           navigate(`/exam/${examId}/report/${res.session._id}`);
           return;
        }

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
  }, [
    examId,
    startSession,
    sessionId,
    userInfo,
    permissionsGranted,
    isMobileSetupComplete,
  ]);

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const { data, isLoading } = useGetQuestionsQuery(examId);
  const navigate = useNavigate();

  useEffect(() => {
    if (data) {
      setQuestions(data);
      setCurrentQuestionIndex((index) => Math.min(index, Math.max(data.length - 1, 0)));
    }
  }, [data]);

  const handleTestSubmission = async () => {
    if (isSubmitting || !sessionId) return; // Prevent multiple submissions

    try {
      setIsSubmitting(true);
      setIsExamActive(false);

      const result = await submitSessionMutation({ sessionId, answers }).unwrap();
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
  
  const handleTerminate = async (reason) => {
    toast.error(reason);
    setIsExamActive(false);
    if (sessionId) {
      try {
        await terminateSessionMutation({ sessionId, reason }).unwrap();
      } catch (error) {
        console.error('Failed to persist exam termination:', error);
        toast.error('Termination could not be confirmed by the server.');
      }
    }
    navigate(`/exam/${examId}/report/${sessionId}`);
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
          <Grid container spacing={3} sx={{ width: '100%', maxWidth: 1200 }}>
            <Grid item xs={12} md={6}>
              <BlankCard>
                <Box p={3}>
                  <Typography variant="h5" mb={2}>Step 1: Check laptop camera</Typography>
                  <WebCam
                    key={cameraRetryKey}
                    webcamRef={webcamRef}
                    isActive={false}
                    onCameraReady={() => { setLaptopCameraReady(true); setLaptopCameraError(''); }}
                    onCameraError={(error) => {
                      setLaptopCameraReady(false);
                      setLaptopCameraError(error?.name === 'NotAllowedError'
                        ? 'Allow camera access in your browser, then reload this page.'
                        : 'Laptop camera could not start. Check that it is connected and not in use by another app.');
                    }}
                  />
                  <Typography mt={2} color={laptopCameraReady ? 'success.main' : 'text.secondary'}>
                    {laptopCameraReady ? 'Laptop camera ready' : 'Waiting for laptop camera…'}
                  </Typography>
                  {laptopCameraError && <Typography color="error" role="alert">{laptopCameraError}</Typography>}
                  {laptopCameraError && (
                    <Button sx={{ mt: 1 }} onClick={() => setCameraRetryKey((key) => key + 1)}>
                      Retry laptop camera
                    </Button>
                  )}
                </Box>
              </BlankCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <ExamCameraSetup
                sessionId={sessionId}
                mobileVideoRef={mobileVideoRef}
                isSetupComplete={false}
                laptopCameraReady={laptopCameraReady}
                roughPaperAllowed={selectedExam?.settings?.roughPaperAllowed !== false}
                onSetupSuccess={() => setIsMobileSetupComplete(true)}
              />
            </Grid>
          </Grid>
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
          <Grid item xs={12} md={3} lg={3}>
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
                      questions={questions}
                      answers={answers}
                      currentQuestionIndex={currentQuestionIndex}
                      onQuestionSelect={setCurrentQuestionIndex}
                      submitTest={handleTestSubmission}
                      examDurationInSeconds={examDurationInSeconds}
                      paused={isFullscreenRecovery}
                    />
                  </Box>
                </BlankCard>
              </Grid>
              <Grid item xs={12}>
                <BlankCard>
                  <Box p={2}>
                    <ExamCameraSetup
                      sessionId={sessionId}
                      mobileVideoRef={mobileVideoRef}
                      isSetupComplete={true}
                      roughPaperAllowed={selectedExam?.settings?.roughPaperAllowed !== false}
                      onSetupSuccess={() => {}}
                    />
                  </Box>
                </BlankCard>
              </Grid>
              <Grid item xs={12}>
                <BlankCard>
                  <Box sx={{ width: '100%', minHeight: 150, p: 1 }}>
                    <Typography variant="caption" color="primary" gutterBottom align="center" display="block">
                      <b>Face Camera</b>
                    </Typography>
                    <ProctoringManager
                      initialFullscreenExitCount={initialFullscreenExitCount}
                      sessionId={sessionId}
                      examId={examId}
                      webcamRef={webcamRef}
                      mobileVideoRef={mobileVideoRef}
                      roughPaperAllowed={selectedExam?.settings?.roughPaperAllowed !== false}
                      isActive={isExamActive}
                      onTerminate={handleTerminate}
                      onFullscreenRecoveryChange={setIsFullscreenRecovery}
                    />
                  </Box>
                </BlankCard>
              </Grid>
            </Grid>
          </Grid>

          {/* EXAM QUESTIONS */}
          <Grid item xs={12} md={9} lg={9}>
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
                    questions={questions}
                    currentQuestionIndex={currentQuestionIndex}
                    setCurrentQuestionIndex={setCurrentQuestionIndex}
                    answers={answers}
                    setAnswers={setAnswers}
                    disabled={isFullscreenRecovery}
                  />
                )}
              </Box>
            </BlankCard>
          </Grid>

        </Grid>
      </Box>
    </PageContainer>
  );
};

export default TestPage;
