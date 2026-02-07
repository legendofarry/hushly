import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserProfile } from "../types";
import AppImage from "../components/AppImage";
import {
  uploadAudioToCloudinary,
  uploadToCloudinary,
} from "../services/cloudinaryService";
import {
  listenToConversation,
  listenToMessages,
  markConversationRead,
  sendMessage as sendChatMessage,
} from "../services/chatService";
import {
  addVideoCallCandidate,
  createVideoCall,
  listenToIncomingVideoCalls,
  listenToVideoCall,
  listenToVideoCallCandidates,
  updateVideoCall,
  type VideoCallRecord,
} from "../services/videoCallService";
import { markNotificationsReadByConversation } from "../services/notificationService";
import {
  getIceBreakers,
  getSmartReplies,
  summarizeConversation,
} from "../services/aiService";

interface Props {
  user: UserProfile;
}

type MaskStyle = "visor" | "pixel" | "holo" | "noir";

const MASK_OPTIONS: { id: MaskStyle; label: string }[] = [
  { id: "visor", label: "Neon" },
  { id: "pixel", label: "Pixel" },
  { id: "holo", label: "Holo" },
  { id: "noir", label: "Noir" },
];

const VIDEO_CALL_ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const ChatDetailPage: React.FC<Props> = ({ user }) => {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [showVideoConfirm, setShowVideoConfirm] = useState(false);
  const [callState, setCallState] = useState<
    "idle" | "calling" | "incoming" | "in-call"
  >("idle");
  const [incomingCall, setIncomingCall] = useState<VideoCallRecord | null>(
    null,
  );
  const [activeCall, setActiveCall] = useState<VideoCallRecord | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [maskEnabled, setMaskEnabled] = useState(false);
  const [maskMode, setMaskMode] = useState<"mask" | "blur">("mask");
  const [maskStyle, setMaskStyle] = useState<MaskStyle>("visor");
  const [maskNotice, setMaskNotice] = useState<string | null>(null);
  const [audioDurations, setAudioDurations] = useState<Record<string, string>>(
    {},
  );
  const [previewDuration, setPreviewDuration] = useState("0:00");
  const [pendingAudio, setPendingAudio] = useState<{
    blob: Blob;
    url: string;
    context: {
      conversationId: string;
      recipientId: string;
      recipientNickname: string;
    };
  } | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const videoSenderRef = useRef<RTCRtpSender | null>(null);
  const callUnsubscribeRef = useRef<(() => void) | null>(null);
  const candidatesUnsubscribeRef = useRef<(() => void) | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskVideoRef = useRef<HTMLVideoElement | null>(null);
  const maskStreamRef = useRef<MediaStream | null>(null);
  const maskAnimationRef = useRef<number | null>(null);
  const maskDetectIntervalRef = useRef<number | null>(null);
  const maskPipelineActiveRef = useRef(false);
  const maskStartLockRef = useRef(false);
  const maskStyleRef = useRef<MaskStyle>("visor");
  const maskModeRef = useRef<"mask" | "blur">("mask");
  const facesRef = useRef<any[]>([]);
  const maskMissCountRef = useRef(0);
  const faceDetectorRef = useRef<any>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingContextRef = useRef<{
    conversationId: string;
    recipientId: string;
    recipientNickname: string;
  } | null>(null);
  const [aiTone, setAiTone] = useState("warm");
  const [aiReplies, setAiReplies] = useState<string[]>([]);
  const [aiIceBreakers, setAiIceBreakers] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const callStateRef = useRef(callState);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    maskStyleRef.current = maskStyle;
  }, [maskStyle]);

  useEffect(() => {
    maskModeRef.current = maskMode;
  }, [maskMode]);

  const formatDuration = (rawSeconds: number) => {
    if (!Number.isFinite(rawSeconds) || rawSeconds <= 0) return "0:00";
    const totalSeconds = Math.round(rawSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatMessageTime = (value: any) => {
    const date =
      typeof value?.toDate === "function"
        ? value.toDate()
        : value?.toMillis
          ? new Date(value.toMillis())
          : typeof value === "number"
            ? new Date(value)
            : value instanceof Date
              ? value
              : null;
    if (!date || Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const saveAudioDuration = (messageId: string, duration: number) => {
    if (!Number.isFinite(duration) || duration <= 0) return;
    setAudioDurations((prev) =>
      prev[messageId]
        ? prev
        : {
            ...prev,
            [messageId]: formatDuration(duration),
          },
    );
  };

  const getVideoSender = () => {
    if (videoSenderRef.current) return videoSenderRef.current;
    const sender =
      peerConnectionRef.current?.getSenders().find((s) => s.track?.kind === "video") ??
      null;
    videoSenderRef.current = sender;
    return sender;
  };

  const stopMaskPipeline = (resetState = false) => {
    if (maskAnimationRef.current) {
      window.cancelAnimationFrame(maskAnimationRef.current);
      maskAnimationRef.current = null;
    }
    if (maskDetectIntervalRef.current) {
      window.clearInterval(maskDetectIntervalRef.current);
      maskDetectIntervalRef.current = null;
    }
    maskPipelineActiveRef.current = false;
    maskMissCountRef.current = 0;
    facesRef.current = [];

    const stream = maskStreamRef.current;
    if (stream) {
      stream.getVideoTracks().forEach((track) => track.stop());
    }
    maskStreamRef.current = null;

    if (maskVideoRef.current) {
      maskVideoRef.current.pause();
      maskVideoRef.current.srcObject = null;
    }

    if (resetState) {
      setMaskEnabled(false);
      setMaskMode("mask");
      setMaskNotice(null);
    }
  };

  const drawMaskOverlay = (
    ctx: CanvasRenderingContext2D,
    box: { x: number; y: number; width: number; height: number },
    style: MaskStyle,
  ) => {
    const x = box.x;
    const y = box.y;
    const w = box.width;
    const h = box.height;

    switch (style) {
      case "visor": {
        const visorHeight = h * 0.32;
        const visorY = y + h * 0.28;
        const gradient = ctx.createLinearGradient(x, visorY, x + w, visorY);
        gradient.addColorStop(0, "rgba(255, 0, 128, 0.7)");
        gradient.addColorStop(1, "rgba(157, 0, 255, 0.7)");
        ctx.save();
        ctx.shadowColor = "rgba(255, 0, 128, 0.8)";
        ctx.shadowBlur = 12;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        if ("roundRect" in ctx) {
          (ctx as any).roundRect(x, visorY, w, visorHeight, visorHeight * 0.45);
        } else {
          ctx.rect(x, visorY, w, visorHeight);
        }
        ctx.fill();
        ctx.restore();
        break;
      }
      case "pixel": {
        ctx.save();
        ctx.globalAlpha = 0.8;
        const block = Math.max(6, Math.round(w / 8));
        for (let px = x; px < x + w; px += block) {
          for (let py = y; py < y + h; py += block) {
            const shade = ((px + py) % 3) * 50;
            ctx.fillStyle = `rgba(${80 + shade}, ${20 + shade}, 160, 0.6)`;
            ctx.fillRect(px, py, block - 1, block - 1);
          }
        }
        ctx.restore();
        break;
      }
      case "holo": {
        ctx.save();
        ctx.strokeStyle = "rgba(0, 255, 255, 0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w * 0.55, h * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 0, 128, 0.7)";
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.2, w * 0.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case "noir":
      default: {
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(x, y + h * 0.25, w, h * 0.3);
        ctx.fillRect(x, y + h * 0.6, w, h * 0.18);
        ctx.restore();
        break;
      }
    }
  };

  const startMaskPipeline = async () => {
    if (maskPipelineActiveRef.current || maskStartLockRef.current) return;
    maskStartLockRef.current = true;
    setMaskNotice(null);

    const rawStream = localStreamRef.current;
    if (!rawStream) {
      setMaskNotice("Camera is not ready.");
      setMaskEnabled(false);
      maskStartLockRef.current = false;
      return;
    }
    const rawVideoTrack = rawStream.getVideoTracks()[0];
    if (!rawVideoTrack) {
      setMaskNotice("Camera is not ready.");
      setMaskEnabled(false);
      maskStartLockRef.current = false;
      return;
    }

    const video = maskVideoRef.current ?? document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = rawStream;
    maskVideoRef.current = video;

    try {
      await video.play();
    } catch (error) {
      console.error(error);
    }

    if (video.readyState < 2) {
      await new Promise((resolve) => {
        const handler = () => {
          video.removeEventListener("loadedmetadata", handler);
          resolve(true);
        };
        video.addEventListener("loadedmetadata", handler);
        window.setTimeout(resolve, 500);
      });
    }

    const width = video.videoWidth || rawVideoTrack.getSettings().width || 640;
    const height = video.videoHeight || rawVideoTrack.getSettings().height || 480;

    const canvas = maskCanvasRef.current ?? document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    maskCanvasRef.current = canvas;

    if (!canvas.captureStream) {
      setMaskNotice("Face masks are not supported on this device.");
      setMaskEnabled(false);
      maskStartLockRef.current = false;
      return;
    }

    let nextMode: "mask" | "blur" = "mask";
    const FaceDetectorImpl = (window as any).FaceDetector;
    if (!FaceDetectorImpl) {
      nextMode = "blur";
      setMaskNotice("Face masks unavailable. Using blur.");
    } else if (!faceDetectorRef.current) {
      try {
        faceDetectorRef.current = new FaceDetectorImpl({
          fastMode: true,
          maxDetectedFaces: 1,
        });
      } catch (error) {
        console.error(error);
        nextMode = "blur";
        setMaskNotice("Face masks unavailable. Using blur.");
      }
    }

    setMaskMode(nextMode);
    maskModeRef.current = nextMode;

    const outputStream = canvas.captureStream(30);
    rawStream.getAudioTracks().forEach((track) => outputStream.addTrack(track));
    maskStreamRef.current = outputStream;

    maskPipelineActiveRef.current = true;
    setLocalStream(outputStream);

    const sender = getVideoSender();
    const maskedTrack = outputStream.getVideoTracks()[0];
    if (sender && maskedTrack) {
      try {
        await sender.replaceTrack(maskedTrack);
      } catch (error) {
        console.error(error);
      }
    } else if (peerConnectionRef.current && maskedTrack) {
      videoSenderRef.current = peerConnectionRef.current.addTrack(
        maskedTrack,
        outputStream,
      );
    }

    if (faceDetectorRef.current) {
      maskDetectIntervalRef.current = window.setInterval(async () => {
        if (!maskVideoRef.current) return;
        try {
          const faces = await faceDetectorRef.current.detect(maskVideoRef.current);
          facesRef.current = faces ?? [];
          if (facesRef.current.length === 0) {
            maskMissCountRef.current += 1;
            if (maskModeRef.current === "mask" && maskMissCountRef.current >= 8) {
              maskModeRef.current = "blur";
              setMaskMode("blur");
              setMaskNotice("Face not detected. Using blur.");
            }
          } else {
            maskMissCountRef.current = 0;
          }
        } catch (error) {
          console.error(error);
        }
      }, 180);
    }

    const drawFrame = () => {
      if (!maskPipelineActiveRef.current || !maskCanvasRef.current) return;
      const ctx = maskCanvasRef.current.getContext("2d");
      const source = maskVideoRef.current;
      if (!ctx || !source) {
        maskAnimationRef.current = window.requestAnimationFrame(drawFrame);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (maskModeRef.current === "blur") {
        const faces = facesRef.current;
        if (faces.length === 0) {
          ctx.save();
          ctx.filter = "blur(14px)";
          ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
          ctx.restore();
        } else {
          ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.filter = "blur(16px)";
          faces.forEach((face: any) => {
            const box = face.boundingBox ?? face;
            const fx = Math.max(0, box.x ?? box.left ?? 0);
            const fy = Math.max(0, box.y ?? box.top ?? 0);
            const fw = Math.min(canvas.width, box.width ?? 0);
            const fh = Math.min(canvas.height, box.height ?? 0);
            if (fw > 0 && fh > 0) {
              ctx.drawImage(source, fx, fy, fw, fh, fx, fy, fw, fh);
            }
          });
          ctx.restore();
        }
      } else {
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        facesRef.current.forEach((face: any) => {
          const box = face.boundingBox ?? face;
          const fx = Math.max(0, box.x ?? box.left ?? 0);
          const fy = Math.max(0, box.y ?? box.top ?? 0);
          const fw = Math.min(canvas.width, box.width ?? 0);
          const fh = Math.min(canvas.height, box.height ?? 0);
          if (fw > 0 && fh > 0) {
            drawMaskOverlay(ctx, { x: fx, y: fy, width: fw, height: fh }, maskStyleRef.current);
          }
        });
      }

      maskAnimationRef.current = window.requestAnimationFrame(drawFrame);
    };

    drawFrame();
    maskStartLockRef.current = false;
  };

  const disableMask = async () => {
    stopMaskPipeline();
    const rawStream = localStreamRef.current;
    if (rawStream) {
      setLocalStream(rawStream);
      const sender = getVideoSender();
      const rawTrack = rawStream.getVideoTracks()[0];
      if (sender && rawTrack) {
        try {
          await sender.replaceTrack(rawTrack);
        } catch (error) {
          console.error(error);
        }
      } else if (peerConnectionRef.current && rawTrack) {
        videoSenderRef.current = peerConnectionRef.current.addTrack(
          rawTrack,
          rawStream,
        );
      }
    }
    setMaskEnabled(false);
    setMaskMode("mask");
    setMaskNotice(null);
  };

  const toggleMask = async () => {
    if (callState === "idle") return;
    if (maskEnabled) {
      await disableMask();
      return;
    }
    setMaskEnabled(true);
    setMaskMode("mask");
    await startMaskPipeline();
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (!remoteVideoRef.current) return;
    remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = listenToConversation(conversationId, (data) => {
      setConversation(data);
    });
    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = listenToMessages(conversationId, (items) => {
      setMessages(items);
    });
    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    void markConversationRead(conversationId, user.id);
  }, [conversationId, user.id, messages.length]);

  useEffect(() => {
    if (!conversationId) return;
    void markNotificationsReadByConversation(user.id, conversationId);
  }, [conversationId, user.id]);

  const otherParticipant = useMemo(() => {
    const members: string[] = conversation?.members ?? [];
    const otherId = members.find((member) => member !== user.id);
    if (!otherId) return null;
    const profile = conversation?.memberProfiles?.[otherId];
    return {
      id: otherId,
      nickname: profile?.nickname ?? "Chat",
      photoUrl: profile?.photoUrl ?? user.photoUrl,
    };
  }, [conversation, user.id, user.photoUrl]);

  const remoteCallName = useMemo(() => {
    if (activeCall) {
      return activeCall.callerId === user.id
        ? activeCall.calleeNickname
        : activeCall.callerNickname;
    }
    if (incomingCall) {
      return incomingCall.callerNickname;
    }
    return otherParticipant?.nickname ?? "Call";
  }, [activeCall, incomingCall, otherParticipant?.nickname, user.id]);

  const aiSuggestions = aiReplies.length > 0 ? aiReplies : aiIceBreakers;

  useEffect(() => {
    return () => {
      if (pendingAudio?.url) {
        URL.revokeObjectURL(pendingAudio.url);
      }
    };
  }, [pendingAudio]);

  useEffect(() => {
    if (!otherParticipant) return;
    if (messages.length === 0) {
      setAiIceBreakers(getIceBreakers({ otherProfile: otherParticipant }));
      setAiReplies([]);
      setAiSummary("");
      return;
    }
    const lastMessage = messages[messages.length - 1]?.text ?? "";
    setAiReplies(
      getSmartReplies({
        lastMessage,
        otherProfile: otherParticipant,
        tone: aiTone,
      }),
    );
    setAiIceBreakers([]);
    setAiSummary(summarizeConversation(messages));
  }, [messages, otherParticipant, aiTone]);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = listenToIncomingVideoCalls({
      calleeId: user.id,
      conversationId,
      onChange: (calls) => {
        if (calls.length === 0) {
          if (callState === "incoming") {
            setIncomingCall(null);
            setCallState("idle");
          }
          return;
        }
        const call = calls[0];
        const currentCallId = activeCall?.id ?? incomingCall?.id ?? null;
        if (callState !== "idle") {
          if (currentCallId === call.id) {
            setIncomingCall(call);
            return;
          }
          void updateVideoCall(call.id, {
            status: "missed",
            endedAt: Date.now(),
          });
          return;
        }
        setIncomingCall(call);
        setCallState("incoming");
      },
    });
    return () => unsubscribe();
  }, [conversationId, user.id, callState, activeCall?.id, incomingCall?.id]);

  const clearCallListeners = () => {
    if (callUnsubscribeRef.current) {
      callUnsubscribeRef.current();
      callUnsubscribeRef.current = null;
    }
    if (candidatesUnsubscribeRef.current) {
      candidatesUnsubscribeRef.current();
      candidatesUnsubscribeRef.current = null;
    }
  };

  const stopCallMedia = () => {
    stopMaskPipeline(true);
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
  };

  const resetPeerConnection = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.close();
    }
    peerConnectionRef.current = null;
    videoSenderRef.current = null;
  };

  const endVideoCall = async (
    status: "ended" | "declined" | "missed" = "ended",
    shouldUpdate = true,
    callIdOverride?: string | null,
  ) => {
    const callId =
      callIdOverride ?? activeCall?.id ?? incomingCall?.id ?? null;
    clearCallListeners();
    resetPeerConnection();
    stopCallMedia();
    setCallState("idle");
    setIncomingCall(null);
    setActiveCall(null);
    setShowVideoConfirm(false);
    if (callId && shouldUpdate) {
      try {
        await updateVideoCall(callId, {
          status,
          endedAt: Date.now(),
        });
      } catch (error) {
        console.error(error);
      }
    }
  };

  const startVideoCall = async () => {
    if (!conversationId || !otherParticipant) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setCallError("Video calling is not supported in this browser.");
      return;
    }
    if (callState !== "idle") return;
    setCallError(null);
    setShowVideoConfirm(false);
    setCallState("calling");

    let callId: string | null = null;
    try {
      callId = await createVideoCall({
        conversationId,
        caller: user,
        callee: otherParticipant,
      });
      setActiveCall({
        id: callId,
        conversationId,
        callerId: user.id,
        callerNickname: user.nickname,
        callerPhotoUrl: user.photoUrl,
        calleeId: otherParticipant.id,
        calleeNickname: otherParticipant.nickname,
        calleePhotoUrl: otherParticipant.photoUrl,
        status: "ringing",
      });

      const pc = new RTCPeerConnection(VIDEO_CALL_ICE_SERVERS);
      peerConnectionRef.current = pc;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const inboundStream = new MediaStream();
      remoteStreamRef.current = inboundStream;
      setRemoteStream(inboundStream);

      const videoTrack = stream.getVideoTracks()[0];
      const audioTracks = stream.getAudioTracks();
      if (videoTrack) {
        videoSenderRef.current = pc.addTrack(videoTrack, stream);
      }
      audioTracks.forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          inboundStream.addTrack(track);
        });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void addVideoCallCandidate({
            callId: callId as string,
            role: "caller",
            candidate: event.candidate.toJSON(),
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await updateVideoCall(callId, { offer });

      callUnsubscribeRef.current = listenToVideoCall(callId, (call) => {
        if (!call) return;
        setActiveCall(call);
        if (
          call.status === "declined" ||
          call.status === "ended" ||
          call.status === "missed"
        ) {
          void endVideoCall(call.status, false);
          return;
        }
        if (call.answer && !pc.currentRemoteDescription) {
          void pc
            .setRemoteDescription(new RTCSessionDescription(call.answer))
            .then(() => setCallState("in-call"))
            .catch((error) => {
              console.error(error);
              setCallError("Unable to connect the call.");
              void endVideoCall("ended", false);
            });
        }
      });

      candidatesUnsubscribeRef.current = listenToVideoCallCandidates({
        callId,
        role: "callee",
        onCandidate: (candidate) => {
          void pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
            console.error(err);
          });
        },
      });
    } catch (error) {
      console.error(error);
      setCallError("Unable to start video call.");
      if (callId) {
        await endVideoCall("ended", true, callId);
      } else {
        setCallState("idle");
      }
    }
  };

  const acceptVideoCall = async () => {
    if (!incomingCall) return;
    if (!incomingCall.offer) {
      setCallError("The call is still connecting. Try again.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setCallError("Video calling is not supported in this browser.");
      return;
    }
    setCallError(null);
    setIncomingCall(null);
    setActiveCall(incomingCall);
    setCallState("in-call");

    try {
      const pc = new RTCPeerConnection(VIDEO_CALL_ICE_SERVERS);
      peerConnectionRef.current = pc;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const inboundStream = new MediaStream();
      remoteStreamRef.current = inboundStream;
      setRemoteStream(inboundStream);

      const videoTrack = stream.getVideoTracks()[0];
      const audioTracks = stream.getAudioTracks();
      if (videoTrack) {
        videoSenderRef.current = pc.addTrack(videoTrack, stream);
      }
      audioTracks.forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          inboundStream.addTrack(track);
        });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void addVideoCallCandidate({
            callId: incomingCall.id,
            role: "callee",
            candidate: event.candidate.toJSON(),
          });
        }
      };

      await pc.setRemoteDescription(
        new RTCSessionDescription(incomingCall.offer),
      );
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await updateVideoCall(incomingCall.id, {
        answer,
        status: "accepted",
        acceptedAt: Date.now(),
      });

      callUnsubscribeRef.current = listenToVideoCall(
        incomingCall.id,
        (call) => {
          if (!call) return;
          setActiveCall(call);
          if (call.status === "ended" || call.status === "declined") {
            void endVideoCall(call.status, false);
          }
        },
      );

      candidatesUnsubscribeRef.current = listenToVideoCallCandidates({
        callId: incomingCall.id,
        role: "caller",
        onCandidate: (candidate) => {
          void pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
            console.error(err);
          });
        },
      });
    } catch (error) {
      console.error(error);
      setCallError("Unable to connect the call.");
      await endVideoCall("ended", true);
    }
  };

  const declineVideoCall = async () => {
    if (!incomingCall) return;
    await endVideoCall("declined", true);
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !conversationId || !otherParticipant) return;
    try {
      await sendChatMessage({
        conversationId,
        sender: user,
        recipientId: otherParticipant.id,
        text: inputValue.trim(),
        recipientNickname: otherParticipant.nickname,
      });
      setInputValue("");
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectPhoto = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const handlePhotoSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !conversationId || !otherParticipant) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file.");
      return;
    }
    setUploadError(null);
    setIsUploadingImage(true);
    try {
      const imageUrl = await uploadToCloudinary(file);
      await sendChatMessage({
        conversationId,
        sender: user,
        recipientId: otherParticipant.id,
        text: inputValue.trim() ? inputValue.trim() : undefined,
        imageUrl,
        recipientNickname: otherParticipant.nickname,
      });
      setInputValue("");
    } catch (error) {
      console.error(error);
      setUploadError("Unable to upload image. Try again.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const clearPendingAudio = () => {
    setPendingAudio(null);
    setIsPreviewPlaying(false);
    setPreviewDuration("0:00");
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
  };

  const togglePreviewPlayback = () => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (isPreviewPlaying) {
      audio.pause();
      setIsPreviewPlaying(false);
      return;
    }
    audio
      .play()
      .then(() => setIsPreviewPlaying(true))
      .catch(() => setRecordingError("Unable to play the preview."));
  };

  const toggleAudioPlayback = (messageId: string) => {
    const audio = audioRefs.current[messageId];
    if (!audio) return;
    if (playingAudioId && playingAudioId !== messageId) {
      audioRefs.current[playingAudioId]?.pause();
    }
    if (playingAudioId === messageId) {
      audio.pause();
      setPlayingAudioId(null);
      return;
    }
    audio
      .play()
      .then(() => setPlayingAudioId(messageId))
      .catch(() => setRecordingError("Unable to play this voice note."));
  };

  const sendPendingAudio = async () => {
    if (!pendingAudio || isUploadingAudio) return;
    setIsUploadingAudio(true);
    try {
      const file = new File(
        [pendingAudio.blob],
        `voice-note-${Date.now()}.webm`,
        { type: pendingAudio.blob.type || "audio/webm" },
      );
      const audioUrl = await uploadAudioToCloudinary(file);
      await sendChatMessage({
        conversationId: pendingAudio.context.conversationId,
        sender: user,
        recipientId: pendingAudio.context.recipientId,
        text: inputValue.trim() ? inputValue.trim() : undefined,
        audioUrl,
        recipientNickname: pendingAudio.context.recipientNickname,
      });
      setInputValue("");
      clearPendingAudio();
    } catch (error) {
      console.error(error);
      setRecordingError("Unable to upload voice note. Try again.");
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const stopRecordingStream = () => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  };

  const startRecording = async () => {
    if (isRecording || isUploadingAudio) return;
    if (pendingAudio) {
      clearPendingAudio();
    }
    if (!conversationId || !otherParticipant) {
      setRecordingError("Open a chat to record a voice note.");
      return;
    }
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setRecordingError("Voice recording is not supported in this browser.");
      return;
    }
    setRecordingError(null);
    setRecordingSeconds(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      recordingContextRef.current = {
        conversationId,
        recipientId: otherParticipant.id,
        recipientNickname: otherParticipant.nickname,
      };
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const context = recordingContextRef.current;
        recordingContextRef.current = null;
        setIsRecording(false);
        clearRecordingTimer();
        stopRecordingStream();
        const chunks = recordingChunksRef.current;
        if (!chunks.length || !context) return;
        const blob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm",
        });
        if (blob.size < 800) return;
        const url = URL.createObjectURL(blob);
        setPendingAudio({
          blob,
          url,
          context,
        });
      };

      recorder.start();
      setIsRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error(error);
      setRecordingError("Microphone access denied.");
      recordingContextRef.current = null;
      stopRecordingStream();
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    return () => {
      clearRecordingTimer();
      stopRecordingStream();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (callStateRef.current !== "idle") {
        void endVideoCall("ended", true);
      } else {
        clearCallListeners();
        resetPeerConnection();
        stopCallMedia();
      }
    };
  }, []);

  return (
    <div className="relative flex h-screen flex-col bg-[#121212] font-sans selection:bg-kipepeo-pink/30">
      {/* Ambient Background Effects */}
      <div className="fixed left-0 top-0 h-full w-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-900/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-kipepeo-pink/5 rounded-full blur-[100px]"></div>
      </div>

      {showVideoConfirm && otherParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-[90%] max-w-sm rounded-3xl border border-white/10 bg-[#141414] p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 h-14 w-14 overflow-hidden rounded-full border border-white/10">
              <AppImage
                src={otherParticipant.photoUrl ?? user.photoUrl}
                alt={otherParticipant.nickname}
                className="h-full w-full object-cover"
              />
            </div>
            <h3 className="text-base font-semibold text-white">
              Start a video call?
            </h3>
            <p className="mt-2 text-xs text-gray-400">
              Call {otherParticipant.nickname} and go live instantly.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setShowVideoConfirm(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={startVideoCall}
                className="rounded-full bg-gradient-to-r from-kipepeo-pink to-purple-600 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-lg"
              >
                Start Call
              </button>
            </div>
          </div>
        </div>
      )}

      {callState === "incoming" && incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-[90%] max-w-sm rounded-3xl border border-white/10 bg-[#141414] p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 h-14 w-14 overflow-hidden rounded-full border border-white/10">
              <AppImage
                src={incomingCall.callerPhotoUrl || user.photoUrl}
                alt={incomingCall.callerNickname}
                className="h-full w-full object-cover"
              />
            </div>
            <h3 className="text-base font-semibold text-white">
              Incoming video call
            </h3>
            <p className="mt-2 text-xs text-gray-400">
              {incomingCall.callerNickname} is calling you now.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={declineVideoCall}
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-300 hover:bg-white/5"
              >
                Decline
              </button>
              <button
                onClick={acceptVideoCall}
                className="rounded-full bg-gradient-to-r from-kipepeo-pink to-purple-600 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-lg"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {(callState === "calling" || callState === "in-call") && (
        <div className="fixed inset-0 z-40 bg-black">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
          <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-[10px] uppercase tracking-widest text-white">
            {callState === "calling" ? "Calling..." : "Live"}
          </div>
          <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-[10px] uppercase tracking-widest text-white">
            {remoteCallName}
          </div>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="absolute bottom-24 right-4 h-36 w-24 rounded-2xl border border-white/10 object-cover shadow-lg"
          />
          <div className="absolute bottom-24 left-0 right-0 flex flex-col items-center gap-2">
            <button
              onClick={toggleMask}
              className={`rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-widest shadow-lg transition-all ${
                maskEnabled
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {maskEnabled ? "Mask On" : "Mask Off"}
            </button>
            {maskEnabled && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {MASK_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setMaskStyle(option.id)}
                    disabled={maskMode === "blur"}
                    className={`rounded-full border px-3 py-1 text-[9px] uppercase tracking-widest transition-all ${
                      maskStyle === option.id
                        ? "border-kipepeo-pink text-white bg-kipepeo-pink/20"
                        : "border-white/10 text-gray-300 hover:border-white/30"
                    } ${maskMode === "blur" ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            {maskNotice && (
              <div className="text-[10px] text-gray-300">{maskNotice}</div>
            )}
          </div>
          <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center">
            <button
              onClick={() => endVideoCall("ended", true)}
              className="rounded-full bg-red-500/90 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white shadow-lg"
            >
              End Call
            </button>
          </div>
        </div>
      )}

      {/* --- Header --- */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-[#121212]/80 px-4 py-3 backdrop-blur-xl transition-all">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/chats")}
            className="group flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10 active:scale-90"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400 group-hover:text-white"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div className="relative">
              <AppImage
                src={otherParticipant?.photoUrl ?? user.photoUrl}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-transparent transition-all hover:ring-kipepeo-pink/50"
                alt={otherParticipant?.nickname ?? "Chat profile"}
                loading="eager"
                fetchPriority="high"
              />
              {/* Online Status Dot (Visual Polish) */}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#121212] bg-green-500"></span>
            </div>

            <div className="flex flex-col">
              <h3 className="text-sm font-black tracking-wide text-white">
                {otherParticipant?.nickname ?? "Chat"}
              </h3>
              <span className="text-[9px] font-bold uppercase tracking-widest text-kipepeo-pink">
                Online Now
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVideoConfirm(true)}
            disabled={!otherParticipant || callState !== "idle"}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              !otherParticipant || callState !== "idle"
                ? "text-gray-600 cursor-not-allowed"
                : "text-gray-500 hover:bg-white/5 hover:text-white"
            }`}
            aria-label="Start video call"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="7" width="14" height="10" rx="2" ry="2" />
              <polygon points="16 7 22 12 16 17 16 7" />
            </svg>
          </button>

          {/* Option Menu Placeholder */}
          <button className="optionBtn flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-white/5 hover:text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
          </button>
        </div>
      </header>

      {callError && (
        <div className="px-4 pt-2 text-[10px] text-red-400">{callError}</div>
      )}

      {/* --- AI Copilot --- */}
      <div className="px-4 pt-3 pb-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-400">
              AI Copilot
            </span>
            <select
              value={aiTone}
              onChange={(e) => setAiTone(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] uppercase tracking-widest text-gray-200"
            >
              <option value="warm">Warm</option>
              <option value="direct">Direct</option>
              <option value="playful">Playful</option>
              <option value="confident">Confident</option>
            </select>
          </div>
          {aiSummary && (
            <p className="text-xs text-gray-300 mb-3">{aiSummary}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {aiSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInputValue(suggestion)}
                className="px-3 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-gray-300 hover:bg-white/10 active:scale-95"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- Messages Area --- */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-4 opacity-50">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5 text-4xl grayscale">
              👋
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Start the vibe
            </p>
          </div>
        ) : (
          messages.map((m, index) => {
            const isMe = m.senderId === user.id;
            const isLast = index === messages.length - 1;
            const timeLabel = formatMessageTime(m.createdAt);
            const statusLabel =
              isMe && isLast
                ? timeLabel
                  ? " • Delivered"
                  : "Delivered"
                : "";

            return (
              <div
                key={m.id}
                className={`flex w-full ${isMe ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`flex max-w-[75%] flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`relative px-4 py-3 text-sm leading-relaxed shadow-lg space-y-2 ${
                      isMe
                        ? "rounded-2xl rounded-tr-sm text-white"
                        : "rounded-2xl rounded-tl-sm border border-white/5 bg-[#1E1E1E] text-gray-200"
                    }`}
                  >
                    {m.imageUrl && (
                      <div className="overflow-hidden rounded-xl border border-white/10">
                        <AppImage
                          src={m.imageUrl}
                          alt="Shared"
                          className="w-full max-w-[260px] sm:max-w-[320px] object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    {m.audioUrl && (
                      <div className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2">
                        <button
                          onClick={() => toggleAudioPlayback(m.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                          aria-label={
                            playingAudioId === m.id
                              ? "Pause voice note"
                              : "Play voice note"
                          }
                        >
                          {playingAudioId === m.id ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <rect x="6" y="5" width="4" height="14" />
                              <rect x="14" y="5" width="4" height="14" />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                          )}
                        </button>
                        <div className="flex flex-1 items-center gap-2">
                          <div className="flex items-end gap-1">
                            {["h-3", "h-5", "h-4", "h-6", "h-3"].map(
                              (height, index) => (
                                <span
                                  key={`${m.id}-wave-${index}`}
                                  className={`w-1 rounded-full bg-white/60 ${height} ${
                                    playingAudioId === m.id
                                      ? "animate-pulse"
                                      : ""
                                  }`}
                                  style={{ animationDelay: `${index * 120}ms` }}
                                ></span>
                              ),
                            )}
                          </div>
                          <span className="text-[10px] uppercase tracking-widest text-gray-300">
                            Voice note
                          </span>
                          <span className="text-[10px] text-gray-300 tabular-nums">
                            {audioDurations[m.id] ?? "0:00"}
                          </span>
                        </div>
                        <audio
                          ref={(el) => {
                            audioRefs.current[m.id] = el;
                          }}
                          src={m.audioUrl}
                          preload="metadata"
                          onLoadedMetadata={(event) =>
                            saveAudioDuration(m.id, event.currentTarget.duration)
                          }
                          onEnded={() => setPlayingAudioId(null)}
                          className="hidden"
                        />
                      </div>
                    )}
                    {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                  </div>
                  {/* Timestamp / Status (Visual Polish) */}
                  <span className="mt-1 text-[9px] font-medium text-gray-600">
                    {timeLabel}
                    {statusLabel}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- Input Area --- */}
      <div className="sticky bottom-0 z-20 w-full bg-[#121212] px-4 pb-6 pt-2">
        {/* Gradient Line Top */}
        <div className="absolute left-0 top-0 h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        {pendingAudio && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <button
              onClick={togglePreviewPlayback}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label={isPreviewPlaying ? "Pause preview" : "Play preview"}
            >
              {isPreviewPlaying ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect x="6" y="5" width="4" height="14" />
                  <rect x="14" y="5" width="4" height="14" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>

            <div className="flex flex-1 items-center gap-2">
              <div className="flex items-end gap-1">
                {["h-3", "h-5", "h-4", "h-6", "h-3"].map((height, index) => (
                  <span
                    key={`preview-wave-${index}`}
                    className={`w-1 rounded-full bg-white/60 ${height} ${
                      isPreviewPlaying ? "animate-pulse" : ""
                    }`}
                    style={{ animationDelay: `${index * 120}ms` }}
                  ></span>
                ))}
              </div>
              <span className="text-[10px] uppercase tracking-widest text-gray-300">
                Voice note ready
              </span>
              <span className="text-[10px] text-gray-400 tabular-nums">
                {previewDuration}
              </span>
            </div>

            <button
              onClick={clearPendingAudio}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white"
              aria-label="Discard voice note"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <button
              onClick={sendPendingAudio}
              disabled={isUploadingAudio}
              className={`flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-all active:scale-95 ${
                isUploadingAudio
                  ? "bg-white/5 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-kipepeo-pink to-purple-600 text-white hover:shadow-kipepeo-pink/25"
              }`}
              aria-label="Send voice note"
            >
              {isUploadingAudio ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-kipepeo-pink border-t-transparent"></div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              )}
            </button>

            <audio
              ref={previewAudioRef}
              src={pendingAudio.url}
              preload="metadata"
              onLoadedMetadata={(event) =>
                setPreviewDuration(formatDuration(event.currentTarget.duration))
              }
              onEnded={() => setIsPreviewPlaying(false)}
              className="hidden"
            />
          </div>
        )}

        <div className="flex items-end gap-2 rounded-3xl bg-[#1E1E1E] p-2 ring-1 ring-white/5 transition-all focus-within:ring-kipepeo-pink/50">
          {/* Attachment Button (Visual) */}
          <button
            onClick={handleSelectPhoto}
            disabled={isUploadingImage}
            aria-label="Attach photo"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
              isUploadingImage
                ? "text-gray-500 cursor-not-allowed"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {isUploadingImage ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-kipepeo-pink border-t-transparent"></div>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
          </button>

          {/* Voice Note Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isUploadingAudio}
            aria-label="Record voice note"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
              isUploadingAudio
                ? "text-gray-500 cursor-not-allowed"
                : isRecording
                  ? "text-red-300 bg-red-500/10"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {isUploadingAudio ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-kipepeo-pink border-t-transparent"></div>
            ) : isRecording ? (
              <span className="h-3 w-3 rounded-full bg-red-500"></span>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 1a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10a7 7 0 0 1-14 0" />
                <path d="M12 17v4" />
              </svg>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelected}
            className="hidden"
          />

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type your vibe..."
            className="max-h-32 min-h-[44px] flex-1 bg-transparent py-3 text-sm text-white placeholder-gray-500 focus:outline-none"
          />

          <button
            onClick={sendMessage}
            disabled={!inputValue.trim()}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-lg transition-all active:scale-95 ${
              inputValue.trim()
                ? "bg-gradient-to-r from-kipepeo-pink to-purple-600 text-white hover:shadow-kipepeo-pink/25"
                : "bg-white/5 text-gray-500 cursor-not-allowed"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={inputValue.trim() ? "ml-0.5" : ""}
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>

        {uploadError && (
          <div className="mt-2 text-[10px] text-red-400">{uploadError}</div>
        )}
        {recordingError && (
          <div className="mt-2 text-[10px] text-red-400">{recordingError}</div>
        )}
        {isRecording && (
          <div className="mt-2 text-[10px] text-rose-300 uppercase tracking-widest">
            Recording...{" "}
            {Math.floor(recordingSeconds / 60)
              .toString()
              .padStart(2, "0")}
            :{(recordingSeconds % 60).toString().padStart(2, "0")}
          </div>
        )}

        {/* Mobile Safe Area Spacer if needed, or keeping space for bottom nav */}
        <div className="h-4"></div>
      </div>
    </div>
  );
};

export default ChatDetailPage;
