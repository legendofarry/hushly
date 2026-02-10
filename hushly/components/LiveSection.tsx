import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Profile } from "../types";
import { createLiveRoom, listenToLiveRooms } from "../../services/liveService";
import type { LiveRoom, UserProfile } from "../../types";

interface Props {
  user: User | null;
  profile?: UserProfile | null;
  onUpgrade: () => void;
  onProfileClick?: (profile: Profile) => void;
  onExit?: () => void;
}

interface Comment {
  id: string;
  user: string;
  text: string;
  color: string;
  isSystem?: boolean;
}

interface Reaction {
  id: number;
  type: string;
  color: string;
  left: number;
}

const reactionTypes = [
  { emoji: "❤️", label: "Love", color: "#f43f5e" },
  { emoji: "🔥", label: "Fire", color: "#fb923c" },
  { emoji: "😂", label: "Laugh", color: "#fbbf24" },
  { emoji: "😮", label: "Wow", color: "#38bdf8" },
  { emoji: "🙌", label: "Respect", color: "#a855f7" },
];

const LiveSection: React.FC<Props> = ({
  user,
  profile,
  onUpgrade,
  onProfileClick,
  onExit,
}) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<
    "browse" | "watch" | "setup" | "countdown" | "broadcast" | "summary"
  >("browse");
  const [showPremium, setShowPremium] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<LiveRoom | null>(null);
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([]);
  const [liveRoomsLoading, setLiveRoomsLoading] = useState(true);
  const [liveRoomsError, setLiveRoomsError] = useState<string | null>(null);
  const [creatingLive, setCreatingLive] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activeReactions, setActiveReactions] = useState<Reaction[]>([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [liveDuration, setLiveDuration] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [commentDraft, setCommentDraft] = useState("");

  // Setup Preferences
  const [streamTitle, setStreamTitle] = useState("");
  const [streamVibe, setStreamVibe] = useState("Casual Chat");
  const [isTitleGenerating, setIsTitleGenerating] = useState(false);

  // Summary Stats
  const [summaryStats, setSummaryStats] = useState({
    peakViewers: 0,
    totalLikes: 0,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const commentEndRef = useRef<HTMLDivElement>(null);
  const streamTimerRef = useRef<number | null>(null);

  const vibes = [
    {
      id: "v1",
      name: "Casual Chat",
      icon: "fa-comments",
      color: "bg-blue-500",
    },
    {
      id: "v2",
      name: "Dating Tips",
      icon: "fa-heart-circle-check",
      color: "bg-rose-500",
    },
    { id: "v3", name: "Night Party", icon: "fa-music", color: "bg-purple-500" },
    { id: "v4", name: "VIP Lounge", icon: "fa-crown", color: "bg-amber-500" },
  ];

  const mockComments = [
    "You look amazing! 🔥",
    "Greetings from Nakuru!",
    "Is this real life? lol",
    "Hushly is the best app for real!",
    "Can you say jambo to my friend?",
    "Keep shining queen! 👑",
    "Loving the vibes here.",
  ];

  const generateTitle = () => {
    setIsTitleGenerating(true);
    const sheng = ["sasa", "noma", "vibez", "freshi", "mtaani", "rada"];
    const tails = ["live", "session", "vibes", "hangout", "chill"];
    const pick = <T,>(items: T[]) =>
      items[Math.floor(Math.random() * items.length)];
    const nextTitle = `${streamVibe} ${pick(tails)} • ${pick(sheng)}`;
    window.setTimeout(() => {
      setStreamTitle(nextTitle);
      setIsTitleGenerating(false);
    }, 300);
  };

  useEffect(() => {
    setLiveRoomsLoading(true);
    const unsubscribe = listenToLiveRooms(
      (rooms) => {
        setLiveRooms(rooms);
        setLiveRoomsLoading(false);
        setLiveRoomsError(null);
      },
      () => {
        setLiveRoomsLoading(false);
        setLiveRoomsError("Unable to load live rooms.");
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (mode !== "watch") return;
    if (!selectedRoom) return;
    const latest = liveRooms.find((room) => room.id === selectedRoom.id);
    if (!latest) {
      setSelectedRoom(null);
      setMode("browse");
      return;
    }
    setSelectedRoom(latest);
  }, [liveRooms, mode, selectedRoom]);
  useEffect(() => {
    if (mode === "watch" || mode === "broadcast") {
      const interval = setInterval(() => {
        if (Math.random() > 0.7) {
          const randomReaction =
            reactionTypes[Math.floor(Math.random() * reactionTypes.length)];
          spawnReaction(randomReaction.emoji, randomReaction.color);
        }
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [mode]);

  useEffect(() => {
    if (mode === "broadcast" || mode === "watch") {
      const interval = setInterval(() => {
        const newComment: Comment = {
          id: Math.random().toString(),
          user: [
            "Kevin",
            "Sarah",
            "Otieno",
            "Achieng",
            "Mike",
            "Zawadi",
            "Babu",
          ][Math.floor(Math.random() * 7)],
          text: mockComments[Math.floor(Math.random() * mockComments.length)],
          color: [
            "text-rose-400",
            "text-sky-400",
            "text-amber-400",
            "text-emerald-400",
          ][Math.floor(Math.random() * 4)],
        };
        setComments((prev) => [...prev.slice(-15), newComment]);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [mode]);

  useEffect(() => {
    if (mode === "broadcast") {
      streamTimerRef.current = window.setInterval(() => {
        setLiveDuration((d) => d + 1);
        setSummaryStats((s) => ({
          ...s,
          peakViewers: Math.max(
            s.peakViewers,
            Math.floor(Math.random() * 50) + 10,
          ),
        }));
      }, 1000);
    } else {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    }
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, [mode]);

  useEffect(() => {
    commentEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const startCameraStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setMode("setup");
      setShowPremium(false);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch (err) {
      alert("Camera/Mic access required to go live!");
      setMode("browse");
    }
  };

  const handleGoLiveInitiate = () => {
    setCreateError(null);
    if (!user?.isPaid) {
      setShowPremium(true);
    } else {
      startCameraStream();
    }
  };

  const startCountdown = () => {
    setCreateError(null);
    setMode("countdown");
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          const hostProfile = profile;
          if (!hostProfile) {
            setCreateError("Unable to start live. Profile missing.");
            setMode("browse");
            return 0;
          }
          setCreatingLive(true);
          createLiveRoom({
            host: hostProfile,
            title: streamTitle,
            type: "solo",
            allowGuests: true,
            chatAccess: "everyone",
            joinAccess: "everyone",
            moderation: { filterBadWords: true, muteNewUsers: false },
            privacy: "public",
            tags: [streamVibe],
            maxGuests: 4,
          })
            .then((roomId) => {
              navigate(`/live/${roomId}`);
            })
            .catch((error) => {
              console.error(error);
              setCreateError("Unable to start live right now.");
              setMode("browse");
            })
            .finally(() => {
              setCreatingLive(false);
            });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const endStream = () => {
    setSummaryStats((s) => ({ ...s, totalLikes }));
    setMode("summary");
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const spawnReaction = (type: string, color: string) => {
    const id = Date.now() + Math.random();
    const newReaction = { id, type, color, left: Math.random() * 40 + 60 };
    setActiveReactions((prev) => [...prev, newReaction]);
    setTotalLikes((prev) => prev + 1);
    setTimeout(() => {
      setActiveReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2500);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getRoomAspect = (index: number) =>
    index % 2 === 0 ? "aspect-[9/25]" : "aspect-[16/10]";

  const handleSendComment = () => {
    if (mode !== "watch") return;
    const text = commentDraft.trim();
    if (!text) return;
    const newComment: Comment = {
      id: Math.random().toString(),
      user: user?.name || user?.nickname || "You",
      text,
      color: "text-white",
    };
    setComments((prev) => [...prev.slice(-15), newComment]);
    setCommentDraft("");
  };

  if (showPremium) {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center bg-slate-950 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-24 h-24 bg-gradient-to-br from-rose-500 to-indigo-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-rose-500/20">
          <i className="fa-solid fa-bolt-lightning text-white text-5xl"></i>
        </div>
        <h2 className="text-4xl font-black text-white mb-4 italic tracking-tighter">
          UNLEASH THE <span className="text-rose-500">STAR</span>
        </h2>
        <p className="text-slate-400 mb-10 leading-relaxed font-medium px-4">
          Broadcasting is for the elite. Verified members get featured in the
          Discovery Room and enjoy priority placement.
        </p>
        <div className="w-full space-y-4">
          <button
            onClick={() => {
              onUpgrade();
              setShowPremium(false);
            }}
            className="w-full gradient-primary py-5 rounded-2xl font-black text-white shadow-xl active:scale-95 transition-all uppercase tracking-widest text-sm"
          >
            Upgrade to Gold
          </button>
          {/* CRITICAL: Allowed user access to Go Live by clicking Maybe Later */}
          <button
            onClick={startCameraStream}
            className="w-full bg-slate-900 text-slate-500 py-4 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
          >
            Maybe Later
          </button>
        </div>
      </div>
    );
  }

  if (mode === "setup") {
    return (
      <div
        className="p-6 h-full flex flex-col bg-[#080808] animate-in slide-in-from-bottom duration-500 no-scrollbar overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <header className="flex items-center justify-between mb-8 sticky top-0 bg-[#080808]/80 backdrop-blur-md z-10 py-2">
          <button
            onClick={() => setMode("browse")}
            className="text-slate-500 font-black text-[10px] uppercase tracking-widest"
          >
            Cancel
          </button>
          <h2 className="text-white font-black uppercase tracking-widest italic flex items-center gap-2">
            <i className="fa-solid fa-tower-broadcast text-rose-500"></i> Go
            Live <span className="text-slate-500">Setup</span>
          </h2>
          <div className="w-10"></div>
        </header>

        <div className="space-y-8 pb-32">
          {/* CAMERA PREVIEW */}
          <div className="relative aspect-video bg-slate-900 rounded-[2rem] overflow-hidden border-2 border-white/5 shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-4 left-6 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] text-white font-black uppercase tracking-widest">
                Mic & Video OK
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                  Stream Title
                </label>
                <button
                  onClick={generateTitle}
                  disabled={isTitleGenerating}
                  className="text-rose-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 active:scale-90 transition-all"
                >
                  <i
                    className={`fa-solid fa-wand-sparkles ${isTitleGenerating ? "animate-spin" : ""}`}
                  ></i>{" "}
                  Quick Title
                </button>
              </div>
              <input
                value={streamTitle}
                onChange={(e) => setStreamTitle(e.target.value)}
                placeholder="e.g. My afternoon vibes! 🥂"
                className="w-full bg-[#121212] border border-white/5 p-5 rounded-2xl text-white outline-none focus:border-rose-500 transition-all placeholder:text-white/10"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                Vibe
              </label>
              <div className="grid grid-cols-2 gap-3">
                {vibes.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setStreamVibe(v.name)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${streamVibe === v.name ? `bg-rose-500/10 border-rose-500 text-rose-500 shadow-lg` : "bg-[#121212] border-white/5 text-slate-500"}`}
                  >
                    <i className={`fa-solid ${v.icon}`}></i>
                    <span className="text-[11px] font-bold uppercase tracking-widest">
                      {v.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#080808] to-transparent z-20">
          <button
            onClick={startCountdown}
            disabled={!streamTitle || creatingLive}
            className="w-full gradient-primary text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-rose-500/20 active:scale-95 transition-all text-lg uppercase tracking-[0.2em] italic disabled:opacity-30"
          >
            {creatingLive ? "Starting..." : "Go Live Now"}
          </button>
        </div>
      </div>
    );
  }

  if (mode === "countdown") {
    return (
      <div className="fixed inset-0 z-[130] bg-black flex flex-col items-center justify-center animate-in fade-in duration-500">
        <div className="text-center relative">
          <div className="text-[180px] font-black text-rose-500 tracking-tighter animate-ping absolute inset-0 flex items-center justify-center opacity-20">
            {countdown}
          </div>
          <div className="text-[120px] font-black text-white tracking-tighter relative z-10 animate-bounce">
            {countdown}
          </div>
          <p className="text-xs text-rose-500 font-black uppercase tracking-[0.4em] mt-12">
            Preparing your Safari...
          </p>
        </div>
      </div>
    );
  }

  if (mode === "broadcast" || mode === "watch") {
    const isOwner = mode === "broadcast";
    const streamName = isOwner
      ? user?.name || user?.nickname || "You"
      : selectedRoom?.hostNickname || "Live Host";
    const streamAvatar = isOwner
      ? user?.photos?.[0]
      : selectedRoom?.hostPhotoUrl;
    const streamCover = isOwner ? null : selectedRoom?.hostPhotoUrl;
    const viewerCount = isOwner
      ? summaryStats.peakViewers
      : (selectedRoom?.viewerCount ?? 0);
    const likeCount = isOwner
      ? totalLikes
      : (selectedRoom?.likeCount ?? 0) + totalLikes;

    return (
      <div className="fixed inset-0 z-[120] bg-black animate-in fade-in duration-300 flex flex-col overflow-hidden">
        {/* FEED */}
        <div className="absolute inset-0 z-0">
          {isOwner ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : streamCover ? (
            <img
              src={streamCover}
              className="w-full h-full object-cover"
              alt=""
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-black to-slate-950"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>
        </div>

        {/* TOP BAR */}
        <div className="relative z-10 px-6 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md p-1 pr-4 rounded-full border border-white/10">
              {streamAvatar ? (
                <img
                  src={streamAvatar}
                  className="w-8 h-8 rounded-full border border-white/20 object-cover"
                  alt=""
                />
              ) : (
                <div className="w-8 h-8 rounded-full border border-white/20 bg-slate-800 flex items-center justify-center text-[10px] text-white font-black">
                  {streamName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-[10px] font-black text-white leading-none mb-0.5">
                  {streamName}
                </p>
                <p className="text-[8px] text-slate-400 font-bold uppercase">
                  {isOwner ? formatDuration(liveDuration) : "Live now"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 flex items-center gap-2">
                <i className="fa-solid fa-heart text-rose-500 text-[9px]"></i>
                <span className="text-[10px] font-black text-white">
                  {likeCount}
                </span>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
              <i className="fa-solid fa-eye text-white text-[10px]"></i>
              <span className="text-[10px] font-black text-white">
                {viewerCount}
              </span>
            </div>
            {isOwner ? (
              <button
                onClick={endStream}
                className="bg-rose-600 hover:bg-rose-700 px-5 py-2.5 rounded-2xl text-[11px] font-black text-white uppercase tracking-widest shadow-[0_10px_30px_rgba(225,29,72,0.4)] active:scale-90 transition-all border border-white/20"
              >
                End
              </button>
            ) : (
              <button
                onClick={() => setMode("browse")}
                className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 active:scale-90 transition-all"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
        </div>

        {/* REACTION STREAM (Floating Layer) */}
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          {activeReactions.map((r) => (
            <div
              key={r.id}
              className="absolute bottom-24 animate-reaction-float text-4xl"
              style={{
                left: `${r.left}%`,
                color: r.color,
                filter: `drop-shadow(0 0 10px ${r.color}44)`,
              }}
            >
              {r.type}
            </div>
          ))}
        </div>

        {/* COMMENTS */}
        <div className="relative z-10 flex-1 flex flex-col justify-end px-6 overflow-hidden">
          {isOwner && (
            <div className="fixed top-[10%] mb-4 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl backdrop-blur-md animate-in slide-in-from-top">
              <p className="text-rose-500 font-black text-[9px] uppercase mb-1">
                Stream Title
              </p>
              <p className="text-white text-[11px] font-bold">
                "{streamTitle}"
              </p>
            </div>
          )}
          <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-3 mask-gradient">
            {comments.map((c) => (
              <div
                key={c.id}
                className="animate-in slide-in-from-left duration-300 flex gap-2 items-start"
              >
                <span
                  className={`font-black text-xs whitespace-nowrap ${c.color}`}
                >
                  {c.user}
                </span>
                <span className="text-white/90 text-xs font-medium leading-tight">
                  {c.text}
                </span>
              </div>
            ))}
            <div ref={commentEndRef} />
          </div>
        </div>

        {/* INTERACTION TRAY */}
        <div className="relative z-10 p-6 flex flex-col gap-4">
          {!isOwner && (
            <div className="flex justify-between items-center bg-black/20 backdrop-blur-md p-2 rounded-2xl border border-white/5">
              {reactionTypes.map((r) => (
                <button
                  key={r.label}
                  onClick={() => spawnReaction(r.emoji, r.color)}
                  className="w-10 h-10 flex items-center justify-center text-2xl hover:scale-125 active:scale-90 transition-transform"
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSendComment();
                  }
                }}
                placeholder="Type a message..."
                className="w-full bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl text-white outline-none placeholder:text-white/40 text-sm"
              />
            </div>
            {!isOwner && (
              <button
                onClick={handleSendComment}
                className="h-14 px-5 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-90 transition-all"
              >
                Send
              </button>
            )}
            {isOwner && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-2xl flex gap-2">
                {reactionTypes.slice(0, 3).map((r) => (
                  <div
                    key={r.label}
                    className="text-lg opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-default"
                  >
                    {r.emoji}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <style>{`
            @keyframes reaction-float { 
              0% { transform: translateY(0) scale(0.5); opacity: 0; } 
              15% { opacity: 1; transform: translateY(-30px) scale(1.2); }
              100% { transform: translateY(-400px) scale(1.5) rotate(${Math.random() * 60 - 30}deg); opacity: 0; } 
            }
            .animate-reaction-float { animation: reaction-float 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
            .mask-gradient { -webkit-mask-image: linear-gradient(to top, black 80%, transparent 100%); mask-image: linear-gradient(to top, black 80%, transparent 100%); }
         `}</style>
      </div>
    );
  }

  if (mode === "summary") {
    return (
      <div className="fixed inset-0 z-[150] bg-slate-950 flex flex-col p-8 animate-in fade-in zoom-in overflow-y-auto no-scrollbar">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-rose-500 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-rose-500/20 relative">
            <i className="fa-solid fa-flag-checkered text-white text-4xl"></i>
            <div className="absolute -top-2 -right-2 bg-amber-500 w-8 h-8 rounded-full flex items-center justify-center border-4 border-slate-950">
              <i className="fa-solid fa-star text-[10px] text-white"></i>
            </div>
          </div>

          <h2 className="text-5xl font-black text-white mb-2 uppercase tracking-tighter italic leading-none">
            Safari <span className="text-rose-500">Over!</span>
          </h2>
          <p className="text-slate-500 mb-12 font-black uppercase tracking-[0.3em] text-[10px]">
            Great session, {user?.name}!
          </p>

          <div className="w-full max-w-md grid grid-cols-2 gap-5 mb-12">
            <div className="bg-slate-900 border border-white/5 p-8 rounded-[3rem] flex flex-col items-center group active:scale-95 transition-all shadow-xl">
              <i className="fa-solid fa-eye text-indigo-500 text-xl mb-3"></i>
              <p className="text-3xl font-black text-white leading-none mb-1">
                {summaryStats.peakViewers}
              </p>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                Peak Viewers
              </p>
            </div>
            <div className="bg-slate-900 border border-white/5 p-8 rounded-[3rem] flex flex-col items-center group active:scale-95 transition-all shadow-xl">
              <i className="fa-solid fa-heart text-rose-500 text-xl mb-3 animate-pulse"></i>
              <p className="text-3xl font-black text-white leading-none mb-1">
                {summaryStats.totalLikes}
              </p>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                Tribe Love
              </p>
            </div>
            <div className="bg-slate-900 border border-white/5 p-8 rounded-[3rem] flex flex-col items-center group active:scale-95 transition-all shadow-xl">
              <i className="fa-solid fa-clock text-slate-500 text-xl mb-3"></i>
              <p className="text-3xl font-black text-white leading-none mb-1">
                {formatDuration(liveDuration)}
              </p>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                Broadcast Time
              </p>
            </div>
          </div>

          <div className="w-full space-y-4">
            <button
              onClick={() => setMode("browse")}
              className="w-full bg-white text-slate-950 font-black py-6 rounded-[2rem] shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-sm"
            >
              Return to Hub
            </button>
            <button className="w-full bg-slate-900 text-slate-500 font-black py-4 rounded-[2rem] border border-white/5 transition-all uppercase tracking-widest text-[10px]">
              Share Moments
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-2 h-full flex flex-col bg-slate-950 animate-in fade-in duration-500 no-scrollbar">
      <div className="flex items-center justify-between mb-8 px-2">
        <div>
          <h2 className="text-xs font-black text-rose-500 uppercase tracking-[0.4em]">
            Hush Live
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGoLiveInitiate}
            className="bg-rose-500/10 border border-rose-500/30 px-6 py-2 rounded-full text-[10px] font-black uppercase text-rose-500 hover:bg-rose-500/20 transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-tower-broadcast animate-pulse"></i> Go
            Live
          </button>

          {onExit && (
            <button
              onClick={onExit}
              className="w-10 h-10 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-center text-rose-500 active:scale-90 transition-all hover:bg-rose-500 hover:text-white"
            >
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
            </button>
          )}
        </div>
      </div>
      {createError && (
        <div className="mx-2 mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[10px] uppercase tracking-widest text-rose-300">
          {createError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {liveRoomsLoading && (
          <div className="px-4 py-6 text-xs uppercase tracking-widest text-slate-500 font-black">
            Loading live rooms...
          </div>
        )}
        {liveRoomsError && (
          <div className="px-4 py-6 text-xs uppercase tracking-widest text-rose-400 font-black">
            {liveRoomsError}
          </div>
        )}
        {!liveRoomsLoading && !liveRoomsError && liveRooms.length === 0 && (
          <div className="px-4 py-10 text-center text-slate-500 text-xs uppercase tracking-[0.3em] font-black">
            No one is live right now.
          </div>
        )}
        <div className="columns-2 gap-[0.5rem]">
          {liveRooms.map((room, index) => (
            <div key={room.id} className="break-inside-avoid mb-2">
              <button
                onClick={() => {
                  navigate(`/live/${room.id}`);
                }}
                className={`w-full ${getRoomAspect(index)} bg-slate-900 rounded-[0.8rem] overflow-hidden relative border border-white/5 group shadow-2xl transition-all active:scale-95`}
              >
                {room.hostPhotoUrl ? (
                  <img
                    src={room.hostPhotoUrl}
                    className="w-full h-full object-cover transition-transform duration-[4s] group-hover:scale-110"
                    alt=""
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 via-black to-slate-950"></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

                <div className="absolute top-4 left-4 flex items-center gap-1.5">
                  <div className="bg-rose-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase text-white flex items-center gap-1 shadow-lg">
                    <div className="w-1 h-1 bg-white rounded-full animate-ping"></div>{" "}
                    LIVE
                  </div>
                </div>

                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-black text-white border border-white/10 flex items-center gap-1">
                  <i className="fa-solid fa-eye text-[8px] text-slate-400"></i>{" "}
                  {room.viewerCount} fans
                </div>

                <div className="absolute bottom-5 left-5 right-5 text-left space-y-1">
                  <p className="text-white font-black text-[12px] truncate">
                    {room.hostNickname}
                  </p>
                  <p className="text-[10px] text-slate-300 truncate">
                    {room.title}
                  </p>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(LiveSection);
