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
import { createNotification } from "../services/notificationService";
import { getLikeId } from "../services/likeService";
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

const VideoTile: React.FC<{
  label: string;
  stream?: MediaStream | null;
  fallbackSrc?: string;
  muted?: boolean;
}> = ({ label, stream, fallbackSrc, muted }) => {
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
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black">
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
  const [isFollower, setIsFollower] = useState(false);
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

  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const peerMetaRef = useRef<
    Record<string, { connectionId: string; offererId: string; answererId: string }>
  >({});
  const connectionUnsubsRef = useRef<Record<string, () => void>>({});
  const candidateUnsubsRef = useRef<Record<string, () => void>>({});
  const offerCreatedRef = useRef<Set<string>>(new Set());
  const lastMessageAtRef = useRef(0);

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
      setIsFollower(true);
      return;
    }
    const likeRef = doc(db, "likes", getLikeId(user.id, room.hostId));
    const unsubscribe = onSnapshot(likeRef, (snapshot) => {
      setIsFollower(snapshot.exists());
    });
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
      setLiveDuration(formatDuration(Date.now() - (room.startedAt ?? Date.now())));
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
    if (room.chatAccess === "followers" && !isFollower) return false;
    return true;
  }, [room, isFollower, isOnStage]);

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
    const cleaned = sanitizeMessage(chatInput.trim(), room.moderation.filterBadWords);
    setChatInput("");
    setChatError(null);
    try {
      await sendLiveMessage({ roomId, sender: user, text: cleaned, type: "message" });
    } catch (error) {
      console.error(error);
      setChatError("Unable to send message.");
    }
  };

  const handleSendReaction = async (reaction: string) => {
    if (!roomId || !room) return;
    if (!canSendChat) {
      setChatError("Chat is locked right now.");
      return;
    }
    try {
      await sendLiveMessage({
        roomId,
        sender: user,
        text: reaction,
        type: "reaction",
      });
    } catch (error) {
      console.error(error);
      setChatError("Unable to send reaction.");
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
    if (room.joinAccess === "followers" && !isFollower) {
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
      const stream = event.streams[0];
      if (!stream) return;
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
            await pc.setRemoteDescription(data.offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await updateLiveConnection(roomId, connectionId, { answer });
          }
          if (isOfferer && data.answer && !pc.currentRemoteDescription) {
            await pc.setRemoteDescription(data.answer);
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
      connectionUnsubsRef.current[remoteId]?.();
      candidateUnsubsRef.current[remoteId]?.();
      peerConnectionsRef.current[remoteId]?.close();
      delete peerConnectionsRef.current[remoteId];
      delete peerMetaRef.current[remoteId];
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
    Object.entries(peerMetaRef.current).forEach(([remoteId, meta]) => {
      if (meta.offererId !== user.id) return;
      if (offerCreatedRef.current.has(meta.connectionId)) return;
      const pc = peerConnectionsRef.current[remoteId];
      if (!pc) return;
      pc.createOffer()
        .then((offer) => {
          return pc.setLocalDescription(offer).then(() => offer);
        })
        .then((offer) => updateLiveConnection(roomId, meta.connectionId, { offer }))
        .then(() => {
          offerCreatedRef.current.add(meta.connectionId);
        })
        .catch((error) => console.error(error));
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

  return (
    <div className="relative flex h-screen flex-col bg-[#0d0d0d] text-white">
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
        <div className="flex-1 p-4">
          <div className="grid h-full grid-cols-1 gap-3 md:grid-cols-2">
            {stageParticipants.map((participant) => {
              const stream =
                participant.id === user.id ? localStream : remoteStreams[participant.id];
              return (
                <VideoTile
                  key={participant.id}
                  label={participant.label}
                  stream={stream}
                  fallbackSrc={participant.photoUrl}
                  muted={participant.id === user.id}
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
                    (room.joinAccess === "followers" && !isFollower)
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
                          <p className="text-[10px] text-gray-500">Wants to join</p>
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
