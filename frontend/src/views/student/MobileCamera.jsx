import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

// Use the current page's origin so mobile (via ngrok) connects correctly
const SERVER_URL = window.location.origin;

export default function MobileCamera() {
  const { token } = useParams();
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const candidateQueue = useRef([]);
  const [status, setStatus] = useState("Connecting...");

  useEffect(() => {
    let stream;

    async function start() {
      try {
        if (!window.isSecureContext) {
           throw new Error("INSECURE_CONTEXT");
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
           throw new Error("UNSUPPORTED_BROWSER");
        }

        // Rear camera is preferred for the wider desk/room view.
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const socket = io(SERVER_URL);
        socketRef.current = socket;

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" }
          ]
        });

        pcRef.current = pc;
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("webrtc-ice", {
              token,
              candidate: event.candidate
            });
          }
        };

        pc.onconnectionstatechange = () => {
          setStatus(
            pc.connectionState === "connected"
              ? "Camera connected to laptop"
              : `Connection: ${pc.connectionState}`
          );
        };

        socket.on("connect", () => {
          socket.emit("join-mobile-camera", { token });
        });

        socket.on("mobile-camera-joined", async () => {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit("webrtc-offer", {
              token,
              offer: pc.localDescription
            });

            setStatus("Pairing with laptop...");
          } catch (error) {
            console.error(error);
            setStatus("Could not create video connection.");
          }
        });

        socket.on("webrtc-answer", async ({ answer }) => {
          try {
            await pc.setRemoteDescription(answer);

            for (const candidate of candidateQueue.current) {
              await pc.addIceCandidate(candidate);
            }
            candidateQueue.current = [];
          } catch (error) {
            console.error(error);
            setStatus("Could not complete video connection.");
          }
        });

        socket.on("webrtc-ice", async ({ candidate }) => {
          if (!candidate) return;

          try {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(candidate);
            } else {
              candidateQueue.current.push(candidate);
            }
          } catch (error) {
            console.error(error);
          }
        });

        socket.on("camera-error", (message) => {
          setStatus(message);
        });
      } catch (error) {
        console.error("Camera Setup Error:", error);
        
        let errorMessage = "Camera access failed. Check browser permission and HTTPS.";
        
        if (error.message === "INSECURE_CONTEXT") {
           errorMessage = "HTTPS Required: Mobile browsers block the camera on unsecure connections. Please ensure you are scanning a secure link.";
        } else if (error.message === "UNSUPPORTED_BROWSER") {
           errorMessage = "Your browser does not support camera access or the permissions are entirely locked.";
        } else if (error.name === "NotAllowedError") {
           errorMessage = "Permission Denied: Please open your browser settings, clear site settings, and allow Camera access.";
        } else if (error.name === "NotFoundError") {
           errorMessage = "No camera found on your device.";
        } else if (error.name === "NotReadableError") {
           errorMessage = "Hardware Error: Your camera is already in use by another app or tab.";
        }
        
        setStatus(errorMessage);
      }
    }

    start();

    return () => {
      socketRef.current?.disconnect();
      pcRef.current?.close();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [token]);

  return (
    <main style={{ padding: 20, textAlign: "center" }}>
      <h2>Exam Secondary Camera</h2>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: "100%", maxWidth: 480 }}
      />
      <p>{status}</p>
      <p>Keep the phone stable and the camera pointed at your desk and workspace.</p>
    </main>
  );
}
