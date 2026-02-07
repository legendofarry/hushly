import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti"; // Import the confetti library
import {
  AppNotification,
  AGE_RANGES,
  IntentType,
  PaymentRequest,
  UserProfile,
  WeekendPlan,
} from "../types";
import { getAllUsers, getAllUserSettings } from "../services/userService";
import AppImage from "../components/AppImage";
import { ensureConversation } from "../services/chatService";
import LottiePlayer from "../components/LottiePlayer";
import {
  createLikeNotification,
  listenToNotifications,
  markNotificationsRead,
} from "../services/notificationService";
import {
  createPaymentRequest,
  listenToUserPaymentRequests,
  MPESA_TILL_NUMBER,
  OWNER_EMAIL,
  PREMIUM_PRICE_KES,
  WHATSAPP_OWNER,
  parseMpesaMessage,
} from "../services/paymentService";
import {
  buildPlanFromTemplate,
  createWeekendPlan,
  getPlanTemplates,
  listenToWeekendPlans,
  rsvpToPlan,
} from "../services/planService";
import { createLike } from "../services/likeService";
import {
  getMatchReasons,
  rankProfiles,
  semanticSearchProfiles,
} from "../services/aiService";
import {
  loadAiSignals,
  recordChatSignal,
  recordDwellSignal,
  recordLikeSignal,
  recordSkipSignal,
} from "../services/aiSignals";

