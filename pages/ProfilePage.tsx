
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LiveAchievement, UserProfile } from "../types";
import AppImage from "../components/AppImage";
import { OWNER_EMAIL } from "../services/paymentService";
import { uploadAudioToCloudinary } from "../services/cloudinaryService";
import { updateUserProfile } from "../services/userService";
import AudioWaveform from "../components/AudioWaveform";
import { BIO_MAX_WORDS, clampBio } from "../services/bioUtils";
import { listenToHostLiveAchievements } from "../services/liveAchievementService";

interface Props {
  user: UserProfile;
  onLogout: () => void;
}

const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  Nairobi: { lat: -1.286389, lon: 36.817223 },
  Mombasa: { lat: -4.043477, lon: 39.668206 },
  Kisumu: { lat: -0.10221, lon: 34.76171 },
  Nakuru: { lat: -0.3031, lon: 36.08 },
  Eldoret: { lat: 0.514277, lon: 35.26978 },
  Thika: { lat: -1.033333, lon: 37.066667 },
  Malindi: { lat: -3.217476, lon: 40.119106 },
  Kitale: { lat: 1.01572, lon: 35.00622 },
};

const parseAgeRange = (value?: string) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.endsWith("+")) {
    const min = Number(trimmed.slice(0, -1));
    if (!Number.isFinite(min)) return null;
    return { min, max: Number.POSITIVE_INFINITY };
  }
  const parts = trimmed.split("-");
  if (parts.length !== 2) return null;
  const min = Number(parts[0]);
  const max = Number(parts[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
};

const formatAgeRange = (min: number, max: number) =>
  max === Number.POSITIVE_INFINITY ? `${min}+` : `${min}-${max}`;

const ProfilePage: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const isOwnProfile = true;
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locError, setLocError] = useState<{
    title: string;
    msg: string;
    icon: string;
  } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  const [voiceIntroUrl, setVoiceIntroUrl] = useState(
    user.voiceIntroUrl ?? "",
  );
  const [voiceIntroDuration, setVoiceIntroDuration] = useState(
    user.voiceIntroDuration ?? 0,
  );
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [voicePosition, setVoicePosition] = useState(0);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [voicePreviewBlob, setVoicePreviewBlob] = useState<Blob | null>(null);
  const [liveAchievements, setLiveAchievements] = useState<LiveAchievement[]>(
    [],
  );
  const voiceSecondsRef = useRef(0);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const MIN_VOICE_SECONDS = 10;
  const MAX_VOICE_SECONDS = 20;

  const parsedAge = useMemo(() => parseAgeRange(user.ageRange), [user.ageRange]);
  const userCity = useMemo(() => {
    const area = (user.area || "Nairobi").trim();
    return area.split(" - ")[0] || "Nairobi";
  }, [user.area]);
  const ageSpan = useMemo(() => {
    if (!parsedAge) return 4;
    if (parsedAge.max === Number.POSITIVE_INFINITY) return null;
    const span = parsedAge.max - parsedAge.min;
    return Number.isFinite(span) ? span : 4;
  }, [parsedAge]);

  const [editName, setEditName] = useState(user.nickname || "");
  const [editAge, setEditAge] = useState(parsedAge?.min ?? 24);
  const [editLocation, setEditLocation] = useState(userCity);
  const [editBio, setEditBio] = useState(clampBio(user.bio || ""));

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setEditName(user.nickname || "");
    const nextParsed = parseAgeRange(user.ageRange);
    setEditAge(nextParsed?.min ?? 24);
    setEditLocation(userCity);
    setEditBio(clampBio(user.bio || ""));
  }, [user.nickname, user.ageRange, userCity, user.bio]);

  useEffect(() => {
    if (!user.id) return;
    const unsubscribe = listenToHostLiveAchievements(
      user.id,
      setLiveAchievements,
    );
    return () => unsubscribe();
  }, [user.id]);

  useEffect(() => {
    setVoiceIntroUrl(user.voiceIntroUrl ?? "");
    setVoiceIntroDuration(user.voiceIntroDuration ?? 0);
  }, [user.voiceIntroUrl, user.voiceIntroDuration]);

  useEffect(() => {
    return () => {
      if (voicePreviewUrl) {
        URL.revokeObjectURL(voicePreviewUrl);
      }
      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [voicePreviewUrl]);

  const isOwner =
    user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const premiumActive =
    Boolean(user.isPremium) &&
    (!user.premiumExpiresAt || user.premiumExpiresAt > Date.now());
  const isPaid = isOwner || premiumActive;

  const formatVoiceTime = (value: number) => {
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const toggleVoicePlayback = () => {
    if (!audioRef.current) return;
    if (voicePlaying) {
      audioRef.current.pause();
    } else {
      void audioRef.current.play();
    }
  };

  const stopVoiceRecording = () => {
    if (!voiceRecording) return;
    if (voiceTimerRef.current) {
      window.clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    voiceRecorderRef.current?.stop();
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
    voiceStreamRef.current = null;
    setVoiceRecording(false);
  };

  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError("Voice recording is not supported on this device.");
      return;
    }
    setVoiceError(null);
    setVoiceSeconds(0);
    voiceSecondsRef.current = 0;
    setVoiceRecording(true);
    voiceChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      const preferredType = MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus",
      )
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = new MediaRecorder(
        stream,
        preferredType ? { mimeType: preferredType } : undefined,
      );
      voiceRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          voiceChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const duration = voiceSecondsRef.current;
        const chunks = voiceChunksRef.current;
        if (!chunks.length) {
          setVoiceError("No audio captured. Try again.");
          return;
        }
        if (duration < MIN_VOICE_SECONDS) {
          setVoiceError(
            `Record at least ${MIN_VOICE_SECONDS} seconds for your intro.`,
          );
          setVoicePreviewBlob(null);
          if (voicePreviewUrl) {
            URL.revokeObjectURL(voicePreviewUrl);
            setVoicePreviewUrl(null);
          }
          return;
        }
        const blob = new Blob(chunks, { type: chunks[0].type || "audio/webm" });
        if (voicePreviewUrl) {
          URL.revokeObjectURL(voicePreviewUrl);
        }
        const previewUrl = URL.createObjectURL(blob);
        setVoicePreviewBlob(blob);
        setVoicePreviewUrl(previewUrl);
        setVoiceError(null);
      };

      recorder.start();
      voiceTimerRef.current = window.setInterval(() => {
        setVoiceSeconds((prev) => {
          const next = prev + 1;
          voiceSecondsRef.current = next;
          if (next >= MAX_VOICE_SECONDS) {
            stopVoiceRecording();
          }
          return next;
        });
      }, 1000);
    } catch (error) {
      console.error(error);
      setVoiceError("Unable to access microphone.");
      setVoiceRecording(false);
    }
  };

  const resetVoicePreview = () => {
    if (voicePreviewUrl) {
      URL.revokeObjectURL(voicePreviewUrl);
    }
    setVoicePreviewUrl(null);
    setVoicePreviewBlob(null);
    setVoiceSeconds(0);
    voiceSecondsRef.current = 0;
    setVoiceError(null);
  };
  const handleSaveVoiceIntro = async () => {
    if (!voicePreviewBlob) {
      setVoiceError("Record your voice intro before saving.");
      return;
    }
    const duration = voiceSecondsRef.current;
    if (duration < MIN_VOICE_SECONDS) {
      setVoiceError(`Record at least ${MIN_VOICE_SECONDS} seconds.`);
      return;
    }
    setVoiceUploading(true);
    setVoiceError(null);
    try {
      const voiceFile = new File(
        [voicePreviewBlob],
        `voice-intro-${Date.now()}.webm`,
        { type: voicePreviewBlob.type || "audio/webm" },
      );
      const uploadedUrl = await uploadAudioToCloudinary(voiceFile);
      await updateUserProfile(user.id, {
        voiceIntroUrl: uploadedUrl,
        voiceIntroDuration: duration,
        voiceIntroUpdatedAt: Date.now(),
      });
      setVoiceIntroUrl(uploadedUrl);
      setVoiceIntroDuration(duration);
      setShowVoiceModal(false);
      resetVoicePreview();
    } catch (error) {
      console.error(error);
      setVoiceError("Unable to save voice intro. Please try again.");
    } finally {
      setVoiceUploading(false);
    }
  };

  const handleOpenMap = () => {
    setShowLocationMap(true);
  };

  const generateAiInsights = () => {
    setIsLoadingInsight(true);
    const tips = [
      "Keep your photos clear and well-lit, no blurry shots.",
      "Add one fun detail in your bio to make replies easy.",
      "Reply quickly to new chats while the vibe is warm.",
    ];
    const insight = tips.map((tip, index) => `${index + 1}. ${tip}`).join("\n");
    window.setTimeout(() => {
      setAiInsight(insight);
      setIsLoadingInsight(false);
    }, 250);
  };

  const handleOpenAnalytics = () => {
    setShowAnalytics(true);
    if (!aiInsight) {
      generateAiInsights();
    }
  };

  const handlePinLocation = async () => {
    setIsLocating(true);
    setLocError(null);

    if (!navigator.geolocation) {
      setLocError({
        title: "Not Supported",
        msg: "Your browser doesn't support automatic location pinning.",
        icon: "fa-circle-exclamation",
      });
      setIsLocating(false);
      return;
    }

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        let closestCity: string | null = null;
        let closestDistance = Number.POSITIVE_INFINITY;

        Object.entries(CITY_COORDS).forEach(([city, coords]) => {
          const dLat = latitude - coords.lat;
          const dLon = longitude - coords.lon;
          const distance = Math.sqrt(dLat * dLat + dLon * dLon);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestCity = city;
          }
        });

        if (closestCity) {
          setEditLocation(closestCity);
        } else {
          setLocError({
            title: "Out of Bounds",
            msg: "We found your location but it's outside our current Safari zones.",
            icon: "fa-map-pin",
          });
        }
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setLocError({
          title: "GPS Timeout",
          msg: "Satellite signal is too weak. Try moving near a window.",
          icon: "fa-satellite-dish",
        });
      },
      geoOptions,
    );
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", aspectRatio: 1 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setCapturedImage(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setCapturedImage(dataUrl);
      }
    }
  };

  const savePhoto = async () => {
    if (!capturedImage) return;
    try {
      await updateUserProfile(user.id, {
        photoUrl: capturedImage,
      });
    } catch (error) {
      console.error(error);
      alert("Unable to save photo right now.");
      return;
    }
    stopCamera();
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      alert("Name cannot be empty!");
      return;
    }
    if (!editLocation) {
      alert("Please pin your location to continue!");
      return;
    }
    const minAge = Number.isFinite(editAge) ? Math.max(editAge, 18) : 24;
    let nextAgeRange = `${minAge}`;
    if (ageSpan === null) {
      nextAgeRange = formatAgeRange(minAge, Number.POSITIVE_INFINITY);
    } else {
      nextAgeRange = formatAgeRange(minAge, minAge + (ageSpan ?? 4));
    }

    try {
      await updateUserProfile(user.id, {
        nickname: editName.trim(),
        ageRange: nextAgeRange,
        area: editLocation,
        bio: clampBio(editBio),
      });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      alert("Unable to save profile right now.");
    }
  };

  const performLogout = () => {
    setIsLoggingOut(true);
    window.setTimeout(() => {
      onLogout();
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const getOsmUrl = () => {
    const coords = CITY_COORDS[userCity] || CITY_COORDS.Nairobi;
    const { lat, lon } = coords;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.02}%2C${lat - 0.02}%2C${lon + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lon}`;
  };

  const handleCopyCoords = () => {
    const coords = CITY_COORDS[userCity] || CITY_COORDS.Nairobi;
    navigator.clipboard.writeText(`${coords.lat}, ${coords.lon}`);
    alert("Coordinates copied to clipboard!");
  };

  const achievements = useMemo(() => {
    if (liveAchievements.length === 0) return [];
    const seen = new Set<string>();
    const items: { id: string; icon: string; title: string }[] = [];
    const sorted = [...liveAchievements].sort(
      (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
    );
    sorted.forEach((achievement) => {
      const key = achievement.key || achievement.id;
      if (seen.has(key)) return;
      seen.add(key);
      const icon =
        achievement.type === "duration_milestone"
          ? "⏱️"
          : achievement.type === "likes_first"
            ? "💖"
            : "❤️";
      items.push({
        id: key,
        icon,
        title: achievement.label || "Live Achievement",
      });
    });
    return items;
  }, [liveAchievements]);

  return (
    <div className="min-h-full bg-slate-950 flex flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-slate-950/90 px-6 py-4 backdrop-blur-xl">
        <button
          onClick={() => navigate("/discover")}
          className="group flex h-10 w-10 items-center justify-center rounded-full bg-white/5 transition-all hover:bg-white/10 active:scale-90"
          aria-label="Back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-400 group-hover:text-white"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white">
          My Profile
        </h1>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="group flex h-10 w-10 items-center justify-center rounded-full bg-white/5 transition-all hover:bg-white/10 active:scale-90"
          aria-label="Log out"
        >
          <i className="fa-solid fa-ghost text-gray-400 group-hover:text-white"></i>
        </button>
      </header>
      {!isOwnProfile && (
        <div className="pt-12 px-6 flex justify-between items-center z-40 bg-slate-950/50 backdrop-blur-md pb-4">
          <button className="w-10 h-10 flex items-center justify-center text-white bg-slate-900 rounded-full border border-white/5">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <h1 className="text-xl font-black italic text-white tracking-tighter uppercase">
            {user.nickname}'s Profile
          </h1>
          <button className="w-10 h-10 flex items-center justify-center text-white bg-slate-900 rounded-full border border-white/5">
            <i className="fa-solid fa-ellipsis"></i>
          </button>
        </div>
      )}

      <div
        className={`flex flex-col items-center ${
          isOwnProfile ? "pt-16" : "pt-8"
        } pb-12 animate-in fade-in duration-500`}
      >
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-full border-4 border-rose-500 p-1 relative shadow-2xl shadow-rose-500/20 overflow-hidden">
            <AppImage
              src={user.photoUrl}
              className="w-full h-full rounded-full object-cover"
              alt=""
            />
          </div>
          {isOwnProfile && (
            <button
              onClick={startCamera}
              className="absolute bottom-0 right-0 w-10 h-10 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-rose-500 shadow-xl active:scale-90 transition-transform"
            >
              <i className="fa-solid fa-camera"></i>
            </button>
          )}
        </div>
        <h2 className="text-3xl font-black text-white">
          {user.nickname}, {parsedAge?.min ?? user.ageRange}
        </h2>

        <button
          onClick={handleOpenMap}
          className="text-slate-500 flex items-center gap-2 mb-4 hover:text-rose-400 transition-colors group active:scale-95"
        >
          <i className="fa-solid fa-location-dot text-rose-500 group-hover:animate-bounce"></i>
          <span className="underline underline-offset-4 decoration-rose-500/20">
            {userCity}, Kenya
          </span>
        </button>

        {isOwnProfile ? (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-rose-500/10 border border-rose-500/30 px-6 py-2 rounded-full text-xs font-bold uppercase text-rose-500 hover:bg-rose-500/20 transition-all mb-6 flex items-center gap-2"
          >
            <i className="fa-solid fa-pen-to-square"></i> Edit Profile
          </button>
        ) : null}

        {isOwnProfile && (
          <div className="w-full grid grid-cols-2 gap-4 px-4">
            <button
              onClick={handleOpenAnalytics}
              className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl text-center active:scale-95 transition-all group"
            >
              <p className="text-2xl font-black text-white group-hover:text-rose-500 transition-colors">
                42
              </p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Matches
              </p>
            </button>
            <button
              onClick={handleOpenAnalytics}
              className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl text-center active:scale-95 transition-all group"
            >
              <p className="text-2xl font-black text-white group-hover:text-rose-500 transition-colors">
                1.2k
              </p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Likes
              </p>
            </button>
          </div>
        )}
      </div>

      {showLocationMap && (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col animate-in slide-in-from-bottom duration-500">
          <header className="relative z-10 p-6 flex items-center justify-between bg-slate-950/90 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/20">
                <i className="fa-solid fa-map-pin text-rose-500"></i>
              </div>
              <div>
                <h3 className="text-white font-black uppercase tracking-widest italic leading-none">
                  {userCity}
                </h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">
                  Discovery Region
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCopyCoords}
                className="w-12 h-12 bg-slate-900/50 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/10 active:scale-90 transition-all"
              >
                <i className="fa-solid fa-copy"></i>
              </button>
              <button
                onClick={() => setShowLocationMap(false)}
                className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/10 active:scale-90 transition-all"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </header>

          <div className="flex-1 relative bg-slate-900 overflow-hidden">
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight={0}
              marginWidth={0}
              src={getOsmUrl()}
              style={{
                border: "none",
                filter:
                  "invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)",
              }}
              title="OpenStreetMap Location"
            />

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
              <div className="relative animate-float">
                <div className="w-16 h-16 bg-rose-500 rounded-t-full rounded-bl-full rotate-45 flex items-center justify-center shadow-[0_20px_40px_rgba(244,63,94,0.4)] border-2 border-white/20">
                  <i className="fa-solid fa-heart text-white text-xl -rotate-45"></i>
                </div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-4 h-4 bg-rose-500/40 rounded-full blur-md animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 mb-24 px-4">
        {isOwnProfile && !isPaid && (
          <button
            onClick={() => navigate("/discover?view=plans")}
            className="w-full gradient-primary p-6 rounded-3xl flex items-center justify-between shadow-2xl shadow-rose-500/20 transition-all active:scale-95"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                <i className="fa-solid fa-crown text-xl"></i>
              </div>
              <div className="text-left">
                <p className="text-white font-black uppercase tracking-tighter">
                  Get Gold Status
                </p>
                <p className="text-white/70 text-xs">
                  Unlock all premium features
                </p>
              </div>
            </div>
            <i className="fa-solid fa-chevron-right text-white"></i>
          </button>
        )}

        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
            Bio
          </h3>
          <p className="text-slate-300 text-sm italic">
            "{user.bio || "No bio yet."}"
          </p>
        </div>

        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
              Voice Intro
            </h3>
            <button
              onClick={() => setShowVoiceModal(true)}
              className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-[9px] font-black uppercase tracking-widest border border-rose-500/30 active:scale-95 transition-transform"
            >
              Re-record
            </button>
          </div>

          {voiceIntroUrl ? (
            <div className="flex items-center gap-4">
              <button
                onClick={toggleVoicePlayback}
                className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-rose-400"
              >
                {voicePlaying ? "Pause" : "Play"}
              </button>
              <div className="flex-1">
                <AudioWaveform
                  src={voiceIntroUrl}
                  progress={
                    voiceIntroDuration
                      ? Math.min(voicePosition / voiceIntroDuration, 1)
                      : 0
                  }
                  className="mb-2"
                />
                <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
                  <span>{formatVoiceTime(voicePosition)}</span>
                  <span>
                    {voiceIntroDuration
                      ? formatVoiceTime(voiceIntroDuration)
                      : "0:00"}
                  </span>
                </div>
              </div>
              <audio
                ref={audioRef}
                src={voiceIntroUrl}
                preload="metadata"
                controlsList="nodownload noplaybackrate"
                onTimeUpdate={(event) => {
                  const target = event.currentTarget;
                  setVoicePosition(target.currentTime);
                }}
                onLoadedMetadata={(event) => {
                  const duration = event.currentTarget.duration;
                  if (!voiceIntroDuration && Number.isFinite(duration)) {
                    setVoiceIntroDuration(Math.round(duration));
                  }
                }}
                onPlay={() => setVoicePlaying(true)}
                onPause={() => setVoicePlaying(false)}
                onEnded={() => {
                  setVoicePlaying(false);
                  setVoicePosition(0);
                }}
                className="hidden"
              />
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Record a 10-20 second intro so people can hear your vibe.
            </p>
          )}
        </div>

        {isOwnProfile && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-medal text-amber-500"></i> Achievements
            </h3>
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className="min-w-[120px] aspect-square bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center justify-center p-4"
                >
                  <span className="text-4xl mb-2">{ach.icon}</span>
                  <p className="text-[10px] font-black text-white uppercase tracking-tighter text-center">
                    {ach.title}
                  </p>
                </div>
              ))}
              {achievements.length === 0 && (
                <p className="text-slate-500 text-sm">
                  No achievements unlocked yet. Keep swiping!
                </p>
              )}
            </div>
          </div>
        )}

        {isOwnProfile && (
          <div className="bg-slate-900 rounded-3xl divide-y divide-slate-800 border border-slate-800">
            <button
              onClick={handleOpenAnalytics}
              className="w-full flex items-center justify-between p-5 text-left text-white font-medium hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-chart-line text-slate-500"></i> View
                Insights & Analytics
              </div>
              <i className="fa-solid fa-chevron-right text-xs text-slate-700"></i>
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-between p-5 text-left text-rose-500 font-bold hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-arrow-right-from-bracket"></i> Logout
              </div>
            </button>
          </div>
        )}
      </div>

      {showLogoutConfirm && isOwnProfile && (
        <div className="fixed inset-0 z-[150] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-slate-900 border border-white/5 rounded-[3rem] p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-rose-500/50"></div>

            {!isLoggingOut ? (
              <>
                <div className="w-24 h-24 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 relative">
                  <i className="fa-solid fa-ghost text-rose-500 text-5xl animate-float"></i>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                    <i className="fa-solid fa-question text-[10px] text-white"></i>
                  </div>
                </div>

                <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter italic">
                  Leaving the <span className="text-rose-500">Tribe?</span>
                </h3>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed font-medium px-2">
                  Your Safari session will end. Are you sure you want to
                  disappear like a ghost?
                </p>

                <div className="space-y-3">
                  <button
                    onClick={performLogout}
                    className="w-full bg-rose-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-xs"
                  >
                    Logout Now
                  </button>
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="w-full bg-slate-800 text-slate-400 font-black py-4 rounded-2xl border border-white/5 transition-all active:scale-95 uppercase tracking-widest text-xs"
                  >
                    Stay Active
                  </button>
                </div>
              </>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center gap-6 animate-pulse">
                <div className="w-32 h-32 flex items-center justify-center">
                  <i className="fa-solid fa-ghost text-rose-500 text-6xl animate-float"></i>
                </div>
                <p className="text-white font-black uppercase tracking-widest text-xs animate-pulse">
                  Clearing Safari tracks...
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showAnalytics && isOwnProfile && (
        <div className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom duration-500">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950">
            <h3 className="text-white font-black uppercase tracking-widest italic">
              Safari <span className="text-rose-500">Insights</span>
            </h3>
            <button
              onClick={() => setShowAnalytics(false)}
              className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white border border-slate-800"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl text-center">
                <p className="text-xl font-black text-white">1.2k</p>
                <p className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">
                  Total Likes
                </p>
              </div>
              <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl text-center">
                <p className="text-xl font-black text-rose-500">184</p>
                <p className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">
                  Mutuals
                </p>
              </div>
              <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl text-center">
                <p className="text-xl font-black text-emerald-500">+12%</p>
                <p className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">
                  Engagement
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-rose-500/10 to-indigo-500/10 border border-white/10 rounded-[2.5rem] p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <i className="fa-solid fa-heart text-6xl"></i>
              </div>
              <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <i className="fa-solid fa-wand-sparkles"></i> Dating Coach
              </h4>

              {isLoadingInsight ? (
                <div className="py-8 flex flex-col items-center justify-center text-slate-500 gap-4">
                  <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
                  <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">
                    Analyzing your vibe...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {aiInsight}
                  </p>
                  <button
                    onClick={generateAiInsights}
                    className="text-[10px] font-black text-white uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl border border-white/5"
                  >
                    Refresh Insights
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-slate-950 border-t border-white/5">
            <button
              onClick={() => navigate("/discover?view=plans")}
              className="w-full bg-white text-slate-950 font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 text-xs uppercase tracking-widest"
            >
              Boost Visibility with Gold
            </button>
          </div>
        </div>
      )}

      {isEditing && isOwnProfile && (
        <div className="fixed inset-0 z-[110] bg-slate-950/95 backdrop-blur-md flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setIsEditing(false)}
              className="text-slate-500 font-bold uppercase text-xs"
            >
              Cancel
            </button>
            <h3 className="text-white font-black uppercase tracking-widest">
              Edit Profile
            </h3>
            <button
              onClick={handleSaveProfile}
              className="text-rose-500 font-black uppercase text-xs"
            >
              Save
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                Display Name
              </label>
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                placeholder="Your Name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                  Age
                </label>
                <input
                  type="number"
                  value={editAge}
                  onChange={(event) =>
                    setEditAge(Number(event.target.value) || 18)
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                  Verified Location
                </label>
                <div className="relative">
                  <input
                    value={
                      isLocating
                        ? "Updating..."
                        : editLocation || "Location not set"
                    }
                    readOnly
                    className={`w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 pr-12 outline-none cursor-default transition-all ${
                      editLocation ? "text-white" : "text-slate-600 italic"
                    }`}
                  />
                  <button
                    onClick={handlePinLocation}
                    disabled={isLocating}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 w-8 h-8 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 transition-colors ${
                      isLocating ? "animate-pulse" : ""
                    }`}
                  >
                    <i
                      className={`fa-solid ${
                        isLocating ? "fa-spinner fa-spin" : "fa-location-crosshairs"
                      }`}
                    ></i>
                  </button>
                </div>
                <p className="text-[8px] text-slate-600 mt-1 uppercase font-black">
                  Location is GPS-locked
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                Bio
              </label>
              <textarea
                value={editBio}
                onChange={(event) => setEditBio(clampBio(event.target.value))}
                rows={4}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-rose-500 resize-none transition-all"
                placeholder={`Tell the tribe about yourself... (max ${BIO_MAX_WORDS} words)`}
              />
            </div>
          </div>
        </div>
      )}

      {locError && isOwnProfile && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-slate-900 border border-white/5 rounded-[3rem] p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-rose-500/50"></div>
            <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <i
                className={`fa-solid ${locError.icon} text-rose-500 text-3xl`}
              ></i>
            </div>
            <h3 className="text-2xl font-black text-white mb-2">
              {locError.title}
            </h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              {locError.msg}
            </p>
            <div className="space-y-3">
              <button
                onClick={handlePinLocation}
                className="w-full bg-white text-slate-950 font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-rotate-right"></i> Try Again
              </button>
              <button
                onClick={() => setLocError(null)}
                className="w-full text-slate-500 font-bold py-2 text-xs uppercase tracking-widest"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {isCameraOpen && isOwnProfile && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center gap-[50px] p-6 animate-in fade-in duration-300">
          <div className="w-full flex justify-between items-center">
            <button onClick={stopCamera} className="text-white text-xl p-2">
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h3 className="text-white font-bold">Retake Profile Photo</h3>
            <div className="w-10"></div>
          </div>

          <div className="relative w-full aspect-square max-w-sm rounded-[3rem] overflow-hidden border-4 border-rose-500/30">
            {capturedImage ? (
              <img
                src={capturedImage}
                className="w-full h-full object-cover"
                alt="Captured"
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
            {!capturedImage && (
              <div className="absolute inset-0 border-[40px] border-black/40 rounded-full pointer-events-none"></div>
            )}
          </div>

          <div className="w-full max-w-sm space-y-4">
            {!capturedImage ? (
              <button
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full bg-white border-8 border-slate-300/50 mx-auto flex items-center justify-center active:scale-90 transition-transform"
              >
                <div className="w-12 h-12 rounded-full bg-rose-500"></div>
              </button>
            ) : (
              <div className="flex gap-4">
                <button
                  onClick={() => setCapturedImage(null)}
                  className="flex-1 bg-slate-800 text-white font-bold p-4 rounded-2xl"
                >
                  Retake
                </button>
                <button
                  onClick={savePhoto}
                  className="flex-[2] gradient-primary text-white font-bold p-4 rounded-2xl shadow-xl shadow-rose-500/20"
                >
                  Use This Photo
                </button>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {showVoiceModal && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/80 px-6">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b0b0b]/95 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-white">
                Record Voice Intro
              </h3>
              <button
                onClick={() => {
                  if (voiceRecording) {
                    stopVoiceRecording();
                  }
                  setShowVoiceModal(false);
                  resetVoicePreview();
                }}
                className="text-xs uppercase tracking-widest text-gray-400"
              >
                Close
              </button>
            </div>

            <p className="text-[10px] text-gray-500">
              Keep it between 10-20 seconds. No music, just you.
            </p>

            <div className="flex items-center gap-3">
              {!voiceRecording ? (
                <button
                  onClick={startVoiceRecording}
                  className="px-4 py-2 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform"
                >
                  {voicePreviewBlob ? "Record Again" : "Record"}
                </button>
              ) : (
                <button
                  onClick={stopVoiceRecording}
                  className="px-4 py-2 rounded-full bg-red-500/80 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform"
                >
                  Stop ({voiceSeconds}s)
                </button>
              )}
              <span className="text-[10px] uppercase tracking-widest text-gray-500">
                {voiceSeconds}/{MAX_VOICE_SECONDS}s
              </span>
            </div>

            {voicePreviewUrl && (
              <audio
                src={voicePreviewUrl}
                controls
                controlsList="nodownload noplaybackrate"
                className="w-full"
              />
            )}

            {voiceError && <p className="text-[10px] text-red-400">{voiceError}</p>}

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveVoiceIntro}
                disabled={voiceUploading}
                className="flex-1 py-3 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-60"
              >
                {voiceUploading ? "Saving..." : "Save Intro"}
              </button>
              <button
                onClick={resetVoicePreview}
                className="px-4 py-3 rounded-full bg-white/5 text-gray-300 text-[10px] font-black uppercase tracking-widest border border-white/10 active:scale-95 transition-transform"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
