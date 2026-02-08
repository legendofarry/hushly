import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import AppImage from "../components/AppImage";
import { db } from "../firebase";
import {
  addGuest,
  addLiveCandidate,
  addViewer,
  endLiveRoom,
  ensureLiveConnection,
  incrementLiveLike,
  listenToJoinRequests,
  listenToLiveCandidates,
  listenToLiveConnection,
  listenToLiveGuests,
  listenToLiveMessages,
  listenToLiveRoom,
  listenToLiveViewers,
  removeGuest,
  removeViewer,
  requestToJoinLive,
  sendLiveMessage,
  sendLiveSystemMessage,
  setLiveUserMuted,
  updateJoinRequestStatus,
  updateLiveConnection,
  listenToLiveMute,
} from "../services/liveService";
import { createLiveLikeAchievement } from "../services/liveAchievementService";
import { createNotification } from "../services/notificationService";
import {
  followUser,
  listenToFollowStatus,
  unfollowUser,
} from "../services/followService";
import { getUserProfileByEmail } from "../services/userService";
import { OWNER_EMAIL } from "../services/paymentService";
import {
  LiveGuest,
  LiveJoinRequest,
  LiveMessage,
  LiveRoom,
  UserProfile,
} from "../types";

interface Props {
  user: UserProfile;
}

const LIVE_ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const REACTION_OPTIONS = ["❤️", "🔥", "👏"];
const BAD_WORDS = ["spam", "scam", "nude", "sex", "escort"];
const LIVE_LIKE_MILESTONES = [100, 500, 1000, 2000];
const CONFETTI_COLORS = [
  "#F97316",
  "#FACC15",
  "#4ADE80",
  "#38BDF8",
  "#F472B6",
  "#F43F5E",
];
const ACHIEVEMENT_DISPLAY_MS = 5200;
const CONFETTI_CLEANUP_MS = 4200;
const CONFETTI_PIECE_COUNT = 140;

const formatDuration = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const formatTime = (timestamp?: number) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const sanitizeMessage = (text: string, filterBadWords: boolean) => {
  if (!filterBadWords) return text;
  let sanitized = text;
  BAD_WORDS.forEach((word) => {
    const pattern = new RegExp(`\\b${word}\\b`, "gi");
    sanitized = sanitized.replace(pattern, "***");
  });
  return sanitized;
};

