import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { UserProfile } from "../types";
import { getUserProfile, getUserProfileByEmail } from "../services/userService";
import AppImage from "../components/AppImage";
import { createNotification } from "../services/notificationService";
import { OWNER_EMAIL } from "../services/paymentService";
import AudioWaveform from "../components/AudioWaveform";

interface Props {
  viewer: UserProfile;
}

const TTS_API_BASE = import.meta.env.VITE_TTS_API_BASE || "";
const buildTtsUrl = (path: string) =>
  TTS_API_BASE ? `${TTS_API_BASE.replace(/\/$/, "")}${path}` : path;

const buildVoiceIntroText = (profile: UserProfile) => {
  const greetings = [
    "Hey, um...",
    "Okay, so...",
    "Hi there, mmh...",
    "Hey... so, yeah,",
  ];
  const fillers = ["um", "mmh", "okay", "so", "like"];
  const bioLeads = [
    "I guess my vibe is",
    "My bio says",
    "In my words",
    "I wrote that",
  ];
  const closers = [
    "Anyway, yeah... that's me.",
    "Okay, thanks for listening.",
    "Cool, yeah... that's me.",
    "Um... yeah, that's me.",
  ];

  const pick = (items: string[]) =>
    items[Math.floor(Math.random() * items.length)];
  const name = profile.nickname || "me";
  const location = (profile.area || "around here").split(" - ")[0];
  const intentRaw =
    profile.intents && profile.intents.length
      ? profile.intents[0]
      : "meeting new people";
  const intentLabel = intentRaw.replace(/\s*\/\s*/g, " or ");
  const rawBio = (profile.bio || "I like good vibes and honest chats.")
    .replace(/[\r\n]+/g, " ")
    .replace(/["“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const bioSnippet =
    rawBio.length > 120
      ? `${rawBio.slice(0, 120).trim()}...`
      : rawBio || "I like good vibes and honest chats.";

  const intro = [
    `${pick(greetings)} I'm ${name}.`,
    `I'm in ${location}.`,
    `I'm here for ${intentLabel} vibes.`,
    `${pick(fillers)} ${pick(bioLeads)}: ${bioSnippet}.`,
    pick(closers),
  ];

  return intro.join(" ");
};

const UserProfileViewPage: React.FC<Props> = ({ viewer }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [voicePosition, setVoicePosition] = useState(0);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  const [reportingVoice, setReportingVoice] = useState(false);
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(null);
  const [aiAudioLoading, setAiAudioLoading] = useState(false);
  const [aiAudioError, setAiAudioError] = useState<string | null>(null);
  const [aiMuted, setAiMuted] = useState(false);
  const [aiPlaying, setAiPlaying] = useState(false);
  const aiAudioRef = useRef<HTMLAudioElement | null>(null);
  const aiAutoPlayedRef = useRef<string | null>(null);
  const aiAutoTimerRef = useRef<number | null>(null);
  const aiRequestRef = useRef<AbortController | null>(null);
  const aiMutedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    if (id === viewer.id) {
      navigate("/profile", { replace: true });
      return;
    }

    let active = true;
    setLoading(true);
    getUserProfile(id)
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setError(data ? null : "User not found.");
      })
      .catch((err) => {
        console.error(err);
        if (active) setError("Unable to load profile.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, viewer.id, navigate]);

  const stopAiAudio = () => {
    if (aiAutoTimerRef.current) {
      window.clearTimeout(aiAutoTimerRef.current);
      aiAutoTimerRef.current = null;
    }
    if (aiAudioRef.current) {
      aiAudioRef.current.pause();
      aiAudioRef.current.currentTime = 0;
    }
    setAiPlaying(false);
  };

  useEffect(() => {
    aiMutedRef.current = aiMuted;
    if (aiMuted) {
      stopAiAudio();
    }
  }, [aiMuted]);

  useEffect(() => {
    if (!profile) {
      setAiAudioUrl(null);
      setAiAudioError(null);
      setAiAudioLoading(false);
      stopAiAudio();
      return;
    }
    const text = buildVoiceIntroText(profile);
    setAiAudioUrl(null);
    setAiAudioError(null);
    setAiAudioLoading(true);
    aiAutoPlayedRef.current = null;
    stopAiAudio();

    if (aiRequestRef.current) {
      aiRequestRef.current.abort();
    }
    const controller = new AbortController();
    aiRequestRef.current = controller;
    const startedAt = Date.now();

    fetch(buildTtsUrl("/api/tts"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            payload?.error || payload?.message || "Unable to generate intro.";
          throw new Error(message);
        }
        return payload as { audioUrl?: string };
      })
      .then((payload) => {
        if (controller.signal.aborted) return;
        if (!payload?.audioUrl) {
          throw new Error("No audio returned.");
        }
        setAiAudioUrl(payload.audioUrl);
        setAiAudioLoading(false);
        if (aiAutoPlayedRef.current === profile.id) return;
        if (aiMutedRef.current) return;
        const elapsed = Date.now() - startedAt;
        const delay = Math.max(0, 2000 - elapsed);
        aiAutoTimerRef.current = window.setTimeout(() => {
          if (aiAutoPlayedRef.current === profile.id) return;
          if (aiMutedRef.current) return;
          aiAutoPlayedRef.current = profile.id;
          const audio = aiAudioRef.current;
          if (!audio) return;
          audio.currentTime = 0;
          audio.play().catch(() => {
            setAiAudioError("Tap replay to hear the intro.");
          });
        }, delay);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setAiAudioError("Unable to generate voice intro.");
        setAiAudioLoading(false);
      });

    return () => {
      controller.abort();
      stopAiAudio();
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.voiceIntroUrl) return;
    setVoicePlaying(false);
    setVoicePosition(0);
    setVoiceDuration(profile.voiceIntroDuration ?? 0);
  }, [profile?.voiceIntroUrl, profile?.voiceIntroDuration]);

  const formatVoiceTime = (value: number) => {
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const toggleVoicePlayback = () => {
    stopAiAudio();
    if (!audioRef.current) return;
    if (voicePlaying) {
      audioRef.current.pause();
    } else {
      void audioRef.current.play();
    }
  };

  const handleReportVoiceIntro = async () => {
    if (!profile?.voiceIntroUrl) return;
    setReportingVoice(true);
    setReportNotice(null);
    try {
      const owner = await getUserProfileByEmail(OWNER_EMAIL);
      if (!owner) {
        throw new Error("Owner not found");
      }
      await createNotification({
        toUserId: owner.id,
        fromUserId: viewer.id,
        fromNickname: viewer.nickname,
        type: "system",
        body: `Voice intro reported for ${profile.nickname}.`,
      });
      setReportNotice("Report submitted. Thanks for keeping Hushly safe.");
    } catch (error) {
      console.error(error);
      setReportNotice("Unable to submit report right now.");
    } finally {
      setReportingVoice(false);
    }
  };

  return (
    <div className="min-h-screen bg-kipepeo-dark text-white font-sans">
      <header className="p-6 flex justify-between items-center border-b border-white/5 bg-kipepeo-dark sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <Link
            to="/discover"
            className="text-2xl active:scale-90 transition-transform"
            aria-label="Back"
          >
            <i className="fa-solid fa-chevron-left text-white"></i>
          </Link>
          <h1 className="text-xl font-black uppercase tracking-widest">
            Profile View
          </h1>
        </div>
      </header>

      <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
        {loading ? (
          <div className="text-center py-20 text-gray-500 text-base">
            Loading profile...
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-400 text-base">
            {error}
          </div>
        ) : profile ? (
          <>
            <div className="flex flex-col items-center mb-10">
              <div className="relative mb-6">
                <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-kipepeo-pink p-1 shadow-[0_0_30px_rgba(255,0,128,0.2)]">
                  <AppImage
                    src={profile.photoUrl}
                    className="w-full h-full object-cover rounded-full"
                    alt={profile.nickname}
                    loading="eager"
                    fetchPriority="high"
                  />
                </div>
              </div>
              <h2 className="text-3xl font-black mb-1 uppercase tracking-tighter">
                {profile.nickname}
              </h2>
              <div className="flex items-center space-x-2 flex-wrap justify-center">
                <span className="text-gray-500 font-black uppercase tracking-widest text-[9px] bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  Age Range: {profile.ageRange}
                </span>
                <span className="text-gray-500 font-black uppercase tracking-widest text-[9px] bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  {profile.area}
                </span>
                {profile.occupation &&
                  profile.occupationVisibility === "public" && (
                    <span className="text-gray-500 font-black uppercase tracking-widest text-[9px] bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                      {profile.occupation}
                    </span>
                  )}
              </div>
            </div>

            <div className="space-y-6">
              <section className="glass rounded-[2rem] p-6 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-gray-600 uppercase tracking-[0.3em]">
                    AI Voice Intro
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setAiMuted((prev) => !prev);
                      }}
                      className="px-3 py-1 rounded-full border border-white/10 text-[10px] uppercase tracking-widest text-gray-400 hover:text-white hover:border-white/20 transition disabled:opacity-60"
                      disabled={aiAudioLoading && !aiAudioUrl}
                    >
                      {aiMuted ? "Unmute" : "Mute"}
                    </button>
                    <button
                      onClick={() => {
                        if (!aiAudioRef.current || !aiAudioUrl) return;
                        aiAutoPlayedRef.current = profile?.id ?? null;
                        setAiAudioError(null);
                        aiAudioRef.current.currentTime = 0;
                        aiAudioRef.current.play().catch(() => {
                          setAiAudioError("Tap replay to hear the intro.");
                        });
                      }}
                      className="px-3 py-1 rounded-full border border-kipepeo-pink/40 text-[10px] uppercase tracking-widest text-kipepeo-pink hover:border-kipepeo-pink hover:text-kipepeo-pink transition"
                      disabled={!aiAudioUrl || aiAudioLoading}
                    >
                      Replay
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-gray-500">
                  <span>
                    {aiAudioLoading
                      ? "Preparing voice..."
                      : aiMuted
                        ? "Muted"
                        : aiPlaying
                          ? "Playing..."
                          : aiAudioUrl
                            ? "Auto-plays once after load"
                            : "Voice intro unavailable"}
                  </span>
                  {aiAudioError && (
                    <span className="text-rose-300">{aiAudioError}</span>
                  )}
                </div>
                {aiAudioUrl && (
                  <audio
                    ref={aiAudioRef}
                    src={aiAudioUrl}
                    preload="auto"
                    onPlay={() => {
                      audioRef.current?.pause();
                      setAiPlaying(true);
                    }}
                    onPause={() => setAiPlaying(false)}
                    onEnded={() => {
                      setAiPlaying(false);
                      if (aiAudioRef.current) {
                        aiAudioRef.current.currentTime = 0;
                      }
                    }}
                    className="hidden"
                  />
                )}
              </section>

              <section>
                <h3 className="text-xs font-black text-gray-600 uppercase tracking-[0.3em] mb-4 ml-2">
                  Intent
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(profile.intents ?? []).map((i) => (
                    <span
                      key={i}
                      className="px-4 py-2 bg-kipepeo-pink/10 text-kipepeo-pink text-[10px] font-black rounded-xl border border-kipepeo-pink/20 uppercase tracking-tighter"
                    >
                      {i}
                    </span>
                  ))}
                </div>
              </section>

              <section className="glass rounded-[2rem] p-6 border border-white/5">
                <h3 className="text-xs font-black text-gray-600 uppercase tracking-[0.3em] mb-3">
                  Bio
                </h3>
                <p className="text-gray-300 italic text-sm font-medium leading-relaxed">
                  "{profile.bio}"
                </p>
              </section>

              {profile.voiceIntroUrl && (
                <section className="glass rounded-[2rem] p-6 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black text-gray-600 uppercase tracking-[0.3em]">
                      Voice Intro
                    </h3>
                    <span className="text-[10px] uppercase tracking-widest text-gray-500">
                      Hear the person
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={toggleVoicePlayback}
                      className="h-12 w-12 rounded-2xl bg-kipepeo-pink/20 border border-kipepeo-pink/40 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-kipepeo-pink"
                    >
                      {voicePlaying ? "Pause" : "Play"}
                    </button>
                    <div className="flex-1">
                      <AudioWaveform
                        src={profile.voiceIntroUrl}
                        progress={
                          voiceDuration
                            ? Math.min(voicePosition / voiceDuration, 1)
                            : 0
                        }
                        className="mb-2"
                      />
                      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-gray-500">
                        <span>{formatVoiceTime(voicePosition)}</span>
                        <span>
                          {voiceDuration
                            ? formatVoiceTime(voiceDuration)
                            : "0:00"}
                        </span>
                      </div>
                    </div>
                    <audio
                      ref={audioRef}
                      src={profile.voiceIntroUrl}
                      preload="metadata"
                      controlsList="nodownload noplaybackrate"
                      onTimeUpdate={(event) => {
                        const target = event.currentTarget;
                        setVoicePosition(target.currentTime);
                      }}
                      onLoadedMetadata={(event) => {
                        const duration = event.currentTarget.duration;
                        if (!voiceDuration && Number.isFinite(duration)) {
                          setVoiceDuration(Math.round(duration));
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
                  <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-widest text-gray-500">
                    <span>Stream only</span>
                    <button
                      onClick={handleReportVoiceIntro}
                      disabled={reportingVoice}
                      className="px-3 py-1 rounded-full border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition disabled:opacity-60"
                    >
                      {reportingVoice ? "Reporting..." : "Report"}
                    </button>
                  </div>
                  {reportNotice && (
                    <p className="mt-2 text-[10px] text-gray-400">
                      {reportNotice}
                    </p>
                  )}
                </section>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default UserProfileViewPage;