const DiscoverPage: React.FC<{ user: UserProfile }> = ({ user }) => {
  const navigate = useNavigate();
  const [selectedIntents, setSelectedIntents] = useState<IntentType[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAgeRange, setSelectedAgeRange] = useState("All");
  const [selectedArea, setSelectedArea] = useState("All");
  const [aiQuery, setAiQuery] = useState("");
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [aiSignals, setAiSignals] = useState(() => loadAiSignals());
  const [view, setView] = useState<"discover" | "plans" | "portal">("discover");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [plans, setPlans] = useState<WeekendPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [planTitle, setPlanTitle] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [planLocation, setPlanLocation] = useState("");
  const [planTime, setPlanTime] = useState("");
  const [planCategory, setPlanCategory] = useState("Hangout");
  const [planSubmitting, setPlanSubmitting] = useState(false);
  const [planActionError, setPlanActionError] = useState<string | null>(null);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [paymentProof, setPaymentProof] = useState("");
  const [showPaymentProof, setShowPaymentProof] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [rsvpTarget, setRsvpTarget] = useState<WeekendPlan | null>(null);
  const [rsvpName, setRsvpName] = useState("");
  const [rsvpContact, setRsvpContact] = useState("");
  const [rsvpAvailability, setRsvpAvailability] = useState("");
  const [rsvpGroupSize, setRsvpGroupSize] = useState("1");
  const [rsvpNote, setRsvpNote] = useState("");
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);
  const [rsvpSuccess, setRsvpSuccess] = useState<string | null>(null);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [installStep, setInstallStep] = useState<
    "intro" | "choose" | "android" | "ios"
  >("intro");
  const [escortLoading, setEscortLoading] = useState(false);
  const [escortError, setEscortError] = useState<string | null>(null);
  const lastProfileRef = useRef<UserProfile | null>(null);
  const lastViewStartRef = useRef<number>(Date.now());
  const hearts = useMemo(
    () =>
      Array.from({ length: 40 }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        size: Math.random() * 20 + 10,
        duration: Math.random() * 10 + 10,
        delay: Math.random() * 10,
      })),
    [],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getAllUsers(), getAllUserSettings()])
      .then(([allUsers, settingsMap]) => {
        if (!active) return;
        const filtered = allUsers.filter((profile) => {
          if (profile.id === user.id) return false;
          if (!profile.emailVerified) return false;
          const settings = settingsMap[profile.id];
          return settings ? settings.discoverable : true;
        });
        setProfiles(filtered);
      })
      .catch((error) => {
        console.error(error);
        if (active) setLoadError("Unable to load profiles right now.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user.id]);

  useEffect(() => {
    const unsubscribe = listenToNotifications(user.id, (items) => {
      setNotifications(items);
    });
    return () => unsubscribe();
  }, [user.id]);

  useEffect(() => {
    const cooldownMs = 24 * 60 * 60 * 1000;
    const dismissedAt = Number(
      localStorage.getItem("hushly_install_dismissed_at") || "0",
    );
    if (dismissedAt && Date.now() - dismissedAt < cooldownMs) {
      return;
    }
    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isSafari =
      /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/i.test(ua);
    const isIOSBrowser = isIOS && isSafari;
    const isHushlyApp = /Hushly\/1\.0/i.test(ua);
    if ((isAndroid || isIOSBrowser) && !isHushlyApp) {
      setShowInstallPrompt(true);
      setInstallStep("intro");
    }
  }, []);

  useEffect(() => {
    const unsubscribe = listenToWeekendPlans(
      (items) => {
        setPlans(items);
        setPlansLoading(false);
      },
      (error) => {
        console.error(error);
        setPlansError(
          error.message.includes("index")
            ? "Firestore needs an index for weekend plans."
            : "Unable to load weekend plans.",
        );
        setPlansLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = listenToUserPaymentRequests(
      user.id,
      (items) => {
        setPaymentRequests(items);
      },
      (error) => {
        console.error(error);
        setPaymentError(error.message);
      },
    );
    return () => unsubscribe();
  }, [user.id]);

  const toggleIntentFilter = (intent: IntentType) => {
    setSelectedIntents((prev) =>
      prev.includes(intent)
        ? prev.filter((i) => i !== intent)
        : [...prev, intent],
    );
  };

  const filteredProfiles = useMemo(() => {
    const matchesFilter = profiles.filter((profile) => {
      const matchesIntent =
        selectedIntents.length === 0 ||
        profile.intents?.some((intent) => selectedIntents.includes(intent));
      const matchesAge =
        selectedAgeRange === "All" || profile.ageRange === selectedAgeRange;
      const matchesArea =
        selectedArea === "All" || profile.area === selectedArea;
      return matchesIntent && matchesAge && matchesArea;
    });

    const semanticMatches = aiQuery
      ? semanticSearchProfiles(aiQuery, matchesFilter)
      : [];
    const semanticIds = new Set(semanticMatches.map((item) => item.profile.id));
    const candidates =
      aiQuery && semanticIds.size > 0
        ? matchesFilter.filter((profile) => semanticIds.has(profile.id))
        : matchesFilter;

    const ranked = rankProfiles({
      user,
      profiles: candidates,
      signals: aiSignals,
      semanticQuery: aiQuery,
    });

    return ranked.map((item) => item.profile);
  }, [
    profiles,
    selectedIntents,
    selectedAgeRange,
    selectedArea,
    user,
    aiSignals,
    aiQuery,
  ]);

  const matchReasons = useMemo(() => {
    const map = new Map<string, string[]>();
    filteredProfiles.forEach((profile) => {
      map.set(profile.id, getMatchReasons(user, profile, aiSignals));
    });
    return map;
  }, [filteredProfiles, aiSignals, user]);

  const areaOptions = useMemo(() => {
    const areas = new Set<string>();
    profiles.forEach((profile) => {
      if (profile.area) areas.add(profile.area);
    });
    if (user.area) areas.add(user.area);
    return Array.from(areas).sort();
  }, [profiles, user.area]);

  useEffect(() => {
    if (currentIndex >= filteredProfiles.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, filteredProfiles.length]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedIntents, selectedAgeRange, selectedArea, aiQuery]);

  const current = filteredProfiles[currentIndex];

  useEffect(() => {
    const now = Date.now();
    if (lastProfileRef.current && lastProfileRef.current.id !== current?.id) {
      const dwellMs = now - lastViewStartRef.current;
      const updated = recordDwellSignal(lastProfileRef.current, dwellMs);
      setAiSignals(updated);
    }
    if (current) {
      lastProfileRef.current = current;
      lastViewStartRef.current = now;
    }
  }, [current?.id]);

  useEffect(() => {
    return () => {
      if (lastProfileRef.current) {
        recordDwellSignal(
          lastProfileRef.current,
          Date.now() - lastViewStartRef.current,
        );
      }
    };
  }, []);
  const unreadNotifications = notifications.filter((n) => !n.read);
  const unreadMessageCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.read && notification.type === "message",
      ).length,
    [notifications],
  );
  const isOwner = user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const latestPaymentRequest = paymentRequests[0] ?? null;
  const paymentStatus = latestPaymentRequest?.status ?? null;
  const premiumActive =
    Boolean(user.isPremium) &&
    (!user.premiumExpiresAt || user.premiumExpiresAt > Date.now());
  const premiumUnlocked =
    isOwner || premiumActive || latestPaymentRequest?.status === "approved";
  const paymentPending = paymentStatus === "pending";
  const paymentRejected = paymentStatus === "rejected";
  const planTemplates = useMemo(
    () => getPlanTemplates(planCategory),
    [planCategory],
  );
  const parsedMpesa = useMemo(
    () => (paymentProof ? parseMpesaMessage(paymentProof) : null),
    [paymentProof],
  );

  const handleStartChat = async (target: UserProfile) => {
    try {
      const conversationId = await ensureConversation(user, target);
      const updated = recordChatSignal(target);
      setAiSignals(updated);
      navigate(`/chats/${conversationId}`);
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleNotifications = () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState && unreadNotifications.length > 0) {
      void markNotificationsRead(unreadNotifications.map((n) => n.id));
    }
  };

  const handleNotificationClick = (notification: AppNotification) => {
    if (notification.type === "like" && notification.fromUserId) {
      navigate(`/users/${notification.fromUserId}`);
    } else if (notification.conversationId) {
      navigate(`/chats/${notification.conversationId}`);
    }
    setShowNotifications(false);
  };

  const handlePlanSubmit = async () => {
    if (!premiumUnlocked || isOwner) return;
    if (
      !planTitle.trim() ||
      !planDescription.trim() ||
      !planLocation.trim() ||
      !planTime.trim()
    ) {
      setPlanActionError("Please complete all required fields.");
      return;
    }
    setPlanSubmitting(true);
    setPlanActionError(null);
    try {
      await createWeekendPlan({
        creator: user,
        title: planTitle.trim(),
        description: planDescription.trim(),
        location: planLocation.trim(),
        time: planTime.trim(),
        category: planCategory,
      });
      setPlanTitle("");
      setPlanDescription("");
      setPlanLocation("");
      setPlanTime("");
    } catch (error) {
      console.error(error);
      setPlanActionError("Unable to create plan. Please try again.");
    } finally {
      setPlanSubmitting(false);
    }
  };

  const handleRsvpOpen = (plan: WeekendPlan) => {
    if (isOwner) {
      setPlanActionError("Owner accounts cannot RSVP to plans.");
      return;
    }
    setPlanActionError(null);
    setRsvpError(null);
    setRsvpSuccess(null);
    setRsvpName(user.nickname);
    setRsvpContact("");
    setRsvpNote("");
    setRsvpGroupSize("1");
    setRsvpAvailability(plan.time || "");
    setRsvpTarget(plan);
  };

  const handleRsvpSubmit = async () => {
    if (!rsvpTarget) return;
    if (!rsvpName.trim() || !rsvpContact.trim() || !rsvpAvailability.trim()) {
      setRsvpError("Please answer the RSVP questions.");
      return;
    }
    setRsvpSubmitting(true);
    setRsvpError(null);
    try {
      await rsvpToPlan({
        planId: rsvpTarget.id,
        user,
        answers: {
          name: rsvpName.trim(),
          contact: rsvpContact.trim(),
          availability: rsvpAvailability.trim(),
          groupSize: rsvpGroupSize.trim(),
          note: rsvpNote.trim(),
        },
      });
      setRsvpTarget(null);
      setRsvpSuccess("RSVP received. The host will reach out soon.");
      setRsvpName("");
      setRsvpContact("");
      setRsvpAvailability("");
      setRsvpGroupSize("1");
      setRsvpNote("");
    } catch (error) {
      console.error(error);
      setRsvpError("Unable to RSVP right now.");
    } finally {
      setRsvpSubmitting(false);
    }
  };

  const handleInstallDismiss = () => {
    setShowInstallPrompt(false);
    setInstallStep("intro");
    localStorage.setItem("hushly_install_dismissed_at", Date.now().toString());
  };

  const handleEscortEnter = () => {
    setEscortError(null);
    setEscortLoading(true);
    setTimeout(() => {
      navigate("/escort");
    }, 1600);
  };

  const handlePaymentSubmit = async () => {
    if (!paymentProof.trim()) {
      setPaymentError("Paste the full M-Pesa confirmation message.");
      return;
    }
    setPaymentSubmitting(true);
    setPaymentError(null);
    try {
      await createPaymentRequest({
        userId: user.id,
        email: user.email,
        nickname: user.nickname,
        mpesaMessageProof: paymentProof.trim(),
      });
      const message = `Hello Hushly Admin,\\n\\nI have made a payment for Premium membership.\\n\\nUsername: ${user.nickname}\\nEmail: ${user.email}\\n\\nM-Pesa Confirmation:\\n${paymentProof.trim()}`;
      const encoded = encodeURIComponent(message);
      window.open(`https://wa.me/${WHATSAPP_OWNER}?text=${encoded}`, "_blank");
      setPaymentProof("");
      setShowPaymentProof(false);
    } catch (error) {
      console.error(error);
      setPaymentError("Unable to submit payment proof. Please try again.");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const getNotificationTitle = (notification: AppNotification) => {
    if (notification.type === "system") return "System";
    return notification.fromNickname ?? "Notification";
  };

  const getNotificationBody = (notification: AppNotification) => {
    switch (notification.type) {
      case "message":
        return `You have a new message from ${notification.fromNickname ?? "someone"}.`;
      case "like":
        return `${notification.fromNickname ?? "Someone"} liked your profile.`;
      default:
        return notification.body;
    }
  };

  // --- ACTIONS ---
  const handleNextProfile = () => {
    if (filteredProfiles.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % filteredProfiles.length);
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Logic to record skip would go here
    if (current) {
      const updated = recordSkipSignal(current);
      setAiSignals(updated);
    }
    handleNextProfile();
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (current) {
      void createLike({
        fromUserId: user.id,
        toUserId: current.id,
        fromNickname: user.nickname,
        toNickname: current.nickname,
      });
      void createLikeNotification({
        toUserId: current.id,
        fromUserId: user.id,
        fromNickname: user.nickname,
      });
      const updated = recordLikeSignal(current);
      setAiSignals(updated);
    }

    // --- CONFETTI ANIMATION ---
    // We use the app's brand colors for the confetti
    const brandColors = ["#ec4899", "#a855f7", "#ffffff"]; // Pink-500, Purple-600, White

    // Fire confetti from the bottom center (where the button is)
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.8 }, // Start from bottom 80% of screen
      colors: brandColors,
      disableForReducedMotion: true,
      zIndex: 9999, // Ensure it sits on top of everything
      gravity: 1.2,
      scalar: 1.2,
      ticks: 300, // Lasts a bit longer
    });

    // Short delay before switching to next profile to let user see the pop
    setTimeout(() => {
      handleNextProfile();
    }, 200);
  };

  const handleChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (current) {
      void handleStartChat(current);
    }
  };

  // --- PORTAL VIEW ---
  if (view === "portal") {
    return (
      <div className="relative h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/40 via-black to-black animate-pulse"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

        {escortLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 px-6">
            <LottiePlayer
              path="/assets/lottie/loading.json"
              className="w-40 h-40"
            />
            <p className="mt-4 text-xs uppercase tracking-[0.3em] text-red-200">
              Securing access...
            </p>
          </div>
        )}

        <div className="z-10 flex flex-col items-center max-w-md px-8 w-full animate-in fade-in zoom-in duration-500">
          <div className="mb-8 relative group">
            <div className="absolute inset-0 bg-red-600 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
            <div className="w-24 h-24 bg-gradient-to-br from-red-900 to-black rounded-full flex items-center justify-center border border-red-500/50 shadow-2xl relative z-10">
              <span className="text-4xl drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">
                🌹
              </span>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800 uppercase tracking-tighter mb-4 text-center">
            Escort
          </h1>

          <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-4 mb-8 backdrop-blur-sm">
            <p className="text-red-200/80 text-sm text-center leading-relaxed font-medium">
              <span className="block mb-2 text-xs uppercase tracking-widest text-red-500 font-bold">
                Confidential Zone
              </span>
              Strict anonymity enforced.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={handleEscortEnter}
              disabled={escortLoading}
              className="w-full py-4 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-60"
            >
              Enter
            </button>
            <button
              onClick={() => {
                setEscortLoading(false);
                setView("discover");
              }}
              className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white font-semibold rounded-xl uppercase tracking-widest text-xs transition-all"
            >
              Exit
            </button>
            {escortError && (
              <p className="text-xs text-red-300 text-center">{escortError}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN APP VIEW ---
  return (
    <div className="h-screen w-full bg-slate-950 text-white font-sans flex flex-col overflow-hidden relative selection:bg-pink-500 selection:text-white">
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(100vh) scale(0.6); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(-70vh) scale(1.2); opacity: 0; }
        }
      `}</style>
      {/* Dynamic Background */}
      <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-pink-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {hearts.map((heart) => (
          <div
            key={heart.id}
            className="absolute text-pink-400/70"
            style={{
              left: `${heart.left}%`,
              bottom: "-50px",
              fontSize: `${heart.size}px`,
              animation: `floatUp ${heart.duration}s linear infinite`,
              animationDelay: `-${heart.delay}s`,
            }}
          >
            {"\u2764"}
          </div>
        ))}
      </div>

      {showInstallPrompt && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 px-6">
          <div className="w-full max-w-md glass rounded-3xl border border-white/10 p-6 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-kipepeo-pink/15 border border-kipepeo-pink/30 flex items-center justify-center text-2xl">
              App
            </div>

            {installStep === "intro" && (
              <>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-widest">
                    Install Hushly App
                  </h2>
                  <p className="text-sm text-gray-400 mt-2">
                    Get the full experience and faster access by installing the
                    app.
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => setInstallStep("choose")}
                    className="w-full py-3 rounded-full bg-kipepeo-pink text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
                  >
                    Install App
                  </button>
                  <button
                    onClick={handleInstallDismiss}
                    className="w-full py-3 rounded-full bg-white/5 text-gray-300 text-xs font-black uppercase tracking-widest border border-white/10 active:scale-95 transition-transform"
                  >
                    Not Now
                  </button>
                </div>
              </>
            )}

            {installStep === "choose" && (
              <>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-widest">
                    Choose Your Device
                  </h2>
                  <p className="text-sm text-gray-400 mt-2">
                    Select Android or iOS to continue installation.
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => setInstallStep("android")}
                    className="w-full py-3 rounded-full bg-kipepeo-pink text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
                  >
                    Android
                  </button>
                  <button
                    onClick={() => setInstallStep("ios")}
                    className="w-full py-3 rounded-full bg-white/5 text-gray-200 text-xs font-black uppercase tracking-widest border border-white/10 active:scale-95 transition-transform"
                  >
                    iOS
                  </button>
                  <button
                    onClick={handleInstallDismiss}
                    className="w-full py-3 rounded-full bg-white/5 text-gray-300 text-xs font-black uppercase tracking-widest border border-white/10 active:scale-95 transition-transform"
                  >
                    Not Now
                  </button>
                </div>
              </>
            )}

            {installStep === "android" && (
              <>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-widest">
                    Android Install
                  </h2>
                  <p className="text-sm text-gray-400 mt-2">
                    Download the APK and install manually.
                  </p>
                </div>
                <div className="space-y-3">
                  <a
                    href="/assets/apk/apk.apk"
                    className="block w-full py-3 rounded-full bg-kipepeo-pink text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
                    download
                  >
                    Download APK
                  </a>
                  <button
                    onClick={() => setInstallStep("choose")}
                    className="w-full py-3 rounded-full bg-white/5 text-gray-300 text-xs font-black uppercase tracking-widest border border-white/10 active:scale-95 transition-transform"
                  >
                    Back
                  </button>
                </div>
              </>
            )}

            {installStep === "ios" && (
              <>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-widest">
                    iOS Install
                  </h2>
                  <p className="text-sm text-gray-400 mt-2">
                    Use the Safari share menu and tap Add to Home Screen.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left text-xs text-gray-300">
                    1. Open this site in Safari
                    <br />
                    2. Tap Share
                    <br />
                    3. Select Add to Home Screen
                  </div>
                  <button
                    onClick={() => setInstallStep("choose")}
                    className="w-full py-3 rounded-full bg-white/5 text-gray-300 text-xs font-black uppercase tracking-widest border border-white/10 active:scale-95 transition-transform"
                  >
                    Back
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-5 pt-5 pb-2 z-20 shrink-0 max-w-2xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-1">
            <div className="w-2 h-8 bg-gradient-to-b from-pink-500 to-purple-600 rounded-full"></div>
            <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              <a href="#">Hushly</a>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/chats"
              className="w-10 h-10 flex items-center justify-center text-lg active:scale-90 transition-transform relative"
            >
              {unreadMessageCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-5 px-1.5 rounded-full bg-kipepeo-pink text-[10px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(236,72,153,0.6)]">
                  {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                </span>
              )}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="#fff"
                stroke="#ec4899"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="feather feather-send"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </Link>

            <button
              onClick={() => setView("portal")}
              className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-colors active:scale-95"
            >
              <span className="text-lg filter drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  xmlns:xlink="http://www.w3.org/1999/xlink"
                  height="24px"
                  width="24px"
                  fill="#fff"
                  stroke="#ec4899"
                  stroke-width="2"
                  version="1.1"
                  id="_x32_"
                  viewBox="0 0 512 512"
                  xml:space="preserve"
                >
                  <g>
                    <path
                      class="st0"
                      d="M222.598,186.442c29.136,23.184,64.397,10.377,56.084-10.394c-41.721-15.548-58.381-67.814-40.19-87.473   c18.173-19.65,56.138,0.338,35.866-15.326c-20.256-15.662-55.515-2.857-69.274,20.549   C191.325,117.212,193.461,163.25,222.598,186.442z"
                    />
                    <path
                      class="st0"
                      d="M312.038,160.099c33.338-15.939,30.544-70.172,9.025-80.789c-21.501-10.608-34.69-0.446-20.7,19.036   c18.404,23.236-18.03,51.821-35.1,44.978C265.262,143.324,278.683,176.047,312.038,160.099z"
                    />
                    <path
                      class="st0"
                      d="M285.518,60.451c27.73-3.933,44.319,4.94,55.764,23.797c13.136-20.886-2.865-64.957-47.114-81.128   c-44.23-16.161-102.006,33.978-89.209,69.23C212.488,63.486,249.475,43.605,285.518,60.451z"
                    />
                    <path
                      class="st0"
                      d="M129.509,238.655c10.804,7.716,51.208,20.54,85.969,31.718c34.744,11.177,69.95-12.353,68.49-50.193   c-105.387-7.013-105.174-84.608-99.602-107.346c-45.423-0.392-60.143,40.626-57.046,69.06   C130.631,212.152,118.118,230.512,129.509,238.655z"
                    />
                    <path
                      class="st0"
                      d="M141.044,111.161c21.074-9.567,34.974-6.168,34.974-6.168s5.286-16.108,12.495-23.717   c-1.904-3.15-1.958-13.866-1.958-13.866s0.232-11.997,2.403-20.834c-18.013-8.428-56.744,7.556-58.933,11.035   C127.854,61.092,124.935,105.892,141.044,111.161z"
                    />
                    <path
                      class="st0"
                      d="M414.044,126.13c-11-53.558-56.423-53.95-56.423-53.95s-0.552,13.243-7.476,19.597   c18.475,33.961-13.208,86.912-36.755,88.301c67.778,51.368,100.884-11.053,105.868-20.54   C424.278,150.052,416.02,139.995,414.044,126.13z"
                    />
                    <path
                      class="st0"
                      d="M373.284,213.728c-15.218,6.025-51.332-5.402-69.719-21.492c-1.21,8.615-12.921,20.032-17.336,19.855   c14.346,10.643,22.302,43.83-12.264,68.393c8.276,13.625,54.981,16.126,85.204,5.659c4.913-1.709,18.351-27.65,23.94-43.233   C390.532,222.262,396.993,204.348,373.284,213.728z"
                    />
                    <path
                      class="st0"
                      d="M259.958,92.045c-19.33,5.989-16.215,37.093,5.464,39.709c31.095-3.115,24.848-32.296,17.069-33.31   c-7.795-1.015,1.335,16.383-8.543,16.66c-11.712,0.302-16.766-7.957-10.804-14.239C267.968,95.783,269.142,89.598,259.958,92.045z"
                    />
                    <path
                      class="st0"
                      d="M334.66,364.984c-49.267-20.682-83.957-10.51-107.381,4.743c3.329-7.093,6.426-13.972,9.185-20.415   c12.797-29.92,19.401-51.466,19.525-51.84l-23.441-7.52l-0.108,0.338c-1.21,3.906-13.117,41.044-34.512,83.228   c-7.138,14.097-15.431,28.692-24.598,42.842c11.089-30.792,23.851-63.116-12.424-98.535c-5.5,3.346-5.998,14.951-5.998,14.951   s-20.166-51.831-34.529-50.656c-14.364,1.184-39.479,56.023-14.454,87.937c-13.278-3.24-19.276,11.711-10.964,16.081   c7.938,4.183,57.278,39.861,60.784,55.097c-14.31,18.262-30.311,34.316-47.63,45.556c-6.016,3.898-8.224,12.264-4.967,18.68   c3.275,6.416,10.786,8.446,16.803,4.548c22.89-14.907,42.593-35.759,59.448-58.435c9.006-12.129,17.176-24.794,24.581-37.431   c61.958,36.79,105.424,16.5,109.98,6.746c4.912-10.519-17.71-4.326-17.71-4.326S355.164,377.034,334.66,364.984z"
                    />
                  </g>
                </svg>
              </span>
            </button>

            <Link
              to="/profile"
              className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-br from-pink-500 to-purple-600 active:scale-95 transition-transform"
            >
              <AppImage
                src={user.photoUrl}
                className="w-full h-full object-cover rounded-full border-2 border-slate-950"
                alt="Profile"
              />
            </Link>
          </div>
        </div>

        <div className="relative p-1 bg-white/5 rounded-xl flex items-center mb-4">
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-lg shadow-sm transition-all duration-300 ease-out ${view === "plans" ? "translate-x-[calc(100%+4px)]" : "translate-x-0"}`}
          />
          <button
            onClick={() => setView("discover")}
            className={`flex-1 relative z-10 py-2.5 text-xs font-bold uppercase tracking-widest text-center transition-colors ${view === "discover" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            Discovery
          </button>
          <button
            onClick={() => setView("plans")}
            className={`flex-1 relative z-10 py-2.5 text-xs font-bold uppercase tracking-widest text-center transition-colors ${view === "plans" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            Weekend
          </button>
        </div>

        {view === "discover" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters((prev) => !prev)}
                className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:bg-white/10 transition-colors"
              >
                {showFilters ? "Hide Filters" : "Filter & Sort"}
              </button>
              <button
                onClick={() => {
                  setSelectedIntents([]);
                  setSelectedAgeRange("All");
                  setSelectedArea("All");
                  setAiQuery("");
                }}
                className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-gray-300"
              >
                Clear Filters
              </button>
            </div>

            {showFilters && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">
                    AI Search
                  </p>
                  <input
                    value={aiQuery}
                    onChange={(event) => setAiQuery(event.target.value)}
                    placeholder="low-key weekend vibe near Westlands"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-gray-200 focus:outline-none"
                  />
                  <p className="mt-2 text-[10px] text-gray-500">
                    Semantic search across bio, intents, and area.
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">
                    Intent
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(IntentType).map((intent) => {
                      const isActive = selectedIntents.includes(intent);
                      return (
                        <button
                          key={intent}
                          onClick={() => toggleIntentFilter(intent)}
                          className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all duration-300 ${
                            isActive
                              ? "bg-gradient-to-r from-pink-600 to-purple-600 border-transparent text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]"
                              : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10"
                          }`}
                        >
                          {intent}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-gray-400">
                      Age Range
                    </label>
                    <select
                      value={selectedAgeRange}
                      onChange={(event) =>
                        setSelectedAgeRange(event.target.value)
                      }
                      className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs uppercase tracking-widest text-gray-200 focus:outline-none"
                    >
                      <option value="All">All</option>
                      {AGE_RANGES.map((range) => (
                        <option key={range} value={range}>
                          {range}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-gray-400">
                      Area
                    </label>
                    <select
                      value={selectedArea}
                      onChange={(event) =>
                        setSelectedArea(event.target.value)
                      }
                      className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs uppercase tracking-widest text-gray-200 focus:outline-none"
                    >
                      <option value="All">All</option>
                      {areaOptions.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {view === "discover" && (
          <>
            {rsvpTarget && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
                <div className="w-full max-w-md glass rounded-2xl border border-white/10 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black uppercase tracking-widest">
                        RSVP
                      </h3>
                      <p className="text-xs text-gray-400">
                        {rsvpTarget.title} - {rsvpTarget.location}
                      </p>
                    </div>
                    <button
                      onClick={() => setRsvpTarget(null)}
                      className="text-xs uppercase tracking-widest text-gray-400"
                    >
                      Close
                    </button>
                  </div>

                  <div className="space-y-3">
                    <input
                      value={rsvpName}
                      onChange={(e) => setRsvpName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none"
                    />
                    <input
                      value={rsvpContact}
                      onChange={(e) => setRsvpContact(e.target.value)}
                      placeholder="Contact (WhatsApp or phone)"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none"
                    />
                    <input
                      value={rsvpAvailability}
                      onChange={(e) => setRsvpAvailability(e.target.value)}
                      placeholder="Availability / time"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none"
                    />
                    <select
                      value={rsvpGroupSize}
                      onChange={(e) => setRsvpGroupSize(e.target.value)}
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none"
                    >
                      <option value="1">1 person</option>
                      <option value="2">2 people</option>
                      <option value="3">3 people</option>
                      <option value="4">4+ people</option>
                    </select>
                    <textarea
                      value={rsvpNote}
                      onChange={(e) => setRsvpNote(e.target.value)}
                      rows={3}
                      placeholder="Anything else the host should know?"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 p-3 text-sm focus:outline-none"
                    />
                    {rsvpError && (
                      <p className="text-xs text-red-400">{rsvpError}</p>
                    )}
                    <button
                      onClick={handleRsvpSubmit}
                      disabled={rsvpSubmitting}
                      className="w-full py-3 rounded-full bg-kipepeo-pink text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-60"
                    >
                      {rsvpSubmitting ? "Submitting..." : "Send RSVP"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 px-4 pb-4 overflow-hidden relative flex flex-col z-10 max-w-2xl mx-auto w-full">
        {showNotifications && (
          <div className="absolute top-0 right-2 z-30 w-72 glass rounded-2xl border border-white/10 p-4 shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
              Notifications
            </h3>
            {notifications.length === 0 ? (
              <p className="text-base text-gray-500">No notifications yet.</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto no-scrollbar">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`relative w-full text-left p-3 rounded-xl border transition-all ${
                      notification.read
                        ? "border-white/5 text-gray-400 bg-transparent"
                        : "border-kipepeo-pink/40 text-white bg-gradient-to-r from-kipepeo-pink/15 to-transparent shadow-[0_0_18px_rgba(236,72,153,0.2)]"
                    }`}
                  >
                    {!notification.read && (
                      <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-kipepeo-pink shadow-[0_0_8px_rgba(236,72,153,0.8)]"></span>
                    )}
                    <p className="text-xs font-bold uppercase tracking-widest text-kipepeo-pink">
                      {getNotificationTitle(notification)}
                    </p>
                    <p className="text-base text-gray-300 mt-1 line-clamp-2">
                      {getNotificationBody(notification)}
                    </p>
                  </button>
                ))}
              </div>
            )}
            {rsvpTarget && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
                <div className="w-full max-w-md glass rounded-2xl border border-white/10 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black uppercase tracking-widest">
                        RSVP
                      </h3>
                      <p className="text-xs text-gray-400">
                        {rsvpTarget.title} - {rsvpTarget.location}
                      </p>
                    </div>
                    <button
                      onClick={() => setRsvpTarget(null)}
                      className="text-xs uppercase tracking-widest text-gray-400"
                    >
                      Close
                    </button>
                  </div>

                  <div className="space-y-3">
                    <input
                      value={rsvpName}
                      onChange={(e) => setRsvpName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none"
                    />
                    <input
                      value={rsvpContact}
                      onChange={(e) => setRsvpContact(e.target.value)}
                      placeholder="Contact (WhatsApp or phone)"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none"
                    />
                    <input
                      value={rsvpAvailability}
                      onChange={(e) => setRsvpAvailability(e.target.value)}
                      placeholder="Availability / time"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none"
                    />
                    <select
                      value={rsvpGroupSize}
                      onChange={(e) => setRsvpGroupSize(e.target.value)}
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none"
                    >
                      <option value="1">1 person</option>
                      <option value="2">2 people</option>
                      <option value="3">3 people</option>
                      <option value="4">4+ people</option>
                    </select>
                    <textarea
                      value={rsvpNote}
                      onChange={(e) => setRsvpNote(e.target.value)}
                      rows={3}
                      placeholder="Anything else the host should know?"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 p-3 text-sm focus:outline-none"
                    />
                    {rsvpError && (
                      <p className="text-xs text-red-400">{rsvpError}</p>
                    )}
                    <button
                      onClick={handleRsvpSubmit}
                      disabled={rsvpSubmitting}
                      className="w-full py-3 rounded-full bg-kipepeo-pink text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-60"
                    >
                      {rsvpSubmitting ? "Submitting..." : "Send RSVP"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {view === "discover" ? (
          <>
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 animate-pulse">
                <div className="w-full max-w-xs aspect-[3/4] rounded-3xl bg-white/5 border border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent skew-x-12 animate-shimmer"></div>
                </div>
                <div className="text-gray-500 text-xs font-medium uppercase tracking-widest">
                  Searching Network...
                </div>
              </div>
            ) : loadError ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-400">
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
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm font-medium">{loadError}</p>
              </div>
            ) : current ? (
              <div className="flex-1 relative flex flex-col h-full">
                {/* Profile Card */}
                <div className="relative flex-1 rounded-[2rem] overflow-hidden bg-gray-900 border border-white/10 shadow-2xl">
                  {/* Main Image */}
                  <div className="absolute inset-0">
                    <AppImage
                      src={current.photoUrl}
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                      alt={current.nickname}
                      fetchPriority="high"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90"></div>
                    <div className="absolute bottom-0 inset-x-0 h-2/3 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-5 left-5">
                    {current.isOnline && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                          Online
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Content Info */}
                  <div className="absolute bottom-0 inset-x-0 p-6 z-20 flex flex-col justify-end h-full pointer-events-none">
                    <div className="pointer-events-auto">
                      <div className="flex items-end justify-between mb-2">
                        <h2 className="text-4xl font-black text-white leading-none tracking-tighter drop-shadow-lg">
                          {current.nickname}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2 mb-4 text-gray-300 text-sm font-medium">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-pink-500"
                        >
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>{current.area}</span>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-5">
                        {(current.intents ?? []).map((i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-md bg-white/10 backdrop-blur-sm border border-white/10 text-[10px] font-bold uppercase text-gray-200 tracking-wider"
                          >
                            {i}
                          </span>
                        ))}
                      </div>

                      {matchReasons.get(current.id)?.length ? (
                        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                          <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">
                            Why this match
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {matchReasons.get(current.id)?.map((reason) => (
                              <span
                                key={reason}
                                className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-300"
                              >
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="relative mb-6">
                        <p className="text-sm text-gray-300/90 leading-relaxed font-medium line-clamp-3">
                          "{current.bio}"
                        </p>
                      </div>

                      {/* Action Bar (Updated) */}
                      <div className="grid grid-cols-4 gap-4 mt-auto pt-2 items-center max-w-[400px] mx-auto">
                        {/* Skip Button */}
                        <button
                          onClick={handleSkip}
                          className="col-span-1 aspect-square rounded-full bg-gray-800/60 backdrop-blur-md border border-white/10 text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 transition-all active:scale-90 flex items-center justify-center group"
                          aria-label="Skip"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="group-hover:text-red-500 transition-colors"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>

                        {/* Chat Button (Prominent) */}
                        <button
                          onClick={handleChat}
                          className="col-span-2 h-14 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-pink-900/40 flex items-center justify-center gap-2"
                        >
                          <span>Say Hi</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                          </svg>
                        </button>

                        {/* Like Button */}
                        <button
                          onClick={handleLike}
                          className="col-span-1 aspect-square rounded-full bg-gray-800/60 backdrop-blur-md border border-white/10 text-gray-400 hover:text-white hover:bg-pink-500/20 hover:border-pink-500/30 transition-all active:scale-90 flex items-center justify-center group"
                          aria-label="Like"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="group-hover:text-pink-500 transition-colors"
                          >
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-white/5 rounded-3xl border border-white/5 m-4">
                <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center text-4xl mb-4 shadow-inner">
                  🌙
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  All Caught Up
                </h3>
                <p className="text-gray-500 text-sm text-center max-w-[200px]">
                  Adjust your filters or check back later for new profiles.
                </p>
                <button
                  onClick={() => setSelectedIntents([])}
                  className="mt-6 text-pink-500 text-xs font-bold uppercase tracking-widest hover:text-pink-400"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col gap-6 overflow-y-auto no-scrollbar pb-6">
            <div className="glass rounded-3xl border border-white/5 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-widest">
                    Weekend Plans
                  </h2>
                  <p className="text-xs text-gray-500 uppercase tracking-[0.3em]">
                    Premium only creation
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    premiumUnlocked
                      ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
                      : "text-pink-300 border-pink-500/30 bg-pink-500/10"
                  }`}
                >
                  {premiumUnlocked ? "Premium" : "Locked"}
                </div>
              </div>

              {!premiumUnlocked && (
                <div className="space-y-4">
                  {paymentPending ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
                      <p className="font-bold uppercase tracking-widest text-xs text-kipepeo-pink mb-2">
                        Pending verification
                      </p>
                      <p>
                        Your payment is under review. Approval usually takes
                        5-15 minutes.
                      </p>
                    </div>
                  ) : paymentRejected ? (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
                      <p className="font-bold uppercase tracking-widest text-xs mb-2">
                        Payment rejected
                      </p>
                      <p>
                        Please re-submit your M-Pesa confirmation or contact
                        support.
                      </p>
                      <button
                        onClick={() => setShowPaymentProof(true)}
                        className="mt-3 px-4 py-2 rounded-full bg-red-500/20 text-red-200 text-xs font-black uppercase tracking-widest border border-red-500/30 active:scale-95 transition-transform"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : showPaymentProof ? (
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400">
                        Paste M-Pesa Confirmation Message
                      </label>
                      <textarea
                        value={paymentProof}
                        onChange={(e) => setPaymentProof(e.target.value)}
                        rows={4}
                        className="w-full rounded-2xl bg-white/5 border border-white/10 p-3 text-sm focus:outline-none"
                        placeholder="Paste full M-Pesa message here..."
                      />
                      {parsedMpesa && (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] uppercase tracking-widest text-gray-500">
                              AI Parse
                            </p>
                            <span className="text-[10px] uppercase tracking-widest text-kipepeo-pink">
                              {Math.round(parsedMpesa.confidence * 100)}% confidence
                            </span>
                          </div>
                          <div className="mt-2 grid gap-2 text-xs text-gray-300">
                            <div className="flex items-center justify-between">
                              <span>Amount</span>
                              <span className="text-white">
                                {parsedMpesa.amount ? `KES ${parsedMpesa.amount}` : "-"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Till/Paybill</span>
                              <span className="text-white">
                                {parsedMpesa.till ?? "-"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Transaction</span>
                              <span className="text-white">
                                {parsedMpesa.transactionId ?? "-"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Date/Time</span>
                              <span className="text-white">
                                {parsedMpesa.date ?? "-"} {parsedMpesa.time ?? ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      {paymentError && (
                        <p className="text-xs text-red-400">{paymentError}</p>
                      )}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handlePaymentSubmit}
                          disabled={paymentSubmitting}
                          className="flex-1 py-3 rounded-full bg-kipepeo-pink text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-60"
                        >
                          {paymentSubmitting ? "Submitting..." : "Send Proof"}
                        </button>
                        <button
                          onClick={() => setShowPaymentProof(false)}
                          className="px-4 py-3 rounded-full bg-white/5 text-gray-400 text-xs font-black uppercase tracking-widest border border-white/10 active:scale-95 transition-transform"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                      <p className="text-sm text-gray-300">
                        Creating a Weekend Plan is a premium feature.
                      </p>
                      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-gray-400">
                        <span>Price</span>
                        <span className="text-white font-black">
                          KES {PREMIUM_PRICE_KES} per month
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-gray-400">
                        <span>M-Pesa Till</span>
                        <span className="text-white font-black">
                          {MPESA_TILL_NUMBER}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowPaymentProof(true)}
                        className="w-full py-3 rounded-full bg-kipepeo-pink text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
                      >
                        I Have Paid
                      </button>
                      {paymentError && (
                        <p className="text-xs text-red-400">{paymentError}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {premiumUnlocked && (
                <div className="space-y-3">
                  {isOwner && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
                      Owner accounts are premium by default but cannot create or
                      RSVP to plans.
                    </div>
                  )}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                          AI Plan Templates
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em]">
                          Tap to autofill
                        </p>
                      </div>
                      <span className="text-[10px] uppercase tracking-widest text-kipepeo-pink">
                        Smart
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {planTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => {
                            const next = buildPlanFromTemplate(template, user);
                            setPlanTitle(next.title);
                            setPlanDescription(next.description);
                            setPlanLocation(next.location);
                            setPlanTime(next.time);
                            setPlanCategory(next.category);
                          }}
                          className="px-3 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-gray-300 hover:bg-white/10 active:scale-95"
                        >
                          {template.title}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={planTitle}
                      onChange={(e) => setPlanTitle(e.target.value)}
                      placeholder="Plan title"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none"
                    />
                    <select
                      value={planCategory}
                      onChange={(e) => setPlanCategory(e.target.value)}
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none"
                    >
                      <option value="Hangout">Hangout</option>
                      <option value="Dinner">Dinner</option>
                      <option value="Adventure">Adventure</option>
                      <option value="Party">Party</option>
                    </select>
                    <input
                      value={planLocation}
                      onChange={(e) => setPlanLocation(e.target.value)}
                      placeholder="Location / area"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none"
                    />
                    <input
                      value={planTime}
                      onChange={(e) => setPlanTime(e.target.value)}
                      placeholder="Time / date"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none"
                    />
                  </div>
                  <textarea
                    value={planDescription}
                    onChange={(e) => setPlanDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe the plan details..."
                    className="w-full rounded-2xl bg-white/5 border border-white/10 p-3 text-sm focus:outline-none"
                  />
                  {planActionError && (
                    <p className="text-xs text-red-400">{planActionError}</p>
                  )}
                  <button
                    onClick={handlePlanSubmit}
                    disabled={planSubmitting || isOwner}
                    className="w-full py-3 rounded-full bg-kipepeo-pink text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-60"
                  >
                    {isOwner
                      ? "Owner cannot create plans"
                      : planSubmitting
                        ? "Creating..."
                        : "Create Weekend Plan"}
                  </button>
                </div>
              )}
            </div>

            {rsvpSuccess && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                {rsvpSuccess}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">
                  Plans Feed
                </h3>
                <span className="text-[10px] text-gray-600 uppercase tracking-[0.3em]">
                  {plans.length} plans
                </span>
              </div>
              {plansLoading ? (
                <div className="text-center py-10 text-gray-500 text-sm">
                  Loading plans...
                </div>
              ) : plansError ? (
                <div className="text-center py-10 text-red-400 text-sm">
                  {plansError}
                </div>
              ) : plans.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">
                  No plans yet. Be the first to create one.
                </div>
              ) : (
                <div className="space-y-4">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className="glass rounded-2xl border border-white/5 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-black text-lg">{plan.title}</h4>
                          <p className="text-xs text-gray-500 uppercase tracking-widest">
                            {plan.category} - by {plan.creatorNickname}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {plan.location || "TBD location"} •{" "}
                            {plan.time || "TBD time"}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {plan.rsvpCount ?? 0} RSVP
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">
                        {plan.description}
                      </p>
                      <button
                        onClick={() => handleRsvpOpen(plan)}
                        className="w-full py-2 rounded-full bg-white/5 text-gray-200 text-xs font-black uppercase tracking-widest border border-white/10 active:scale-95 transition-transform disabled:opacity-60"
                        disabled={isOwner}
                      >
                        {isOwner ? "Owner can't RSVP" : "RSVP"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {rsvpTarget && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
                <div className="w-full max-w-md glass rounded-2xl border border-white/10 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black uppercase tracking-widest">
                        RSVP
                      </h3>
                      <p className="text-xs text-gray-400">
                        {rsvpTarget.title} - {rsvpTarget.location}
                      </p>
                    </div>
                    <button
                      onClick={() => setRsvpTarget(null)}
                      className="text-xs uppercase tracking-widest text-gray-400"
                    >
                      Close
                    </button>
                  </div>

                  <div className="space-y-3">
                    <input
                      value={rsvpName}
                      onChange={(e) => setRsvpName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none"
                    />
                    <input
                      value={rsvpContact}
                      onChange={(e) => setRsvpContact(e.target.value)}
                      placeholder="Contact (WhatsApp or phone)"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none"
                    />
                    <input
                      value={rsvpAvailability}
                      onChange={(e) => setRsvpAvailability(e.target.value)}
                      placeholder="Availability / time"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none"
                    />
                    <select
                      value={rsvpGroupSize}
                      onChange={(e) => setRsvpGroupSize(e.target.value)}
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none"
                    >
                      <option value="1">1 person</option>
                      <option value="2">2 people</option>
                      <option value="3">3 people</option>
                      <option value="4">4+ people</option>
                    </select>
                    <textarea
                      value={rsvpNote}
                      onChange={(e) => setRsvpNote(e.target.value)}
                      rows={3}
                      placeholder="Anything else the host should know?"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 p-3 text-sm focus:outline-none"
                    />
                    {rsvpError && (
                      <p className="text-xs text-red-400">{rsvpError}</p>
                    )}
                    <button
                      onClick={handleRsvpSubmit}
                      disabled={rsvpSubmitting}
                      className="w-full py-3 rounded-full bg-kipepeo-pink text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-60"
                    >
                      {rsvpSubmitting ? "Submitting..." : "Send RSVP"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoverPage;