const formatCompact = (count: number) => {
  if (!Number.isFinite(count)) return "0";
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K`;
  }
  return `${count}`;
};

type ConfettiPiece = {
  id: string;
  left: number;
  size: number;
  height: number;
  color: string;
  dx: number;
  rotate: number;
  delay: number;
  duration: number;
};

const CELEBRATION_STYLES = `
  @keyframes confettiFall {
    0% { transform: translate3d(0, -30px, 0) rotate(0deg); opacity: 0; }
    12% { opacity: 1; }
    100% { transform: translate3d(var(--dx), 110vh, 0) rotate(var(--rot)); opacity: 0; }
  }
  @keyframes celebrationBackdrop {
    0% { opacity: 0; transform: scale(0.98); }
    18% { opacity: 1; transform: scale(1); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes celebrationSweep {
    0% { opacity: 0; transform: translateX(-18%) rotate(0deg); }
    30% { opacity: 0.6; }
    100% { opacity: 0; transform: translateX(18%) rotate(8deg); }
  }
  @keyframes celebrationPulse {
    0% { opacity: 0; transform: scale(0.9); }
    35% { opacity: 0.85; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.15); }
  }
  @keyframes celebrationCard {
    0% { transform: translate3d(0, 18px, 0) scale(0.92); opacity: 0; }
    22% { opacity: 1; transform: translate3d(0, 0, 0) scale(1.02); }
    78% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
    100% { opacity: 0; transform: translate3d(0, -10px, 0) scale(0.98); }
  }
  @keyframes celebrationText {
    0% { opacity: 0; transform: translate3d(0, 10px, 0); }
    25% { opacity: 1; transform: translate3d(0, 0, 0); }
    85% { opacity: 1; }
    100% { opacity: 0; transform: translate3d(0, -6px, 0); }
  }
  @keyframes celebrationGlow {
    0% { opacity: 0; transform: scale(0.95); }
    40% { opacity: 0.9; transform: scale(1.05); }
    100% { opacity: 0; transform: scale(1.25); }
  }
`;

const VideoTile: React.FC<{
  label: string;
  stream?: MediaStream | null;
  fallbackSrc?: string;
  muted?: boolean;
  fullBleed?: boolean;
}> = ({ label, stream, fallbackSrc, muted, fullBleed }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (stream) {
      videoRef.current.srcObject = stream;
    } else {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  return (
    <div
      className={`relative overflow-hidden bg-black ${
        fullBleed ? "rounded-none border-0" : "rounded-3xl border border-white/10"
      }`}
    >
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          {fallbackSrc ? (
            <AppImage
              src={fallbackSrc}
              alt={label}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="text-xs text-gray-400">Connecting...</div>
          )}
        </div>
      )}
      <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[9px] uppercase tracking-widest text-white">
        {label}
      </div>
    </div>
  );
};

const LiveRoomPage: React.FC<Props> = ({ user }) => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [guests, setGuests] = useState<LiveGuest[]>([]);
  const [viewers, setViewers] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<LiveJoinRequest[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [joinStatus, setJoinStatus] = useState<
    "idle" | "pending" | "approved" | "declined"
  >("idle");
  const [viewerJoinedAt, setViewerJoinedAt] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});
  const [liveDuration, setLiveDuration] = useState("0:00");
  const [showNewChatIndicator, setShowNewChatIndicator] = useState(false);
  const [isChatAtBottom, setIsChatAtBottom] = useState(true);
  const [menuMessage, setMenuMessage] = useState<string | null>(null);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [showRequests, setShowRequests] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowUpdating, setIsFollowUpdating] = useState(false);
  const [emojiBursts, setEmojiBursts] = useState<
    Array<{
      id: string;
      emoji: string;
      left: number;
      top: number;
      dx: number;
      dy: number;
      size: number;
      rotate: number;
    }>
  >([]);
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);
  const [activeAchievement, setActiveAchievement] = useState<number | null>(
    null,
  );

  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const inboundStreamsRef = useRef<Record<string, MediaStream>>({});
  const peerMetaRef = useRef<
    Record<
      string,
      { connectionId: string; offererId: string; answererId: string }
    >
  >({});
  const connectionUnsubsRef = useRef<Record<string, () => void>>({});
  const candidateUnsubsRef = useRef<Record<string, () => void>>({});
  const offerCreatedRef = useRef<Set<string>>(new Set());
  const pendingOffersRef = useRef<
    Record<string, RTCSessionDescriptionInit | null>
  >({});
  const renegotiateSentRef = useRef<Set<string>>(new Set());
  const lastRenegotiateAtRef = useRef<Record<string, number>>({});
  const pendingRenegotiateRef = useRef<Record<string, number>>({});
  const lastMessageAtRef = useRef(0);
  const lastLikeCountRef = useRef<number | null>(null);
  const achievementQueueRef = useRef<number[]>([]);
  const unlockedAchievementKeysRef = useRef<Set<string>>(new Set());
  const confettiTimeoutRef = useRef<number | null>(null);
  const celebrationActiveRef = useRef(false);

  const isHost = room?.hostId === user.id;
  const isGuest = guests.some((guest) => guest.userId === user.id);
  const isOnStage = Boolean(isHost || isGuest);

  const stageParticipants = useMemo(() => {
    if (!room)
      return [] as Array<{ id: string; label: string; photoUrl?: string }>;
    const list: Array<{ id: string; label: string; photoUrl?: string }> = [];
    list.push({ id: room.hostId, label: "Host", photoUrl: room.hostPhotoUrl });
    guests.forEach((guest) => {
      list.push({
        id: guest.userId,
        label: guest.nickname,
        photoUrl: guest.photoUrl,
      });
    });
    return list;
  }, [room, guests]);

  const stageCount = stageParticipants.length;
  const isSoloStage = stageCount <= 1;
  const stageGridConfig = useMemo(() => {
    const count = Math.max(stageCount, 1);
    if (count <= 1) {
      return {
        columns: 1,
        rows: 1,
        gapClass: "gap-0",
        paddingClass: "p-0",
      };
    }
    const columns = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / columns);
    if (count <= 4) {
      return {
        columns,
        rows,
        gapClass: "gap-3",
        paddingClass: "p-4",
      };
    }
    if (count <= 6) {
      return {
        columns,
        rows,
        gapClass: "gap-2",
        paddingClass: "p-3",
      };
    }
    return {
      columns,
      rows,
      gapClass: "gap-1.5",
      paddingClass: "p-2",
    };
  }, [stageCount]);
  const stageGridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${stageGridConfig.columns}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${stageGridConfig.rows}, minmax(0, 1fr))`,
    }),
    [stageGridConfig.columns, stageGridConfig.rows],
  );

  const hostPhoto = room?.hostPhotoUrl ?? user.photoUrl;

  const viewerIds = useMemo(() => {
    return viewers
      .map((viewer) => viewer?.userId ?? viewer?.id)
      .filter((id: string) => Boolean(id)) as string[];
  }, [viewers]);

  const connectionTargets = useMemo(() => {
    const stageIds = stageParticipants
      .map((participant) => participant.id)
      .filter((id) => id !== user.id);
    if (!isOnStage) return stageIds;
    const combined = [...stageIds, ...viewerIds.filter((id) => id !== user.id)];
    return Array.from(new Set(combined));
  }, [stageParticipants, viewerIds, isOnStage, user.id]);

  const achievementOverlay =
    activeAchievement !== null || confettiPieces.length > 0 ? (
      <div className="pointer-events-none fixed inset-0 z-50">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 18% 22%, rgba(250, 204, 21, 0.35), transparent 42%), radial-gradient(circle at 82% 12%, rgba(244, 114, 182, 0.3), transparent 46%), radial-gradient(circle at 50% 82%, rgba(56, 189, 248, 0.32), transparent 48%), linear-gradient(160deg, rgba(6, 6, 6, 0.98), rgba(12, 12, 20, 0.98) 40%, rgba(18, 4, 28, 0.98))",
            animation: `celebrationBackdrop ${ACHIEVEMENT_DISPLAY_MS}ms ease-out forwards`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, rgba(255, 255, 255, 0.25), transparent 60%)",
            animation: `celebrationPulse ${ACHIEVEMENT_DISPLAY_MS}ms ease-out forwards`,
          }}
        />
        <div
          className="absolute inset-0 mix-blend-screen"
          style={{
            backgroundImage:
              "repeating-linear-gradient(120deg, rgba(255, 255, 255, 0.1) 0px, rgba(255, 255, 255, 0.1) 2px, transparent 2px, transparent 26px)",
            animation: `celebrationSweep ${ACHIEVEMENT_DISPLAY_MS}ms ease-out forwards`,
          }}
        />
        <div className="absolute inset-0 overflow-hidden">
          {confettiPieces.map((piece) => (
            <span
              key={piece.id}
              className="absolute"
              style={
                {
                  left: piece.left,
                  top: -40,
                  width: piece.size,
                  height: piece.height,
                  backgroundColor: piece.color,
                  borderRadius: piece.size,
                  opacity: 0.9,
                  animation: `confettiFall ${piece.duration}ms ease-out ${piece.delay}ms forwards`,
                  "--dx": `${piece.dx}px`,
                  "--rot": `${piece.rotate}deg`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
        {activeAchievement !== null && (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div
              key={`achievement-${activeAchievement}`}
              className="relative w-full max-w-3xl text-center"
            >
              <div
                className="absolute inset-0 rounded-[44px] bg-amber-400/30 blur-3xl"
                style={{
                  animation: `celebrationGlow ${ACHIEVEMENT_DISPLAY_MS}ms ease-out forwards`,
                }}
              />
              <div
                className="relative overflow-hidden rounded-[44px] border border-white/15 bg-black/60 px-8 py-10 shadow-[0_30px_120px_rgba(0,0,0,0.6)] backdrop-blur-xl"
                style={{
                  animation: `celebrationCard ${ACHIEVEMENT_DISPLAY_MS}ms ease-out forwards`,
                }}
              >
                <div
                  className="absolute inset-0 opacity-50"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, rgba(250, 204, 21, 0.2), transparent 40%, rgba(244, 114, 182, 0.18) 70%, transparent)",
                    animation: `celebrationSweep ${ACHIEVEMENT_DISPLAY_MS}ms ease-out forwards`,
                  }}
                />
                <div className="relative">
                  <p
                    className="text-[11px] uppercase tracking-[0.45em] text-amber-200"
                    style={{
                      animation: `celebrationText ${ACHIEVEMENT_DISPLAY_MS}ms ease-out forwards`,
                    }}
                  >
                    Live Milestone Unlocked
                  </p>
                  <div
                    className="mt-4 text-5xl font-black tracking-tight sm:text-6xl"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, #FACC15 0%, #F97316 40%, #F472B6 80%)",
                      WebkitBackgroundClip: "text",
                      color: "transparent",
                      animation: `celebrationText ${ACHIEVEMENT_DISPLAY_MS}ms ease-out forwards`,
                    }}
                  >
                    {activeAchievement.toLocaleString("en-US")} Likes
                  </div>
                  <p
                    className="mt-3 text-sm text-white/80"
                    style={{
                      animation: `celebrationText ${ACHIEVEMENT_DISPLAY_MS}ms ease-out forwards`,
                    }}
                  >
                    {room?.title ?? "Live session"}
                  </p>
                  <p
                    className="mt-2 text-[12px] uppercase tracking-[0.32em] text-white/60"
                    style={{
                      animation: `celebrationText ${ACHIEVEMENT_DISPLAY_MS}ms ease-out forwards`,
                    }}
                  >
                    Congrats {room?.hostNickname ?? "host"}
                  </p>
                  <div
                    className="mt-6 flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.3em] text-white/60"
                    style={{
                      animation: `celebrationText ${ACHIEVEMENT_DISPLAY_MS}ms ease-out forwards`,
                    }}
                  >
                    <span className="h-[1px] w-10 bg-white/30" />
                    Keep it going
                    <span className="h-[1px] w-10 bg-white/30" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    ) : null;

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = listenToLiveRoom(roomId, setRoom);
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = listenToLiveMessages(roomId, setMessages);
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = listenToLiveGuests(roomId, setGuests);
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = listenToLiveViewers(roomId, setViewers);
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !isHost) return;
    const unsubscribe = listenToJoinRequests(roomId, setJoinRequests);
    return () => unsubscribe();
  }, [roomId, isHost]);

  useEffect(() => {
    if (!roomId || isHost) return;
    const viewerRef = doc(db, "live_rooms", roomId, "viewers", user.id);
    const unsubscribe = onSnapshot(viewerRef, (snapshot) => {
      if (!snapshot.exists()) {
        setViewerJoinedAt(null);
        return;
      }
      const data = snapshot.data();
      const joinedAt = data?.joinedAt?.toMillis?.() ?? data?.joinedAt ?? null;
      if (joinedAt) setViewerJoinedAt(joinedAt);
    });
    return () => unsubscribe();
  }, [roomId, isHost, user.id]);

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = listenToLiveMute(roomId, user.id, setIsMuted);
    return () => unsubscribe();
  }, [roomId, user.id]);

  useEffect(() => {
    if (!room?.hostId) return;
    if (room.hostId === user.id) {
      setIsFollowing(true);
      return;
    }
    const unsubscribe = listenToFollowStatus(
      user.id,
      room.hostId,
      setIsFollowing,
    );
    return () => unsubscribe();
  }, [room?.hostId, user.id]);

  useEffect(() => {
    if (!roomId || !room) return;
    if (isHost) return;
    addViewer(roomId, user).catch((error) => console.error(error));
    return () => {
      removeViewer(roomId, user.id).catch((error) => console.error(error));
    };
  }, [roomId, room?.hostId, isHost, user]);

  useEffect(() => {
    if (!room?.startedAt) return;
    const interval = window.setInterval(() => {
      setLiveDuration(
        formatDuration(Date.now() - (room.startedAt ?? Date.now())),
      );
    }, 1000);
    return () => window.clearInterval(interval);
  }, [room?.startedAt]);

  useEffect(() => {
    if (!room) return;
    if (room.status === "ended") {
      setMenuMessage("Live has ended.");
      window.setTimeout(() => navigate("/discover"), 1200);
    }
  }, [room?.status, navigate, room]);

  useEffect(() => {
    if (!roomId || !isHost) return;
    const handleUnload = () => {
      void endLiveRoom(roomId);
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      void endLiveRoom(roomId);
    };
  }, [roomId, isHost]);

  useEffect(() => {
    if (!roomId) return;
    if (!isOnStage) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }
      return;
    }
    if (localStreamRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMenuError("Camera access is not available in this browser.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        setLocalStream(stream);
      })
      .catch((error) => {
        console.error(error);
        setMenuError("Unable to access camera or microphone.");
      });
  }, [roomId, isOnStage]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !isMicMuted;
    });
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !isCameraOff;
    });
  }, [isMicMuted, isCameraOff, localStream]);

  const chatAllowedByAccess = useMemo(() => {
    if (!room) return false;
    if (isOnStage) return true;
    if (room.chatAccess === "noone") return false;
    if (room.chatAccess === "followers" && !isFollowing) return false;
    return true;
  }, [room, isFollowing, isOnStage]);

  const isMutedByTimer = useMemo(() => {
    if (!room?.moderation?.muteNewUsers) return false;
    if (!viewerJoinedAt) return false;
    return Date.now() - viewerJoinedAt < 30000;
  }, [room?.moderation?.muteNewUsers, viewerJoinedAt]);

  const canSendChat = chatAllowedByAccess && !isMuted && !isMutedByTimer;

  const scrollChatToBottom = (behavior: ScrollBehavior = "auto") => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior,
    });
  };

  const handleChatScroll = () => {
    if (!chatScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 48;
    setIsChatAtBottom(nearBottom);
    if (nearBottom) setShowNewChatIndicator(false);
  };

  useEffect(() => {
    if (messages.length === 0) return;
    if (isChatAtBottom) {
      scrollChatToBottom("auto");
    } else {
      setShowNewChatIndicator(true);
    }
  }, [messages.length, isChatAtBottom]);

  const handleSendChat = async () => {
    if (!roomId || !room) return;
    if (!chatInput.trim()) return;
    if (!canSendChat) {
      setChatError("Chat is locked right now.");
      return;
    }
    const now = Date.now();
    if (now - lastMessageAtRef.current < 800) {
      setChatError("Slow down a bit.");
      return;
    }
    lastMessageAtRef.current = now;
    const cleaned = sanitizeMessage(
      chatInput.trim(),
      room.moderation.filterBadWords,
    );
    setChatInput("");
    setChatError(null);
    try {
      await sendLiveMessage({
        roomId,
        sender: user,
        text: cleaned,
        type: "message",
      });
    } catch (error) {
      console.error(error);
      setChatError("Unable to send message.");
    }
  };

  const spawnEmojiBurst = (emoji: string) => {
    if (typeof window === "undefined") return;
    const originX = Math.max(24, window.innerWidth - 80);
    const originY = Math.max(120, window.innerHeight - 240);
    const burstId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const particles = Array.from({ length: 7 }).map((_, index) => {
      const dx = (Math.random() * 120 - 60).toFixed(0);
      const dy = (Math.random() * -140 - 40).toFixed(0);
      return {
        id: `${burstId}-${index}`,
        emoji,
        left: originX,
        top: originY,
        dx: Number(dx),
        dy: Number(dy),
        size: 14 + Math.floor(Math.random() * 14),
        rotate: Math.floor(Math.random() * 60 - 30),
      };
    });
    setEmojiBursts((prev) => [...prev, ...particles]);
    window.setTimeout(() => {
      setEmojiBursts((prev) =>
        prev.filter((particle) => !particles.some((p) => p.id === particle.id)),
      );
    }, 900);
  };

  const spawnConfetti = () => {
    if (typeof window === "undefined") return;
    const width = window.innerWidth;
    const pieces = Array.from({ length: CONFETTI_PIECE_COUNT }).map(
      (_, index) => {
        const size = 6 + Math.random() * 10;
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${index}`,
          left: Math.random() * width,
          size,
          height: 8 + Math.random() * 18,
          color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
          dx: Math.random() * 320 - 160,
          rotate: Math.random() * 520 - 260,
          delay: Math.random() * 180,
          duration: 2800 + Math.random() * 1800,
        };
      },
    );
    setConfettiPieces(pieces);
    if (confettiTimeoutRef.current) {
      window.clearTimeout(confettiTimeoutRef.current);
    }
    confettiTimeoutRef.current = window.setTimeout(() => {
      setConfettiPieces([]);
    }, CONFETTI_CLEANUP_MS);
  };

  const showNextAchievement = () => {
    const next = achievementQueueRef.current.shift();
    if (next === undefined) {
      celebrationActiveRef.current = false;
      setActiveAchievement(null);
      return;
    }
    celebrationActiveRef.current = true;
    setActiveAchievement(next);
    spawnConfetti();
  };

  const queueAchievementCelebration = (threshold: number) => {
    achievementQueueRef.current.push(threshold);
    if (!celebrationActiveRef.current) {
      showNextAchievement();
    }
  };

  const handleSendReaction = async (reaction: string) => {
    if (!roomId || !room) return;
    try {
      spawnEmojiBurst(reaction);
      await incrementLiveLike(roomId);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRequestJoin = async () => {
    if (!roomId || !room) return;
    if (!room.allowGuests) {
      setMenuError("Guest requests are disabled.");
      return;
    }
    if (room.joinAccess === "invite") {
      setMenuError("This live is invite only.");
      return;
    }
    if (room.joinAccess === "followers" && !isFollowing) {
      setMenuError("Followers only.");
      return;
    }
    if (guests.length >= room.maxGuests) {
      setMenuError("Guest slots are full.");
      return;
    }
    try {
      await requestToJoinLive(roomId, user);
      setJoinStatus("pending");
    } catch (error) {
      console.error(error);
      setMenuError("Unable to request to join.");
    }
  };

  useEffect(() => {
    if (!roomId) return;
    const requestRef = doc(db, "live_rooms", roomId, "join_requests", user.id);
    const unsubscribe = onSnapshot(requestRef, (snapshot) => {
      if (!snapshot.exists()) {
        setJoinStatus("idle");
        return;
      }
      const status = snapshot.data()?.status ?? "pending";
      setJoinStatus(status);
    });
    return () => unsubscribe();
  }, [roomId, user.id]);

  const handleAcceptGuest = async (request: LiveJoinRequest) => {
    if (!roomId || !room) return;
    if (guests.length >= room.maxGuests) {
      setMenuError("Guest slots are full.");
      return;
    }
    try {
      await addGuest(roomId, {
        ...user,
        id: request.requesterId,
        nickname: request.nickname,
        photoUrl: request.photoUrl ?? "",
      } as UserProfile);
      await updateJoinRequestStatus(roomId, request.requesterId, "approved");
      await sendLiveSystemMessage({
        roomId,
        text: `${request.nickname} joined as a guest.`,
      });
    } catch (error) {
      console.error(error);
      setMenuError("Unable to add guest.");
    }
  };

  const handleDeclineGuest = async (request: LiveJoinRequest) => {
    if (!roomId) return;
    try {
      await updateJoinRequestStatus(roomId, request.requesterId, "declined");
    } catch (error) {
      console.error(error);
      setMenuError("Unable to decline request.");
    }
  };

  const handleRemoveGuest = async (guest: LiveGuest) => {
    if (!roomId) return;
    try {
      await removeGuest(roomId, guest.userId);
      await sendLiveSystemMessage({
        roomId,
        text: `${guest.nickname} was removed from the stage.`,
      });
    } catch (error) {
      console.error(error);
      setMenuError("Unable to remove guest.");
    }
  };

  const handleReportLive = async () => {
    if (!room) return;
    try {
      const owner = await getUserProfileByEmail(OWNER_EMAIL);
      if (!owner) throw new Error("owner-not-found");
      await createNotification({
        toUserId: owner.id,
        fromUserId: user.id,
        fromNickname: user.nickname,
        type: "system",
        body: `${user.nickname} reported live: ${room.title}`,
      });
      setMenuMessage("Report sent.");
    } catch (error) {
      console.error(error);
      setMenuError("Unable to send report.");
    }
  };

  const handleEndLive = async () => {
    if (!roomId) return;
    try {
      await endLiveRoom(roomId);
    } catch (error) {
      console.error(error);
      setMenuError("Unable to end live.");
    }
  };

  const handleMuteUser = async (targetId: string) => {
    if (!roomId) return;
    try {
      await setLiveUserMuted(roomId, targetId, true);
      setMenuMessage("User muted.");
    } catch (error) {
      console.error(error);
      setMenuError("Unable to mute user.");
    }
  };

  const attachLocalTracks = (pc: RTCPeerConnection) => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getTracks().forEach((track) => {
      const exists = pc
        .getSenders()
        .some((sender) => sender.track?.id === track.id);
      if (!exists) {
        pc.addTrack(track, localStreamRef.current as MediaStream);
      }
    });
  };

  const createPeerConnection = (
    remoteId: string,
    role: "offer" | "answer",
    connectionId: string,
  ) => {
    const pc = new RTCPeerConnection(LIVE_ICE_SERVERS);
    if (localStreamRef.current) {
      attachLocalTracks(pc);
    } else {
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });
    }

    pc.ontrack = (event) => {
      const stream =
        event.streams[0] ??
        inboundStreamsRef.current[remoteId] ??
        new MediaStream();
      if (!inboundStreamsRef.current[remoteId]) {
        inboundStreamsRef.current[remoteId] = stream;
      }
      if (!stream.getTracks().some((track) => track.id === event.track.id)) {
        stream.addTrack(event.track);
      }
      setRemoteStreams((prev) => ({
        ...prev,
        [remoteId]: stream,
      }));
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate || !roomId) return;
      void addLiveCandidate({
        roomId,
        connectionId,
        role,
        candidate: event.candidate.toJSON(),
      });
    };

    pc.onsignalingstatechange = () => {
      if (pc.signalingState !== "stable") return;
      const meta = peerMetaRef.current[remoteId];
      if (!meta || meta.offererId !== user.id) return;
      const pendingAt = pendingRenegotiateRef.current[meta.connectionId];
      if (!pendingAt) return;
      if (isOnStage && !localStreamRef.current) return;
      pendingRenegotiateRef.current[meta.connectionId] = 0;
      lastRenegotiateAtRef.current[meta.connectionId] = pendingAt;
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer).then(() => offer))
        .then((offer) =>
          updateLiveConnection(roomId as string, meta.connectionId, { offer }),
        )
        .catch((error) => console.error(error));
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        pc.close();
      }
    };

    return pc;
  };

  const connectToPeer = async (remoteId: string) => {
    if (!roomId || !room) return;
    if (peerConnectionsRef.current[remoteId]) return;
    const { connectionId, offererId, answererId } = await ensureLiveConnection(
      roomId,
      user.id,
      remoteId,
    );
    const isOfferer = offererId === user.id;
    const role: "offer" | "answer" = isOfferer ? "offer" : "answer";
    const pc = createPeerConnection(remoteId, role, connectionId);
    peerConnectionsRef.current[remoteId] = pc;
    peerMetaRef.current[remoteId] = { connectionId, offererId, answererId };

    const unsubscribeConnection = listenToLiveConnection(
      roomId,
      connectionId,
      async (data) => {
        if (!data) return;
        try {
          if (!isOfferer && data.offer && !pc.currentRemoteDescription) {
            if (isOnStage && !localStreamRef.current) {
              pendingOffersRef.current[remoteId] = data.offer;
              return;
            }
            await pc.setRemoteDescription(data.offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await updateLiveConnection(roomId, connectionId, { answer });
          }
          if (isOfferer && data.answer && !pc.currentRemoteDescription) {
            await pc.setRemoteDescription(data.answer);
          }
          if (isOfferer && data.renegotiateRequestedAt) {
            const requestedAt =
              data.renegotiateRequestedAt?.toMillis?.() ??
              data.renegotiateRequestedAt ??
              null;
            if (requestedAt) {
              const lastAt = lastRenegotiateAtRef.current[connectionId] ?? 0;
              if (requestedAt > lastAt) {
                if (isOnStage && !localStreamRef.current) {
                  pendingRenegotiateRef.current[connectionId] = requestedAt;
                  return;
                }
                if (pc.signalingState !== "stable") {
                  pendingRenegotiateRef.current[connectionId] = requestedAt;
                  return;
                }
                lastRenegotiateAtRef.current[connectionId] = requestedAt;
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                await updateLiveConnection(roomId, connectionId, { offer });
                offerCreatedRef.current.add(connectionId);
              }
            }
          }
          if (
            isOfferer &&
            !data.offer &&
            !offerCreatedRef.current.has(connectionId)
          ) {
            if (isOnStage && !localStreamRef.current) {
              return;
            }
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await updateLiveConnection(roomId, connectionId, { offer });
            offerCreatedRef.current.add(connectionId);
          }
        } catch (error) {
          console.error(error);
        }
      },
    );

    const unsubscribeCandidates = listenToLiveCandidates({
      roomId,
      connectionId,
      role: isOfferer ? "answer" : "offer",
      onCandidate: (candidate) => {
        void pc.addIceCandidate(candidate);
      },
    });

    connectionUnsubsRef.current[remoteId] = unsubscribeConnection;
    candidateUnsubsRef.current[remoteId] = unsubscribeCandidates;
  };

  useEffect(() => {
    if (!room) return;
    connectionTargets.forEach((remoteId) => {
      void connectToPeer(remoteId);
    });

    const activeIds = new Set(connectionTargets);
    Object.keys(peerConnectionsRef.current).forEach((remoteId) => {
      if (activeIds.has(remoteId)) return;
      const meta = peerMetaRef.current[remoteId];
      connectionUnsubsRef.current[remoteId]?.();
      candidateUnsubsRef.current[remoteId]?.();
      peerConnectionsRef.current[remoteId]?.close();
      delete peerConnectionsRef.current[remoteId];
      delete peerMetaRef.current[remoteId];
      if (meta?.connectionId) {
        renegotiateSentRef.current.delete(meta.connectionId);
        delete lastRenegotiateAtRef.current[meta.connectionId];
        delete pendingRenegotiateRef.current[meta.connectionId];
      }
      delete pendingOffersRef.current[remoteId];
      delete inboundStreamsRef.current[remoteId];
      delete connectionUnsubsRef.current[remoteId];
      delete candidateUnsubsRef.current[remoteId];
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[remoteId];
        return next;
      });
    });
  }, [room, connectionTargets, user.id]);

  useEffect(() => {
    if (!localStreamRef.current) return;
    Object.values(peerConnectionsRef.current).forEach((pc) => {
      attachLocalTracks(pc);
    });
  }, [localStream]);

  useEffect(() => {
    if (!localStreamRef.current || !roomId) return;
    Object.entries(pendingOffersRef.current).forEach(
      ([remoteId, pendingOffer]) => {
        if (!pendingOffer) return;
        const pc = peerConnectionsRef.current[remoteId];
        const meta = peerMetaRef.current[remoteId];
        if (!pc || !meta) return;
        if (pc.currentRemoteDescription) {
          pendingOffersRef.current[remoteId] = null;
          return;
        }
        pc.setRemoteDescription(pendingOffer)
          .then(() => pc.createAnswer())
          .then((answer) => {
            return pc.setLocalDescription(answer).then(() => answer);
          })
          .then((answer) =>
            updateLiveConnection(roomId, meta.connectionId, { answer }),
          )
          .then(() => {
            pendingOffersRef.current[remoteId] = null;
          })
          .catch((error) => console.error(error));
      },
    );
    Object.entries(peerMetaRef.current).forEach(([remoteId, meta]) => {
      if (meta.offererId !== user.id) return;
      const pc = peerConnectionsRef.current[remoteId];
      if (!pc || pc.signalingState !== "stable") return;
      pc.createOffer()
        .then((offer) => {
          return pc.setLocalDescription(offer).then(() => offer);
        })
        .then((offer) =>
          updateLiveConnection(roomId, meta.connectionId, { offer }),
        )
        .then(() => {
          offerCreatedRef.current.add(meta.connectionId);
        })
        .catch((error) => console.error(error));
    });
    Object.entries(peerMetaRef.current).forEach(([remoteId, meta]) => {
      if (meta.offererId !== user.id) return;
      const pendingAt = pendingRenegotiateRef.current[meta.connectionId];
      if (!pendingAt) return;
      const pc = peerConnectionsRef.current[remoteId];
      if (!pc || pc.signalingState !== "stable") return;
      pendingRenegotiateRef.current[meta.connectionId] = 0;
      lastRenegotiateAtRef.current[meta.connectionId] = pendingAt;
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer).then(() => offer))
        .then((offer) =>
          updateLiveConnection(roomId, meta.connectionId, { offer }),
        )
        .catch((error) => console.error(error));
    });
    if (!isOnStage) return;
    Object.entries(peerMetaRef.current).forEach(([remoteId, meta]) => {
      if (meta.offererId === user.id) return;
      if (renegotiateSentRef.current.has(meta.connectionId)) return;
      const pc = peerConnectionsRef.current[remoteId];
      if (!pc || pc.signalingState !== "stable") return;
      renegotiateSentRef.current.add(meta.connectionId);
      updateLiveConnection(roomId, meta.connectionId, {
        renegotiateRequestedBy: user.id,
        renegotiateRequestedAt: Date.now(),
      }).catch((error) => console.error(error));
    });
  }, [localStream, roomId, user.id]);

  useEffect(() => {
    return () => {
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      Object.values(connectionUnsubsRef.current).forEach((unsub) => unsub());
      Object.values(candidateUnsubsRef.current).forEach((unsub) => unsub());
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (confettiTimeoutRef.current) {
        window.clearTimeout(confettiTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!menuMessage && !menuError) return;
    const timeout = window.setTimeout(() => {
      setMenuMessage(null);
      setMenuError(null);
    }, 2500);
    return () => window.clearTimeout(timeout);
  }, [menuMessage, menuError]);

  useEffect(() => {
    if (activeAchievement === null) return;
    const timeout = window.setTimeout(() => {
      showNextAchievement();
    }, ACHIEVEMENT_DISPLAY_MS);
    return () => window.clearTimeout(timeout);
  }, [activeAchievement]);

  useEffect(() => {
    lastLikeCountRef.current = null;
    achievementQueueRef.current = [];
    unlockedAchievementKeysRef.current = new Set();
    celebrationActiveRef.current = false;
    pendingOffersRef.current = {};
    renegotiateSentRef.current = new Set();
    lastRenegotiateAtRef.current = {};
    pendingRenegotiateRef.current = {};
    inboundStreamsRef.current = {};
    setActiveAchievement(null);
    setConfettiPieces([]);
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !room) return;
    const currentLikes = room.likeCount ?? 0;
    const previousLikes = lastLikeCountRef.current;
    if (previousLikes === null) {
      lastLikeCountRef.current = currentLikes;
      return;
    }
    if (currentLikes <= previousLikes) {
      lastLikeCountRef.current = currentLikes;
      return;
    }
    LIVE_LIKE_MILESTONES.forEach((threshold) => {
      if (previousLikes < threshold && currentLikes >= threshold) {
        const key = `likes_${threshold}`;
        if (unlockedAchievementKeysRef.current.has(key)) return;
        unlockedAchievementKeysRef.current.add(key);
        queueAchievementCelebration(threshold);
        if (isHost) {
          createLiveLikeAchievement({
            roomId,
            hostId: room.hostId,
            hostNickname: room.hostNickname,
            liveTitle: room.title,
            likeCount: currentLikes,
            threshold,
          }).catch((error) => console.error(error));
        }
      }
    });
    lastLikeCountRef.current = currentLikes;
  }, [
    roomId,
    room?.likeCount,
    room?.hostId,
    room?.hostNickname,
    room?.title,
    isHost,
  ]);

  if (!roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] text-gray-400">
        Live room not found.
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] text-gray-400">
        Loading live room...
      </div>
    );
  }

  if (!isHost) {
    return (
      <div className="relative h-screen overflow-hidden bg-black text-white">
        <style>{`
          ${CELEBRATION_STYLES}
          @keyframes emojiBurst {
            0% { transform: translate(0, 0) scale(0.85); opacity: 0.9; }
            100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(1.4); opacity: 0; }
          }
        `}</style>
        {achievementOverlay}
        <div className="absolute inset-0">
          <div
            className={`grid h-full w-full ${stageGridConfig.gapClass} ${stageGridConfig.paddingClass}`}
            style={stageGridStyle}
          >
            {stageParticipants.map((participant) => {
              const stream =
                participant.id === user.id
                  ? localStream
                  : remoteStreams[participant.id];
              const fallbackSrc =
                participant.id === user.id
                  ? undefined
                  : participant.id === room?.hostId
                    ? participant.photoUrl
                    : undefined;
              return (
                <VideoTile
                  key={participant.id}
                  label={participant.label}
                  stream={stream}
                  fallbackSrc={fallbackSrc}
                  muted={participant.id === user.id}
                  fullBleed={isSoloStage}
                />
              );
            })}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/85"></div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-20">
          {emojiBursts.map((burst) => (
            <span
              key={burst.id}
              className="absolute select-none"
              style={
                {
                  left: burst.left,
                  top: burst.top,
                  fontSize: `${burst.size}px`,
                  animation: "emojiBurst 900ms ease-out forwards",
                  "--dx": `${burst.dx}px`,
                  "--dy": `${burst.dy}px`,
                  "--rot": `${burst.rotate}deg`,
                } as React.CSSProperties
              }
            >
              {burst.emoji}
            </span>
          ))}
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="px-4 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 backdrop-blur">
                  <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10">
                    <AppImage
                      src={hostPhoto}
                      alt={room.hostNickname}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{room.hostNickname}</p>
                    <p className="text-[10px] text-gray-300">
                      {formatCompact(room.likeCount ?? 0)} likes
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (!room) return;
                    if (isFollowUpdating) return;
                    setIsFollowUpdating(true);
                    setMenuError(null);
                    try {
                      const target = {
                        id: room.hostId,
                        nickname: room.hostNickname,
                      };
                      if (isFollowing) {
                        await unfollowUser({ follower: user, target });
                        setIsFollowing(false);
                      } else {
                        await followUser({ follower: user, target });
                        setIsFollowing(true);
                      }
                    } catch (error) {
                      console.error(error);
                      setMenuError("Unable to update follow.");
                    } finally {
                      setIsFollowUpdating(false);
                    }
                  }}
                  disabled={isFollowUpdating}
                  className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-60 ${
                    isFollowing
                      ? "bg-white/10 text-white"
                      : "bg-kipepeo-pink text-white"
                  }`}
                >
                  {isFollowing ? "Unfollow" : "+ Follow"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 text-[10px] uppercase tracking-widest text-white">
                  <span className="rounded-md bg-kipepeo-pink px-2 py-1 text-[9px] font-black">
                    Live
                  </span>
                  <span>{formatCompact(room.viewerCount)}</span>
                </div>
                <button
                  onClick={() => navigate("/discover")}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  aria-label="Close live"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
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
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {room.tags.slice(0, 3).map((tag) => (
                <span
                  key={`${room.id}-tag-${tag}`}
                  className="rounded-full bg-black/60 px-3 py-1 text-[10px] uppercase tracking-widest text-white/80"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="relative flex-1">
            <div
              ref={chatScrollRef}
              onScroll={handleChatScroll}
              className="absolute bottom-0 left-4 right-16 max-h-[45%] space-y-3 overflow-y-auto pr-2"
            >
              <div className="fixed">
                <h2>chats</h2>
              </div>
              {messages.map((message) => (
                <div key={message.id} className="flex items-start gap-2 mt-4">
                  <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-black/60 flex items-center justify-center text-xs font-bold text-white">
                    {message.senderNickname?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="rounded-2xl bg-black/50 px-3 py-2 text-xs text-white/90 backdrop-blur">
                    <p className="text-[10px] uppercase tracking-widest text-white/60">
                      {message.senderNickname}
                    </p>
                    <p className="mt-1">{message.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {showNewChatIndicator && (
              <button
                onClick={() => scrollChatToBottom("smooth")}
                className="absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-[10px] uppercase tracking-widest text-white"
              >
                New messages
              </button>
            )}

            <div className="absolute bottom-28 right-4 flex flex-col items-center gap-3">
              {REACTION_OPTIONS.map((reaction) => (
                <button
                  key={`reaction-${reaction}`}
                  onClick={() => handleSendReaction(reaction)}
                  disabled={!canSendChat}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-lg shadow-lg transition hover:scale-105 disabled:opacity-50"
                >
                  {reaction}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 pb-5 space-y-3">
            <div className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 backdrop-blur">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder={canSendChat ? "Type..." : "Chat locked"}
                disabled={!canSendChat}
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-400 focus:outline-none disabled:opacity-60"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSendChat();
                  }
                }}
              />
              <button
                onClick={handleSendChat}
                disabled={!chatInput.trim() || !canSendChat}
                className="rounded-full bg-kipepeo-pink px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
              >
                Send
              </button>
            </div>
            {chatError && (
              <p className="text-[10px] text-red-400">{chatError}</p>
            )}
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/70">
              {!isOnStage && room.allowGuests && (
                <button
                  onClick={handleRequestJoin}
                  disabled={
                    joinStatus === "pending" ||
                    room.joinAccess === "invite" ||
                    (room.joinAccess === "followers" && !isFollowing)
                  }
                  className="rounded-full bg-white/10 px-3 py-1 text-[10px] uppercase tracking-widest text-white disabled:opacity-60"
                >
                  {joinStatus === "pending"
                    ? "Request Sent"
                    : joinStatus === "approved"
                      ? "Approved"
                      : joinStatus === "declined"
                        ? "Declined"
                        : "Request to Join"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col bg-[#0d0d0d] text-white">
      <style>{CELEBRATION_STYLES}</style>
      {achievementOverlay}
      <header className="flex items-center justify-between border-b border-white/10 bg-black/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/discover")}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
            aria-label="Back"
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
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-400">
              <span className="rounded-full bg-red-500/80 px-2 py-0.5 text-[9px] font-black text-white">
                Live
              </span>
              <span>{room.viewerCount} watching</span>
              <span>{liveDuration}</span>
            </div>
            <h1 className="text-sm font-black uppercase tracking-widest text-white">
              {room.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isHost && (
            <button
              onClick={() => setShowRequests((prev) => !prev)}
              className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-widest text-gray-200 hover:bg-white/10"
            >
              Guest Requests
            </button>
          )}
          <button
            onClick={() => setShowSettings((prev) => !prev)}
            className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-widest text-gray-200 hover:bg-white/10"
          >
            Settings
          </button>
          <button
            onClick={handleReportLive}
            className="rounded-full border border-amber-400/30 px-3 py-1 text-[10px] uppercase tracking-widest text-amber-300 hover:bg-amber-500/10"
          >
            Report
          </button>
          {isHost && (
            <button
              onClick={handleEndLive}
              className="rounded-full bg-red-500/90 px-3 py-1 text-[10px] uppercase tracking-widest text-white"
            >
              End Live
            </button>
          )}
        </div>
      </header>

      {menuMessage && (
        <div className="px-4 pt-2 text-[10px] text-emerald-300">
          {menuMessage}
        </div>
      )}
      {menuError && (
        <div className="px-4 pt-2 text-[10px] text-red-400">{menuError}</div>
      )}

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className={`flex-1 ${stageGridConfig.paddingClass}`}>
          <div
            className={`grid h-full w-full ${stageGridConfig.gapClass}`}
            style={stageGridStyle}
          >
            {stageParticipants.map((participant) => {
              const stream =
                participant.id === user.id
                  ? localStream
                  : remoteStreams[participant.id];
              const fallbackSrc =
                participant.id === user.id
                  ? undefined
                  : participant.id === room?.hostId
                    ? participant.photoUrl
                    : undefined;
              return (
                <VideoTile
                  key={participant.id}
                  label={participant.label}
                  stream={stream}
                  fallbackSrc={fallbackSrc}
                  muted={participant.id === user.id}
                  fullBleed={isSoloStage}
                />
              );
            })}
          </div>
        </div>

        <div className="w-full border-t border-white/10 bg-black/50 lg:w-[360px] lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400">
                Live Chat
              </p>
              <p className="text-[9px] text-gray-500">
                {canSendChat
                  ? "Chat is open"
                  : isMutedByTimer
                    ? "Muted for 30s"
                    : "Chat restricted"}
              </p>
            </div>
            {showNewChatIndicator && (
              <button
                onClick={() => scrollChatToBottom("smooth")}
                className="rounded-full border border-white/10 px-3 py-1 text-[9px] uppercase tracking-widest text-gray-200"
              >
                New Messages
              </button>
            )}
          </div>
          <div
            ref={chatScrollRef}
            onScroll={handleChatScroll}
            className="h-[calc(100vh-300px)] overflow-y-auto px-4 pb-4"
          >
            {messages.map((message) => (
              <div key={message.id} className="mb-3">
                <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-gray-500">
                  <span>
                    {message.type === "system"
                      ? "System"
                      : message.senderNickname}
                  </span>
                  <span>{formatTime(message.createdAt)}</span>
                  {isHost &&
                    message.type !== "system" &&
                    message.senderId !== user.id && (
                      <button
                        onClick={() => handleMuteUser(message.senderId)}
                        className="ml-auto text-[9px] uppercase tracking-widest text-amber-300"
                      >
                        Mute
                      </button>
                    )}
                </div>
                <div
                  className={`mt-1 rounded-2xl px-3 py-2 text-xs ${
                    message.type === "system"
                      ? "bg-white/5 text-gray-300"
                      : message.type === "reaction"
                        ? "bg-kipepeo-pink/20 text-kipepeo-pink text-lg"
                        : "bg-white/10 text-gray-200"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Type a message"
                disabled={!canSendChat}
                className="flex-1 rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-xs focus:outline-none disabled:opacity-60"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSendChat();
                  }
                }}
              />
              <button
                onClick={handleSendChat}
                disabled={!chatInput.trim() || !canSendChat}
                className="rounded-full bg-kipepeo-pink px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60"
              >
                Send
              </button>
            </div>
            {chatError && (
              <p className="mt-2 text-[10px] text-red-400">{chatError}</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              {REACTION_OPTIONS.map((reaction) => (
                <button
                  key={reaction}
                  onClick={() => handleSendReaction(reaction)}
                  disabled={!canSendChat}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-base hover:bg-white/10 disabled:opacity-60"
                  aria-label={`React ${reaction}`}
                >
                  {reaction}
                </button>
              ))}
              {!isOnStage && room.allowGuests && (
                <button
                  onClick={handleRequestJoin}
                  disabled={
                    joinStatus === "pending" ||
                    room.joinAccess === "invite" ||
                    (room.joinAccess === "followers" && !isFollowing)
                  }
                  className="ml-auto rounded-full border border-white/10 px-3 py-2 text-[9px] uppercase tracking-widest text-gray-200 hover:bg-white/10 disabled:opacity-60"
                >
                  {joinStatus === "pending"
                    ? "Request Sent"
                    : joinStatus === "approved"
                      ? "Approved"
                      : joinStatus === "declined"
                        ? "Declined"
                        : "Request to Join"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isOnStage && (
        <div className="fixed bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-2">
          <button
            onClick={() => setIsMicMuted((prev) => !prev)}
            className={`rounded-full px-3 py-1 text-[9px] uppercase tracking-widest ${
              isMicMuted ? "bg-red-500/80" : "bg-white/10"
            }`}
          >
            {isMicMuted ? "Mic Off" : "Mic On"}
          </button>
          <button
            onClick={() => setIsCameraOff((prev) => !prev)}
            className={`rounded-full px-3 py-1 text-[9px] uppercase tracking-widest ${
              isCameraOff ? "bg-red-500/80" : "bg-white/10"
            }`}
          >
            {isCameraOff ? "Cam Off" : "Cam On"}
          </button>
        </div>
      )}

      {showRequests && isHost && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141414] p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest">
                Guest Requests
              </h3>
              <button
                onClick={() => setShowRequests(false)}
                className="text-xs uppercase tracking-widest text-gray-400"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {joinRequests.filter((req) => req.status === "pending").length ===
              0 ? (
                <p className="text-xs text-gray-500">No requests yet.</p>
              ) : (
                joinRequests
                  .filter((req) => req.status === "pending")
                  .map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10">
                          <AppImage
                            src={req.photoUrl ?? user.photoUrl}
                            alt={req.nickname}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">
                            {req.nickname}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            Wants to join
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeclineGuest(req)}
                          className="rounded-full border border-white/10 px-3 py-1 text-[9px] uppercase tracking-widest text-gray-300"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleAcceptGuest(req)}
                          className="rounded-full bg-kipepeo-pink px-3 py-1 text-[9px] uppercase tracking-widest text-white"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141414] p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest">
                Live Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-xs uppercase tracking-widest text-gray-400"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-gray-300">
              <div className="flex items-center justify-between">
                <span>Type</span>
                <span className="text-white">{room.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Guests</span>
                <span className="text-white">
                  {room.allowGuests ? "Allowed" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Chat</span>
                <span className="text-white">{room.chatAccess}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Join Requests</span>
                <span className="text-white">{room.joinAccess}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Privacy</span>
                <span className="text-white">{room.privacy}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Moderation</span>
                <span className="text-white">
                  {room.moderation.filterBadWords ? "Filtered" : "Open"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isHost && guests.length > 0 && (
        <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2">
          {guests.map((guest) => (
            <div
              key={guest.userId}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-2"
            >
              <span className="text-[10px] uppercase tracking-widest text-gray-300">
                {guest.nickname}
              </span>
              <button
                onClick={() => handleRemoveGuest(guest)}
                className="text-[9px] uppercase tracking-widest text-red-300"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveRoomPage;
