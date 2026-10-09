import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import { Box, Button, Typography, Card, CircularProgress } from "@mui/material";
import useCheatDetection from "../../hooks/useCheatDetection";

const SERVER_URL = window.location.origin;

const MOBILE_BASE_URL =
  process.env.REACT_APP_MOBILE_CAMERA_BASE_URL ||
  window.location.origin;

// Global context preserves the WebRTC connection when TestPage unmounts/remounts the setup component
let globalContext = {
  socket: null,
  pc: null,
  token: "",
  mobileConnected: false,
  status: "Connect your secondary mobile camera",
  stream: null,
  candidateQueue: [],
  notify: () => {}
};

export default function ExamCameraSetup({ sessionId, isSetupComplete, onSetupSuccess, onViolation }) {
  const [, forceRender] = useState({});
  const videoRef = useRef(null);

  // Default violation handler maps to our custom DOM event if not provided
  const handleViolation = onViolation || ((v) => { window.dispatchEvent(new CustomEvent('exam-violation', { detail: v })); });

  // Initialize unified 1 FPS background AI cheating detection for Mobile Feeds
  // We only run this detection during the active exam phase (`isSetupComplete === true`)
  useCheatDetection(videoRef, handleViolation, isSetupComplete && globalContext.mobileConnected, 'Mobile Desk Camera');

  useEffect(() => {
    // Bind the global updater to this specific mounted instance
    globalContext.notify = () => forceRender({});

    if (!globalContext.socket) {
      const s = io(SERVER_URL);
      globalContext.socket = s;

      // We need a helper to generate a fresh RTCPeerConnection
      const createPeerConnection = () => {
        if (globalContext.pc) {
           globalContext.pc.close();
        }
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
          ]
        });
        globalContext.pc = pc;

        pc.ontrack = (event) => {
          globalContext.stream = event.streams[0];
          if (videoRef.current) {
            videoRef.current.srcObject = globalContext.stream;
          }
          globalContext.notify();
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            s.emit("webrtc-ice", {
              token: globalContext.token,
              candidate: event.candidate
            });
          }
        };

        pc.onconnectionstatechange = () => {
          const connected = pc.connectionState === "connected";
          globalContext.mobileConnected = connected;
          globalContext.status = connected
            ? "Secondary Mobile Camera Connected"
            : `Mobile video connecting... (${pc.connectionState})`;
            
          if (pc.connectionState === "failed") {
            globalContext.status = "Connection blocked by network firewall (WebRTC Failed). Try same Wi-Fi.";
          }
          globalContext.notify();
        };
        return pc;
      };

      // Initially create one
      createPeerConnection();

      s.on("mobile-token-created", ({ token }) => {
        globalContext.token = token;
        globalContext.notify();
      });

      s.on("mobile-camera-connected", () => {
        globalContext.status = "Mobile paired; establishing secure WebRTC video feed...";
        // If we reconnect, make a fresh PC to avoid "Wrong State" errors
        createPeerConnection(); 
        globalContext.notify();
      });

      s.on("mobile-camera-disconnected", () => {
        globalContext.mobileConnected = false;
        globalContext.status = "Mobile disconnected. Please leave the phone stable.";
        globalContext.notify();
      });

      s.on("webrtc-offer", async ({ token: incomingToken, offer }) => {
        globalContext.token = incomingToken;
        const pc = globalContext.pc;
        try {
          await pc.setRemoteDescription(offer);
          for (const candidate of globalContext.candidateQueue) {
            await pc.addIceCandidate(candidate);
          }
          globalContext.candidateQueue = [];

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          s.emit("webrtc-answer", {
            token: incomingToken,
            answer: pc.localDescription
          });
        } catch (error) {
          console.error("WebRTC negotiation failed:", error);
          globalContext.status = "Video connection failed. Please restart flow.";
          globalContext.notify();
        }
      });

      s.on("webrtc-ice", async ({ candidate }) => {
        if (!candidate) return;
        const pc = globalContext.pc;
        if (!pc) return;
        try {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(candidate);
          } else {
            globalContext.candidateQueue.push(candidate);
          }
        } catch (error) {
          console.error("ICE candidate error:", error);
        }
      });

      s.on("camera-error", (message) => {
        globalContext.status = message;
        globalContext.notify();
      });
    } else {
      // If we remounted, just hook up the existing stream to the new video tag!
      if (videoRef.current && globalContext.stream) {
        videoRef.current.srcObject = globalContext.stream;
      }
    }

    // Do NOT disconnect on unmount! We want the stream to survive into the Exam Phase.
    return () => {
      globalContext.notify = () => {};
    };
  }, []);

  useEffect(() => {
    // Auto-generate token if not already generated
    if (globalContext.socket && !isSetupComplete && !globalContext.token) {
      globalContext.socket.emit("create-mobile-token", { sessionId });
    }
  }, [sessionId, isSetupComplete]);

  const mobileUrl = globalContext.token
    ? `${MOBILE_BASE_URL}/mobile-camera/${globalContext.token}`
    : "";

  if (isSetupComplete) {
    return (
      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="caption" color="primary" gutterBottom><b>Mobile Camera Feed</b></Typography>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", borderRadius: '8px', border: globalContext.mobileConnected ? '2px solid #4CAF50' : '2px solid #f44336' }}
        />
        {!globalContext.mobileConnected && <Typography variant="caption" color="error">Reconnecting...</Typography>}
      </Box>
    );
  }

  return (
    <Card variant="outlined" sx={{ maxWidth: 600, margin: "auto", mt: 4, p: 4, textAlign: 'center' }}>
      <Typography variant="h3" gutterBottom>Step 2: Connect Secondary Camera</Typography>
      <Typography variant="body1" color="textSecondary" mb={3}>
        To prevent blind spots during the exam, you must pair your smartphone as a secondary desk camera using the QR code below. Look at the code with your phone camera.
      </Typography>

      {globalContext.token ? (
        <Box mb={4} p={3} sx={{ backgroundColor: '#f5f5f5', borderRadius: '12px', display: 'inline-block' }}>
          <QRCodeSVG value={mobileUrl} size={220} />
        </Box>
      ) : (
        <CircularProgress sx={{ mb: 4 }} />
      )}

      <Box mb={3} p={2} sx={{ backgroundColor: '#222', borderRadius: '8px', border: globalContext.mobileConnected ? '3px solid #4CAF50' : '1px solid #555' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", maxWidth: 480 }}
        />
      </Box>

      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, color: globalContext.mobileConnected ? 'success.main' : 'warning.main' }}>
        Status: {globalContext.status}
      </Typography>

      <Button
        variant="contained"
        color="primary"
        size="large"
        fullWidth
        disabled={!globalContext.mobileConnected}
        onClick={() => onSetupSuccess?.()}
      >
        {globalContext.mobileConnected ? "Start Exam Now" : "Waiting for Mobile Camera..."}
      </Button>
    </Card>
  );
}
