import React, {
  useDeferredValue,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti"; // Import the confetti library
import {
  AppNotification,
  DailyDrop,
  PaymentRequest,
  UserProfile,
  WeekendPlan,
} from "../types";
import FilterModal from "../hushly/components/FilterModal";
import type { Filters as DiscoverFilters } from "../hushly/types";
import LiveSection from "../hushly/components/LiveSection";
import GameHub from "../hushly/components/GameHub";
import type { User as LiveUser } from "../hushly/types";
import {
  getAllUsers,
  getAllUserSettings,
  getUserProfile,
} from "../services/userService";
import AppImage from "../components/AppImage";
import { ensureConversation } from "../services/chatService";
import LottiePlayer from "../components/LottiePlayer";
import {
  createLikeNotification,
  createNotification,
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
import {
  createLike,
  deleteLike,
  listenToLikesReceived,
  listenToLikesSent,
} from "../services/likeService";
import {
  createDislike,
  deleteDislike,
  listenToDislikesSent,
} from "../services/dislikeService";
import {
  getKenyanMatchSuggestions,
  getMatchReasons,
  rankProfiles,
  semanticSearchProfiles,
  type KenyanMatchSuggestion,
} from "../services/aiService";
import {
  loadAiSignals,
  recordChatSignal,
  recordDwellSignal,
  recordLikeSignal,
  recordSkipSignal,
} from "../services/aiSignals";
import {
  createDailyDrop,
  listenToDailyDrop,
  markDailyDropAction,
} from "../services/dailyDropService";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "dotlottie-wc": any;
    }
  }
}

const MPESA_FORMAT_REGEX =
  /[A-Z0-9]{8,12}\s+Confirmed\.\s+Ksh\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s+sent\s+to\s+.+?\s+on\s+\d{1,2}\/\d{1,2}\/\d{2,4}\s+at\s+\d{1,2}:\d{2}\s?(?:AM|PM)\./i;

const DAILY_DROP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAILY_DROP_SIZE = 12;
const HUB_SPLASH_DURATION_MS = 5000;
const HUB_EXIT_SPLASH_DURATION_MS = 2000;

const resolveViewFromSearch = (
  search: string,
): "discover" | "live" | "hub" | "plans" | "portal" => {
  const params = new URLSearchParams(search);
  const view = params.get("view");
  if (
    view === "live" ||
    view === "hub" ||
    view === "plans" ||
    view === "portal"
  ) {
    return view;
  }
  return "discover";
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

const matchesGenderFilter = (
  profileGender: UserProfile["gender"] | undefined,
  filterGender: string,
) => {
  if (filterGender === "Everyone") return true;
  if (!profileGender) return false;
  if (filterGender === "Women") return profileGender === "female";
  if (filterGender === "Men") return profileGender === "male";
  return true;
};

const matchesAgeRange = (
  profileAgeRange: string | undefined,
  filterRange: [number, number],
) => {
  const parsed = parseAgeRange(profileAgeRange);
  if (!parsed) return true;
  const [min, max] = filterRange;
  return parsed.max >= min && parsed.min <= max;
};

const DiscoverPage: React.FC<{ user: UserProfile }> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const filtersDirtyKey = `hushly_filters_dirty_${user.id}`;
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<DiscoverFilters>(() => ({
    gender: "Everyone",
    ageRange: [18, 37],
    location: user.area || "Nairobi",
    distance: 50,
    hasBio: false,
    interests: [],
    lookingFor: "",
    languages: [],
    zodiac: "",
    education: "",
    familyPlans: "",
    communicationStyle: "",
    loveStyle: "",
    pets: "",
    drinking: "",
    smoking: "",
    workout: "",
    socialMedia: "",
    expandDistance: true,
    expandAge: true,
    mode: "For You",
  }));
  const [filtersDirty, setFiltersDirty] = useState(false);
  const [headerToggle, setHeaderToggle] = useState(true);
  const [showStarBurst, setShowStarBurst] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [isSimulation, setIsSimulation] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [aiSignals, setAiSignals] = useState(() => loadAiSignals());
  const [view, setView] = useState<
    "discover" | "live" | "hub" | "plans" | "portal"
  >(() => resolveViewFromSearch(location.search));
  const [hubSplash, setHubSplash] = useState<{
    title: string;
    subtitle: string;
  } | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [plans, setPlans] = useState<WeekendPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [dailyDrop, setDailyDrop] = useState<DailyDrop | null>(null);
  const [dailyDropLoading, setDailyDropLoading] = useState(true);
  const [showDailyDropIntro, setShowDailyDropIntro] = useState(false);
  const [dropGenerating, setDropGenerating] = useState(false);
  const [likesReady, setLikesReady] = useState(false);
  const [dislikesReady, setDislikesReady] = useState(false);
  const dropGenerationLockRef = useRef(false);
  const [now, setNow] = useState(Date.now());
  const [planTitle, setPlanTitle] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [planLocation, setPlanLocation] = useState("");
  const [planTime, setPlanTime] = useState("");
  const [planCategory, setPlanCategory] = useState("Hangout");
  const [planSubmitting, setPlanSubmitting] = useState(false);
  const [planActionError, setPlanActionError] = useState<string | null>(null);
  const [premiumCheckUser, setPremiumCheckUser] = useState<UserProfile | null>(
    null,
  );
  const [premiumChecking, setPremiumChecking] = useState(false);
  const [premiumCheckError, setPremiumCheckError] = useState<string | null>(
    null,
  );
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [paymentProof, setPaymentProof] = useState("");
  const [showPaymentProof, setShowPaymentProof] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentInvalidAttempts, setPaymentInvalidAttempts] = useState(0);
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
  const [, startAiTransition] = useTransition();
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likedMeIds, setLikedMeIds] = useState<Set<string>>(new Set());
  const [dislikedIds, setDislikedIds] = useState<Set<string>>(new Set());
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchProfile, setMatchProfile] = useState<UserProfile | null>(null);
  const [matchSuggestions, setMatchSuggestions] = useState<
    KenyanMatchSuggestion[]
  >([]);
  const lastProfileRef = useRef<UserProfile | null>(null);
  const lastViewStartRef = useRef<number>(Date.now());
  const hubSplashTimerRef = useRef<number | null>(null);
  const hubExitTimerRef = useRef<number | null>(null);
  const deferredSignals = useDeferredValue(aiSignals);
  const deferredQuery = useDeferredValue(aiQuery);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(filtersDirtyKey);
    setFiltersDirty(stored === "1");
  }, [filtersDirtyKey]);

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
    if (view !== "discover") return;
    setNow(Date.now());
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => window.clearInterval(interval);
  }, [view]);

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
    const unsubscribe = listenToDailyDrop(
      user.id,
      (drop) => {
        setDailyDrop(drop);
        setDailyDropLoading(false);
      },
      () => {
        setDailyDropLoading(false);
      },
    );
    return () => unsubscribe();
  }, [user.id]);

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

  useEffect(() => {
    if (view !== "plans") return;
    let active = true;
    setPremiumChecking(true);
    setPremiumCheckError(null);
    setPremiumCheckUser(null);
    getUserProfile(user.id)
      .then((profile) => {
        if (!active) return;
        setPremiumCheckUser(profile ?? null);
      })
      .catch((error) => {
        console.error(error);
        if (!active) return;
        setPremiumCheckError("Unable to confirm premium status.");
      })
      .finally(() => {
        if (active) setPremiumChecking(false);
      });
    return () => {
      active = false;
    };
  }, [view, user.id]);

  useEffect(() => {
    const unsubscribe = listenToLikesSent(
      user.id,
      (items) => {
        const next = new Set(items.map((like) => like.toUserId));
        setLikedIds(next);
        setLikesReady(true);
      },
      (error) => {
        console.error(error);
        setLikesReady(true);
      },
    );
    return () => unsubscribe();
  }, [user.id]);

  useEffect(() => {
    const unsubscribe = listenToLikesReceived(
      user.id,
      (items) => {
        const next = new Set(items.map((like) => like.fromUserId));
        setLikedMeIds(next);
      },
      (error) => {
        console.error(error);
      },
    );
    return () => unsubscribe();
  }, [user.id]);

  useEffect(() => {
    const unsubscribe = listenToDislikesSent(
      user.id,
      (items) => {
        const next = new Set(items.map((dislike) => dislike.toUserId));
        setDislikedIds(next);
        setDislikesReady(true);
      },
      (error) => {
        console.error(error);
        setDislikesReady(true);
      },
    );
    return () => unsubscribe();
  }, [user.id]);

  const seenIds = useMemo(
    () => new Set([...likedIds, ...dislikedIds]),
    [likedIds, dislikedIds],
  );

  const preferredGenders = useMemo(() => {
    if (user.interestedIn && user.interestedIn.length > 0) {
      return user.interestedIn;
    }
    if (user.gender === "male") return ["female"];
    if (user.gender === "female") return ["male"];
    return ["everyone"];
  }, [user.gender, user.interestedIn]);

  const matchesDiscoverFilters = useMemo(() => {
    const allowAllGenders = preferredGenders.includes("everyone");
    return (profile: UserProfile) => {
      if (!allowAllGenders) {
        if (!profile.gender) return false;
        if (!preferredGenders.includes(profile.gender)) return false;
      }
      if (!filtersDirty) return true;
      if (!matchesGenderFilter(profile.gender, filters.gender)) return false;
      if (filters.hasBio && !profile.bio?.trim()) return false;
      if (
        filters.location &&
        filters.location !== "All" &&
        profile.area !== filters.location
      ) {
        return false;
      }
      if (!matchesAgeRange(profile.ageRange, filters.ageRange)) return false;
      return true;
    };
  }, [filters, preferredGenders, filtersDirty]);

  const eligibleProfiles = useMemo(
    () =>
      profiles.filter(
        (profile) =>
          !seenIds.has(profile.id) && matchesDiscoverFilters(profile),
      ),
    [profiles, seenIds, matchesDiscoverFilters],
  );

  const profileMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    profiles.forEach((profile) => {
      map.set(profile.id, profile);
    });
    return map;
  }, [profiles]);

  const dropProfiles = useMemo(() => {
    if (!dailyDrop) return [];
    return dailyDrop.profileIds
      .map((id) => profileMap.get(id))
      .filter((profile): profile is UserProfile => Boolean(profile));
  }, [dailyDrop, profileMap]);

  const actionedSet = useMemo(
    () => new Set(dailyDrop?.actionedIds ?? []),
    [dailyDrop?.actionedIds],
  );

  const remainingDropProfiles = useMemo(
    () => dropProfiles.filter((profile) => !actionedSet.has(profile.id)),
    [dropProfiles, actionedSet],
  );

  const visibleDropProfiles = useMemo(
    () => remainingDropProfiles.filter(matchesDiscoverFilters),
    [remainingDropProfiles, matchesDiscoverFilters],
  );

  const filteredProfiles = useMemo(() => {
    if (!visibleDropProfiles.length) return [];
    if (!deferredQuery) return visibleDropProfiles;
    const semanticMatches = semanticSearchProfiles(
      deferredQuery,
      visibleDropProfiles,
    );
    const semanticIds = new Set(semanticMatches.map((item) => item.profile.id));
    const candidates =
      semanticIds.size > 0
        ? visibleDropProfiles.filter((profile) => semanticIds.has(profile.id))
        : visibleDropProfiles;
    const ranked = rankProfiles({
      user,
      profiles: candidates,
      signals: deferredSignals,
      semanticQuery: deferredQuery,
    });
    return ranked.map((item) => item.profile);
  }, [visibleDropProfiles, deferredQuery, deferredSignals, user]);

  const matchReasons = useMemo(() => {
    const map = new Map<string, string[]>();
    filteredProfiles.forEach((profile) => {
      map.set(profile.id, getMatchReasons(user, profile, deferredSignals));
    });
    return map;
  }, [filteredProfiles, deferredSignals, user]);

  const simulationProfiles = useMemo(() => {
    if (visibleDropProfiles.length) return visibleDropProfiles;
    return eligibleProfiles;
  }, [visibleDropProfiles, eligibleProfiles]);

  const activeProfiles = isSimulation ? simulationProfiles : filteredProfiles;

  const dropTotal = dailyDrop?.profileIds.length ?? 0;
  const dropRemaining = remainingDropProfiles.length;
  const dropCompleted =
    Boolean(dailyDrop) && dropTotal > 0 && dropRemaining === 0;
  const dropCountValue = dailyDrop
    ? visibleDropProfiles.length
    : filteredProfiles.length;
  const outOfSwipes = dropCompleted;
  const shouldShowEmptyState =
    (outOfSwipes && !isSimulation) || filteredProfiles.length === 0;
  const emptyStateTitle =
    filteredProfiles.length === 0
      ? "No Profiles Match Filters"
      : "No Matches Left Today";
  const emptyStateBody =
    filteredProfiles.length === 0
      ? "Try adjusting your discovery settings to see more people from the tribe."
      : "Check back later as your drop refreshes.";
  const nextDropAt = dailyDrop
    ? dailyDrop.lastDropAt + DAILY_DROP_INTERVAL_MS
    : 0;
  const timeRemainingMs = Math.max(nextDropAt - now, 0);
  const timeRemainingHours = Math.floor(timeRemainingMs / (60 * 60 * 1000));
  const timeRemainingMinutes = Math.floor(
    (timeRemainingMs % (60 * 60 * 1000)) / (60 * 1000),
  );

  useEffect(() => {
    if (loading || dailyDropLoading || !likesReady || !dislikesReady) return;
    const shouldRefresh =
      !dailyDrop || now - dailyDrop.lastDropAt >= DAILY_DROP_INTERVAL_MS;
    if (!shouldRefresh) return;
    if (dropGenerationLockRef.current) return;

    dropGenerationLockRef.current = true;
    setDropGenerating(true);
    const dropSize = Math.max(1, DEFAULT_DAILY_DROP_SIZE);
    const candidates = [...eligibleProfiles];
    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const selected = candidates.slice(0, dropSize);
    const selectedIds = selected.map((profile) => profile.id);

    const dropFilters = filtersDirty
      ? {
          ...filters,
          genders: preferredGenders,
        }
      : {
          genders: preferredGenders,
        };

    void createDailyDrop({
      userId: user.id,
      profileIds: selectedIds,
      dropSize,
      filters: dropFilters,
    })
      .then(() => {
        if (!selectedIds.length) return;
        return createNotification({
          toUserId: user.id,
          fromUserId: user.id,
          fromNickname: user.nickname,
          type: "system",
          body: "Your new matches are waiting.",
        });
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        dropGenerationLockRef.current = false;
        setDropGenerating(false);
      });
  }, [
    loading,
    dailyDropLoading,
    likesReady,
    dislikesReady,
    dailyDrop,
    now,
    eligibleProfiles,
    filters,
    filtersDirty,
    user.id,
    user.nickname,
    preferredGenders,
  ]);

  useEffect(() => {
    if (!dailyDrop) return;
    const key = `hushly_daily_drop_seen_${user.id}`;
    const lastSeen = Number(localStorage.getItem(key) || "0");
    if (dailyDrop.lastDropAt > lastSeen) {
      setShowDailyDropIntro(true);
    }
  }, [dailyDrop, user.id]);

  useEffect(() => {
    if (!showDailyDropIntro) return;
    const brandColors = ["#ec4899", "#a855f7", "#ffffff", "#22c55e"];
    requestAnimationFrame(() => {
      confetti({
        particleCount: 220,
        spread: 110,
        origin: { y: 0.6 },
        colors: brandColors,
        disableForReducedMotion: true,
        zIndex: 9999,
        gravity: 1.1,
        scalar: 1.1,
        ticks: 320,
      });
    });
  }, [showDailyDropIntro]);

  useEffect(() => {
    if (currentIndex >= filteredProfiles.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, filteredProfiles.length]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [dailyDrop?.lastDropAt, aiQuery, filters]);

  const current =
    filteredProfiles.length > 0
      ? filteredProfiles[currentIndex % filteredProfiles.length]
      : null;
  const currentAge = current?.ageRange
    ? parseAgeRange(current.ageRange)?.min
    : undefined;
  const distanceLabel = current
    ? (() => {
        let hash = 0;
        for (let i = 0; i < current.id.length; i += 1) {
          hash = (hash * 31 + current.id.charCodeAt(i)) % 31;
        }
        const km = 2 + (hash % 28);
        return `${km}km away`;
      })()
    : "";

  const liveUser = useMemo<LiveUser | null>(() => {
    if (!user) return null;
    const parsedAge = parseAgeRange(user.ageRange);
    const age = parsedAge ? parsedAge.min : 18;
    const normalizedEmail = user.email?.trim().toLowerCase() ?? "";
    const ownerEmail = OWNER_EMAIL.trim().toLowerCase();
    const isOwner = Boolean(normalizedEmail && normalizedEmail === ownerEmail);
    const hasPremium =
      Boolean(user.isPremium) &&
      (!user.premiumExpiresAt || user.premiumExpiresAt > Date.now());
    const isPaid = isOwner || hasPremium;
    return {
      id: user.id,
      name: user.nickname || user.realName || "Member",
      email: user.email,
      nickname: user.nickname,
      gender: user.gender ?? "other",
      interests: [],
      intents: user.intents ?? [],
      age,
      location: user.area || "Nairobi",
      bio: user.bio || "",
      isPaid,
      dailySwipesRemaining: 0,
      lastDropAt: Date.now(),
      avatar: {
        base: "Male Body",
        baseColor: "#475569",
        outfit: "None",
        outfitColor: "#475569",
        accessory: "None",
        accessoryColor: "#475569",
        hair: "None",
        hairColor: "#475569",
      },
      achievements: [],
      photos: user.photoUrl ? [user.photoUrl] : [],
      voiceIntro: user.voiceIntroUrl,
      followingIds: [],
      followerCount: user.followerCount ?? 0,
      lifestyle: undefined,
      personality: undefined,
      prompts: undefined,
    };
  }, [user]);

  const clearLike = (profileId: string) => {
    if (!likedIds.has(profileId)) return;
    void deleteLike(user.id, profileId);
    setLikedIds((prev) => {
      const next = new Set(prev);
      next.delete(profileId);
      return next;
    });
  };

  const clearDislike = (profileId: string) => {
    if (!dislikedIds.has(profileId)) return;
    void deleteDislike(user.id, profileId);
    setDislikedIds((prev) => {
      const next = new Set(prev);
      next.delete(profileId);
      return next;
    });
  };

  useEffect(() => {
    const now = Date.now();
    if (lastProfileRef.current && lastProfileRef.current.id !== current?.id) {
      const dwellMs = now - lastViewStartRef.current;
      const updated = recordDwellSignal(lastProfileRef.current, dwellMs);
      startAiTransition(() => setAiSignals(updated));
    }
    if (current) {
      lastProfileRef.current = current;
      lastViewStartRef.current = now;
    }
  }, [current?.id]);

  useEffect(() => {
    return () => {
      if (lastProfileRef.current) {
        const updated = recordDwellSignal(
          lastProfileRef.current,
          Date.now() - lastViewStartRef.current,
        );
        startAiTransition(() => setAiSignals(updated));
      }
    };
  }, []);
  const unreadNotifications = notifications.filter((n) => !n.read);
  const unreadConversationCount = useMemo(() => {
    const ids = new Set<string>();
    notifications.forEach((notification) => {
      if (!notification.read && notification.conversationId) {
        ids.add(notification.conversationId);
      }
    });
    return ids.size;
  }, [notifications]);
  const isOwner = user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const latestPaymentRequest = paymentRequests[0] ?? null;
  const paymentStatus = latestPaymentRequest?.status ?? null;
  const premiumUser = premiumCheckUser ?? user;
  const premiumActive =
    Boolean(premiumUser.isPremium) &&
    (!premiumUser.premiumExpiresAt ||
      premiumUser.premiumExpiresAt > Date.now());
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
  const isMpesaFormatValid = useMemo(() => {
    const text = paymentProof.replace(/\s+/g, " ").trim();
    if (!text) return false;
    const hasBalance = /New\s+M-PESA\s+balance\s+is\s+Ksh/i.test(text);
    return MPESA_FORMAT_REGEX.test(text) && hasBalance;
  }, [paymentProof]);
  const showMpesaFormatWarning = Boolean(
    paymentProof.trim() && !isMpesaFormatValid,
  );

  useEffect(() => {
    const nextView = resolveViewFromSearch(location.search);
    setView((prev) => (prev === nextView ? prev : nextView));
  }, [location.search]);

  useEffect(() => {
    if (view !== "discover") return;
    const interval = window.setInterval(() => {
      setHeaderToggle((prev) => !prev);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [view]);

  useEffect(() => {
    if (view !== "discover") {
      setCountdown("");
      return;
    }
    if (!outOfSwipes || isSimulation) {
      setCountdown("");
      return;
    }
    const updateCountdown = () => {
      const nowTs = Date.now();
      const fallbackNext = nowTs + DAILY_DROP_INTERVAL_MS;
      const target = nextDropAt || fallbackNext;
      const diff = target - nowTs;
      if (diff <= 0) {
        setCountdown("00:00:00");
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(
        `${h.toString().padStart(2, "0")}:${m
          .toString()
          .padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
      );
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [view, outOfSwipes, isSimulation, nextDropAt]);

  useEffect(() => {
    if (view !== "discover" && isFilterModalOpen) {
      setIsFilterModalOpen(false);
    }
  }, [view, isFilterModalOpen]);

  const triggerHubSplash = useCallback(
    (title: string, subtitle: string, duration = HUB_SPLASH_DURATION_MS) => {
      if (hubSplashTimerRef.current) {
        window.clearTimeout(hubSplashTimerRef.current);
      }
      setHubSplash({ title, subtitle });
      hubSplashTimerRef.current = window.setTimeout(() => {
        setHubSplash(null);
        hubSplashTimerRef.current = null;
      }, duration);
    },
    [],
  );

  useEffect(() => {
    if (view === "hub") {
      triggerHubSplash("Welcome to the Hub", "Loading the lounge...");
      return;
    }
    if (hubExitTimerRef.current) {
      window.clearTimeout(hubExitTimerRef.current);
      hubExitTimerRef.current = null;
    }
  }, [triggerHubSplash, view]);

  useEffect(() => {
    return () => {
      if (hubSplashTimerRef.current) {
        window.clearTimeout(hubSplashTimerRef.current);
      }
      if (hubExitTimerRef.current) {
        window.clearTimeout(hubExitTimerRef.current);
      }
    };
  }, []);

  const applyViewChange = useCallback(
    (nextView: "discover" | "live" | "hub" | "plans" | "portal") => {
      setView(nextView);
      const params = new URLSearchParams(location.search);
      if (nextView === "discover") {
        params.delete("view");
      } else {
        params.set("view", nextView);
      }
      const search = params.toString();
      navigate(
        {
          pathname: location.pathname,
          search: search ? `?${search}` : "",
        },
        { replace: true },
      );
    },
    [location.pathname, location.search, navigate],
  );

  const updateView = useCallback(
    (nextView: "discover" | "live" | "hub" | "plans" | "portal") => {
      if (view === "hub" && nextView !== "hub") {
        if (hubExitTimerRef.current) {
          window.clearTimeout(hubExitTimerRef.current);
        }
        triggerHubSplash("Goodbye from the Hub", "See you again soon.");
        hubExitTimerRef.current = window.setTimeout(() => {
          applyViewChange(nextView);
          hubExitTimerRef.current = null;
        }, HUB_EXIT_SPLASH_DURATION_MS);
        return;
      }
      applyViewChange(nextView);
    },
    [applyViewChange, triggerHubSplash, view],
  );
  const handleExitToDiscover = useCallback(
    () => updateView("discover"),
    [updateView],
  );
  const handleUpgradePlans = useCallback(
    () => updateView("plans"),
    [updateView],
  );
  const hubSections = useMemo(
    () => [
      {
        id: "games",
        title: "Games Zone",
        tagline: "Arcade floor with neon co-op",
        accent: "from-emerald-400 via-cyan-300 to-blue-400",
        items: [
          {
            title: "Neon Trivia Rush",
            description: "Fast quizzes, loud energy.",
            status: "Live",
            participants: 18,
            capacity: 40,
            time: "8m left",
            action: "Join Now",
          },
          {
            title: "Mood Match Memory",
            description: "Flip cards, find your vibe.",
            status: "Starting",
            participants: 6,
            capacity: 16,
            time: "Starts in 4m",
            action: "Reserve Seat",
          },
          {
            title: "Glow Pong Arena",
            description: "Quick duels with strangers.",
            status: "Open",
            participants: 0,
            capacity: 2,
            time: "Open floor",
            action: "Enter",
          },
        ],
      },
      {
        id: "activities",
        title: "Activities & Events",
        tagline: "Pop-up challenges and polls",
        accent: "from-pink-400 via-purple-400 to-indigo-400",
        items: [
          {
            title: "Pulse Poll: Friday Energy",
            description: "Vote + see the live heatmap.",
            status: "Live",
            participants: 92,
            capacity: 200,
            time: "Live now",
            action: "Vote",
          },
          {
            title: "Icebreaker Roulette",
            description: "30 seconds, new prompt.",
            status: "Starting",
            participants: 14,
            capacity: 30,
            time: "Starts in 2m",
            action: "Queue In",
          },
          {
            title: "Weekend Dare",
            description: "Mini challenge for bold users.",
            status: "Open",
            participants: 5,
            capacity: 50,
            time: "Open all day",
            action: "Join",
          },
        ],
      },
      {
        id: "lounge",
        title: "Social Lounge",
        tagline: "Live rooms + reactions",
        accent: "from-amber-300 via-orange-400 to-rose-400",
        items: [
          {
            title: "Main Lounge Feed",
            description: "See who is hanging out.",
            status: "Live",
            participants: 34,
            capacity: 80,
            time: "Always on",
            action: "Step In",
          },
          {
            title: "Confession Corner",
            description: "Anonymous stories + replies.",
            status: "Open",
            participants: 12,
            capacity: 100,
            time: "Open now",
            action: "Enter",
          },
          {
            title: "After Hours Audio",
            description: "Low-key chat with soft music.",
            status: "Starting",
            participants: 9,
            capacity: 25,
            time: "Starts in 6m",
            action: "Save Spot",
          },
        ],
      },
      {
        id: "hangout",
        title: "Hangout Hall",
        tagline: "Community tables + debates",
        accent: "from-sky-400 via-teal-300 to-emerald-400",
        items: [
          {
            title: "Community Table",
            description: "Meet locals, quick intros.",
            status: "Live",
            participants: 21,
            capacity: 60,
            time: "Live now",
            action: "Join",
          },
          {
            title: "Hot Takes Stage",
            description: "Debate prompts, vote winners.",
            status: "Starting",
            participants: 8,
            capacity: 20,
            time: "Starts in 9m",
            action: "Join",
          },
          {
            title: "Chill Plaza",
            description: "Silent lounge to vibe.",
            status: "Open",
            participants: 4,
            capacity: 40,
            time: "Open now",
            action: "Enter",
          },
        ],
      },
    ],
    [],
  );

  const hubLiveCount = useMemo(
    () =>
      hubSections.reduce(
        (total, section) =>
          total + section.items.filter((item) => item.status === "Live").length,
        0,
      ),
    [hubSections],
  );

  const hubParticipantCount = useMemo(
    () =>
      hubSections.reduce(
        (total, section) =>
          total +
          section.items.reduce((count, item) => count + item.participants, 0),
        0,
      ),
    [hubSections],
  );
  const hubDirectory = useMemo(
    () => [
      "Games Zone",
      "Activities",
      "Social Lounge",
      "Hangout Hall",
      "Arcade Row",
      "Atrium",
      "Plaza",
      "Challenges",
    ],
    [],
  );
  const tabIndex =
    view === "discover"
      ? 0
      : view === "live"
        ? 1
        : view === "hub"
          ? 2
          : view === "plans"
            ? 3
            : 0;

  const handleStartChat = async (target: UserProfile) => {
    try {
      const conversationId = await ensureConversation(user, target);
      const updated = recordChatSignal(target);
      startAiTransition(() => setAiSignals(updated));
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

  const handleCloseDailyDropIntro = () => {
    if (dailyDrop) {
      localStorage.setItem(
        `hushly_daily_drop_seen_${user.id}`,
        String(dailyDrop.lastDropAt),
      );
    }
    setShowDailyDropIntro(false);
  };

  const handlePlanSubmit = async () => {
    if (premiumChecking) {
      setPlanActionError("Confirming premium status...");
      return;
    }
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
    if (premiumChecking) {
      setPlanActionError("Confirming premium status...");
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
    if (premiumChecking) {
      setPaymentError("Confirming premium status...");
      return;
    }
    if (!paymentProof.trim()) {
      setPaymentError("Paste the full M-Pesa confirmation message.");
      return;
    }
    if (!isMpesaFormatValid) {
      setPaymentInvalidAttempts((prev) => prev + 1);
      setPaymentError(
        "The M-Pesa message format doesn't look right. Paste the full confirmation message.",
      );
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
      setPaymentInvalidAttempts(0);
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
  const advanceSimulationProfile = () => {
    if (filteredProfiles.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % filteredProfiles.length);
  };

  const handleNextProfile = (options?: { simulate?: boolean }) => {
    if (options?.simulate) {
      advanceSimulationProfile();
      return;
    }
    if (filteredProfiles.length === 0) return;
    if (dailyDrop) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex((prev) => (prev + 1) % filteredProfiles.length);
  };

  const handleSkipAction = () => {
    if (!current) return;
    if (likedIds.has(current.id)) {
      clearLike(current.id);
    }
    void createDislike({
      fromUserId: user.id,
      toUserId: current.id,
      fromNickname: user.nickname,
      toNickname: current.nickname,
    });
    if (dailyDrop) {
      void markDailyDropAction(user.id, current.id);
      setDailyDrop((prev) => {
        if (!prev) return prev;
        if (prev.actionedIds.includes(current.id)) return prev;
        return {
          ...prev,
          actionedIds: [...prev.actionedIds, current.id],
        };
      });
    }
    setDislikedIds((prev) => {
      const next = new Set(prev);
      next.add(current.id);
      return next;
    });
    const updated = recordSkipSignal(current);
    startAiTransition(() => setAiSignals(updated));
    handleNextProfile();
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleSkipAction();
  };

  const handleLikeAction = () => {
    if (!current) return;
    if (likedIds.has(current.id)) {
      handleNextProfile();
      return;
    }
    const isMatch = likedMeIds.has(current.id);
    if (dislikedIds.has(current.id)) {
      clearDislike(current.id);
    }
    {
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
      if (dailyDrop) {
        void markDailyDropAction(user.id, current.id);
        setDailyDrop((prev) => {
          if (!prev) return prev;
          if (prev.actionedIds.includes(current.id)) return prev;
          return {
            ...prev,
            actionedIds: [...prev.actionedIds, current.id],
          };
        });
      }
      const updated = recordLikeSignal(current);
      startAiTransition(() => setAiSignals(updated));
      setLikedIds((prev) => {
        const next = new Set(prev);
        next.add(current.id);
        return next;
      });
      setDislikedIds((prev) => {
        if (!prev.has(current.id)) return prev;
        const next = new Set(prev);
        next.delete(current.id);
        return next;
      });
    }

    if (isMatch) {
      setMatchProfile(current);
      setMatchSuggestions(getKenyanMatchSuggestions({ user, match: current }));
      setShowMatchModal(true);
      void createNotification({
        toUserId: current.id,
        fromUserId: user.id,
        fromNickname: user.nickname,
        type: "system",
        body: `${user.nickname} liked you back. It's a match!`,
      });

      const brandColors = ["#ec4899", "#a855f7", "#ffffff"];
      requestAnimationFrame(() => {
        confetti({
          particleCount: 140,
          spread: 90,
          origin: { y: 0.7 },
          colors: brandColors,
          disableForReducedMotion: true,
          zIndex: 9999,
          gravity: 1.1,
          scalar: 1.1,
          ticks: 280,
        });
      });
      return;
    }

    handleNextProfile();
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleLikeAction();
  };

  const handleQuickChat = () => {
    if (current) {
      void handleStartChat(current);
    }
  };

  const handleChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleQuickChat();
  };

  const handleAction = (dir: "left" | "right") => {
    if (isSimulation) {
      handleNextProfile({ simulate: true });
      return;
    }
    if (outOfSwipes) return;
    if (dir === "left") {
      handleSkipAction();
    } else {
      handleLikeAction();
    }
  };

  const handleStarAction = () => {
    if (outOfSwipes && !isSimulation) return;
    setBurstKey((prev) => prev + 1);
    setShowStarBurst(true);
    window.setTimeout(() => {
      handleNextProfile({ simulate: true });
    }, 400);
    window.setTimeout(() => {
      setShowStarBurst(false);
    }, 2500);
    if (!isSimulation) {
      handleQuickChat();
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
                updateView("discover");
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
        @keyframes cardSwipeIn {
          0% { opacity: 0; transform: translateY(10px) scale(0.995); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes brandSwap {
          0% { opacity: 0; transform: translateY(18%) scale(0.98); }
          6% { opacity: 1; transform: translateY(0) scale(1); }
          44% { opacity: 1; transform: translateY(0) scale(1); }
          50% { opacity: 0; transform: translateY(-18%) scale(1.02); }
          100% { opacity: 0; transform: translateY(-18%) scale(1.02); }
        }
        @keyframes dropPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.04); opacity: 1; }
        }
        @keyframes dropSweep {
          0% { transform: translateX(-30%); opacity: 0; }
          50% { opacity: 0.7; }
          100% { transform: translateX(30%); opacity: 0; }
        }
        @keyframes dropFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes hubGlow {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        @keyframes hubFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes hubShimmer {
          0% { transform: translateX(-30%); opacity: 0; }
          50% { opacity: 0.7; }
          100% { transform: translateX(30%); opacity: 0; }
        }
        @keyframes hubMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .card-swipe-in {
          animation: cardSwipeIn 220ms ease-out;
        }
        .drop-pulse {
          animation: dropPulse 2.4s ease-in-out infinite;
        }
        .drop-float {
          animation: dropFloat 3.2s ease-in-out infinite;
        }
        .drop-sweep {
          animation: dropSweep 3.6s ease-in-out infinite;
        }
        .hub-glow {
          animation: hubGlow 4s ease-in-out infinite;
        }
        .hub-float {
          animation: hubFloat 3.2s ease-in-out infinite;
        }
        .hub-shimmer {
          animation: hubShimmer 5s ease-in-out infinite;
        }
        .hub-marquee {
          animation: hubMarquee 18s linear infinite;
        }
        .brand-cycler {
          position: relative;
          display: inline-block;
          min-width: 14ch;
          height: 1em;
        }
        .brand-cycler__word {
          position: absolute;
          left: 0;
          top: 0;
          white-space: nowrap;
          opacity: 0;
          transform: translateY(18%);
          animation: brandSwap 8s ease-in-out infinite;
        }
        .brand-cycler__word--primary {
          animation-delay: 0s;
        }
        .brand-cycler__word--secondary {
          animation-delay: 4s;
        }
        @media (prefers-reduced-motion: reduce) {
          .card-swipe-in,
          .hub-glow,
          .hub-float,
          .hub-shimmer,
          .hub-marquee { animation: none; }
          .brand-cycler__word {
            position: static;
            opacity: 1;
            transform: none;
            animation: none;
          }
          .brand-cycler__word--secondary { display: none; }
        }
      `}</style>
      {/* Dynamic Background */}
      <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-pink-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      {showDailyDropIntro && dailyDrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 left-10 h-72 w-72 rounded-full bg-pink-500/20 blur-[140px] drop-pulse"></div>
            <div className="absolute top-1/2 right-[-10%] h-96 w-96 rounded-full bg-purple-500/20 blur-[160px] drop-pulse"></div>
            <div className="absolute bottom-[-20%] left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-[160px] drop-pulse"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(236,72,153,0.25),_transparent_60%)] drop-sweep"></div>
          </div>
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0b0b0b]/95 p-8 text-center shadow-2xl">
            <button
              onClick={handleCloseDailyDropIntro}
              className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-gray-300 hover:bg-white/10"
            >
              ✕
            </button>

            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5 drop-pulse">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10 text-kipepeo-pink drop-float"
              >
                <path d="M3 17l2-8 5 5 2-6 2 6 5-5 2 8" />
                <path d="M3 17h18" />
                <circle cx="5" cy="7" r="1.5" />
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="19" cy="7" r="1.5" />
              </svg>
            </div>

            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-kipepeo-pink to-purple-400">
              Today&apos;s Matches
            </h2>
            <p className="mt-3 text-sm text-gray-400">
              A fresh drop just landed. {dropTotal} new profiles curated for
              you.
            </p>

            {dropProfiles.length > 0 && (
              <div className="mt-6 grid grid-cols-4 gap-3 sm:grid-cols-6">
                {dropProfiles.slice(0, 12).map((profile) => (
                  <div
                    key={`drop-preview-${profile.id}`}
                    className="aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                  >
                    <AppImage
                      src={profile.photoUrl}
                      alt={profile.nickname}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={handleCloseDailyDropIntro}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-kipepeo-pink text-white text-xs font-black uppercase tracking-widest shadow-[0_0_24px_rgba(236,72,153,0.5)] active:scale-95 transition-transform"
              >
                Start Exploring
              </button>
              <button
                onClick={handleCloseDailyDropIntro}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-white/5 text-gray-300 text-xs font-black uppercase tracking-widest border border-white/10 active:scale-95 transition-transform"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

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
      {view !== "live" && view !== "hub" && (
        <header
          className={
            view === "discover"
              ? "z-20 shrink-0 w-full"
              : "px-5 pt-5 pb-2 z-20 shrink-0 max-w-2xl mx-auto w-full"
          }
        >
          {view === "discover" ? (
            <div className="pb-2 pt-4 px-6 flex justify-between items-center z-40 bg-slate-950/50 backdrop-blur-md pb-4 animate-in fade-in slide-in-from-top duration-300">
              <div className="flex items-center">
                <div className="w-2.5 h-8 bg-gradient-to-b from-[#f43f5e] to-[#7c3aed] rounded-full mr-3 shadow-[0_0_15px_rgba(244,63,94,0.4)]"></div>
                <div className="overflow-hidden h-fit">
                  <h1
                    key={headerToggle ? "brand" : "tagline"}
                    className="text-2xl font-black text-white tracking-tighter leading-8 animate-text-swap uppercase"
                  >
                    {headerToggle ? "HUSHLY" : "Tribe Vibes"}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsFilterModalOpen(true)}
                  className="w-10 h-10 bg-slate-900 border border-white/5 rounded-full flex items-center justify-center text-slate-300 shadow-lg active:scale-90 transition-all"
                  title="Discovery Settings"
                >
                  <i className="fa-solid fa-sliders"></i>
                </button>
                <button
                  onClick={() => updateView("portal")}
                  className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-500 shadow-lg active:scale-90 transition-all"
                  title="Companion Portal"
                >
                  <i className="fa-solid fa-gem"></i>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-1">
                <div className="w-2 h-8 bg-gradient-to-b from-pink-500 to-purple-600 rounded-full"></div>
                <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-white bg-gradient-to-r from-white to-gray-400">
                  <a href="#" className="brand-cycler">
                    <span className="brand-cycler__word brand-cycler__word--primary">
                      Hushly
                    </span>
                    <span className="brand-cycler__word brand-cycler__word--secondary">
                      Proudly Kenyan
                    </span>
                  </a>
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to="/chats"
                  className="w-10 h-10 flex items-center justify-center text-lg active:scale-90 transition-transform relative"
                >
                  {unreadConversationCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-5 px-1.5 rounded-full bg-kipepeo-pink text-[10px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(236,72,153,0.6)]">
                      {unreadConversationCount > 9
                        ? "9+"
                        : unreadConversationCount}
                    </span>
                  )}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="#fff"
                    stroke="#ec4899"
                    className="feather feather-send"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </Link>

                <button
                  onClick={() => updateView("portal")}
                  className="hidden w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-colors active:scale-95"
                >
                  <span className="text-lg filter drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="24px"
                      width="24px"
                      fill="#fff"
                      stroke="#ec4899"
                      version="1.1"
                      id="_x32_"
                      viewBox="0 0 512 512"
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
          )}

          {view !== "discover" && (
            <div className="relative p-1 bg-white/5 rounded-xl flex items-center mb-4">
              <div
                className="absolute top-1 bottom-1 rounded-lg bg-white/10 shadow-sm transition-all duration-300 ease-out"
                style={{
                  width: "calc(25% - 8px)",
                  transform: `translateX(calc(${tabIndex * 100}% + ${tabIndex * 4}px))`,
                }}
              />
              <button
                onClick={() => updateView("discover")}
                className={`flex-1 relative z-10 py-2.5 text-xs font-bold uppercase tracking-widest text-center transition-colors ${view === "discover" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
              >
                Discovery
              </button>
              <button
                onClick={() => updateView("live")}
                className={`flex-1 relative z-10 py-2.5 text-xs font-bold uppercase tracking-widest text-center transition-colors ${view === "live" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
              >
                Live
              </button>
              <button
                onClick={() => updateView("hub")}
                className={`flex-1 relative z-10 py-2.5 text-xs font-bold uppercase tracking-widest text-center transition-colors ${view === "hub" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
              >
                Hub
              </button>
              <button
                onClick={() => updateView("plans")}
                className={`flex-1 relative z-10 py-2.5 text-xs font-bold uppercase tracking-widest text-center transition-colors ${view === "plans" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
              >
                Weekend
              </button>
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
      )}

      {isFilterModalOpen && (
        <FilterModal
          filters={filters}
          onApply={(next) => {
            setFilters(next);
            setIsFilterModalOpen(false);
            setFiltersDirty(true);
            if (typeof window !== "undefined") {
              window.localStorage.setItem(filtersDirtyKey, "1");
            }
          }}
          onClose={() => setIsFilterModalOpen(false)}
        />
      )}

      {showMatchModal && matchProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141414] p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 h-20 w-20 overflow-hidden rounded-full border border-white/10">
              <AppImage
                src={matchProfile.photoUrl ?? user.photoUrl}
                alt={matchProfile.nickname}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex items-center justify-center gap-3 text-2xl">
              <span className="text-white font-black tracking-tight">
                It's a match!
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              You and {matchProfile.nickname} liked each other.
            </p>

            <div className="mt-5 space-y-3 text-left">
              {matchSuggestions.map((suggestion) => (
                <div
                  key={suggestion.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-widest text-white">
                      {suggestion.title}
                    </p>
                    <span className="text-[9px] uppercase tracking-widest text-kipepeo-pink">
                      {suggestion.tag}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-300">
                    {suggestion.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setShowMatchModal(false);
                  setMatchProfile(null);
                  handleNextProfile();
                }}
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-300 hover:bg-white/5"
              >
                Keep Swiping
              </button>
              <button
                onClick={() => {
                  setShowMatchModal(false);
                  setMatchProfile(null);
                  void handleStartChat(matchProfile);
                }}
                className="rounded-full bg-gradient-to-r from-kipepeo-pink to-purple-600 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-lg"
              >
                Start Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {hubSplash && (
        <div className="fixed inset-0 z-[210] flex flex-col items-center justify-center bg-black/90 px-6 text-center">
          <LottiePlayer
            path="/assets/json/loading.json"
            className="w-40 h-40"
          />
          <p className="mt-4 text-xs uppercase tracking-[0.35em] text-amber-200">
            {hubSplash.title}
          </p>
          <p className="mt-2 text-sm text-slate-300">{hubSplash.subtitle}</p>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 relative flex flex-col z-10 w-full ${
          view === "discover" || view === "live" || view === "hub"
            ? "overflow-y-auto no-scrollbar"
            : "px-2 pb-4 overflow-hidden max-w-[48rem] mx-auto"
        }`}
      >
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
          shouldShowEmptyState ? (
            <div className="h-full relative flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
              <div className="relative z-10 w-fit h-fit flex items-center justify-center mb-2 overflow-visible">
                <dotlottie-wc
                  src="https://lottie.host/ef4d935d-c6d1-472a-9a29-ad403e4ed20b/439t582a3D.lottie"
                  style={{ width: "100px", height: "100px" }}
                  autoplay
                  loop
                ></dotlottie-wc>
              </div>

              <h2 className="relative z-10 text-3xl font-black text-white mb-2 tracking-tighter">
                {emptyStateTitle}
              </h2>
              <p className="relative z-10 text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed font-medium">
                {emptyStateBody}
              </p>

              {outOfSwipes && !isSimulation && (
                <div className="relative z-10 bg-slate-900/40 backdrop-blur-md px-8 py-6 rounded-3xl border border-white/5 shadow-2xl mb-10 w-full max-w-xs mx-auto">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">
                    Refueling Safari
                  </p>
                  <p className="text-4xl font-black text-rose-500 font-mono tracking-tighter">
                    {countdown || "24:00:00"}
                  </p>
                </div>
              )}

              <div className="relative z-10 w-full max-w-xs space-y-4">
                <button
                  onClick={() => setIsSimulation(true)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl border border-white/5 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
                >
                  <i className="fa-solid fa-wand-magic-sparkles text-indigo-400"></i>
                  Ghost Mode
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 flex flex-col h-full animate-in fade-in zoom-in duration-300 relative">
              {showStarBurst && (
                <div
                  key={burstKey}
                  className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center overflow-hidden"
                >
                  {[...Array(60)].map((_, i) => {
                    const isStar = i % 2 === 0;
                    const angle = Math.random() * 360;
                    const distance = 80 + Math.random() * 300;
                    const tx = Math.cos((angle * Math.PI) / 180) * distance;
                    const ty = Math.sin((angle * Math.PI) / 180) * distance;
                    const size = 12 + Math.random() * 14;
                    const delay = Math.random() * 0.2;
                    const duration = 1.2 + Math.random() * 0.8;
                    const rotation = Math.random() * 360;

                    return (
                      <div
                        key={i}
                        className={`absolute ${
                          isStar ? "text-amber-400" : "text-rose-500"
                        } animate-confetti-fly opacity-0`}
                        style={
                          {
                            "--tx": `${tx}px`,
                            "--ty": `${ty}px`,
                            "--rot": `${rotation}deg`,
                            "--dur": `${duration}s`,
                            fontSize: `${size}px`,
                            animationDelay: `${delay}s`,
                            willChange: "transform, opacity",
                          } as React.CSSProperties
                        }
                      >
                        <i
                          className={`fa-solid ${
                            isStar ? "fa-star" : "fa-heart"
                          }`}
                        ></i>
                      </div>
                    );
                  })}
                </div>
              )}

              {current && (
                <div
                  className="relative h-[480px] md:h-[420px] group z-10"
                  onClick={() => navigate(`/users/${current.id}`)}
                >
                  <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl bg-slate-900 border border-white/5">
                    <AppImage
                      src={current.photoUrl}
                      alt={current.nickname}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      fetchPriority="high"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                    {isSimulation && (
                      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-indigo-500/20 backdrop-blur-md px-6 py-2 rounded-full border border-indigo-500/50 flex items-center gap-2">
                        <i className="fa-solid fa-wand-sparkles text-indigo-400 text-xs"></i>
                        <span className="text-[10px] text-white font-black uppercase tracking-widest whitespace-nowrap">
                          No one will know about your activity
                        </span>
                      </div>
                    )}

                    {isSimulation ? (
                      <button
                        onClick={() => setIsSimulation(false)}
                        className="bg-slate-800 px-4 py-1.5 rounded-full border border-slate-700 text-[10px] font-black uppercase text-white tracking-widest active:scale-95 transition-all"
                      >
                        Return to Base
                      </button>
                    ) : (
                      <div
                        className="bg-slate-900 px-3 py-1 rounded-full z-10 absolute top-4 right-4 flex items-center gap-1 border border-rose-800 border-[5px]
"
                      >
                        <span className="text-xs font-bold text-white">
                          {dropCountValue}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1 uppercase">
                          Drop Left
                        </span>
                      </div>
                    )}

                    <div className="absolute bottom-6 left-6 right-6">
                      <div className="flex items-center gap-2 mb-1 cursor-pointer">
                        <h3 className="text-3xl font-bold text-white tracking-tighter">
                          {current.nickname}
                          {currentAge ? `, ${currentAge}` : ""}
                        </h3>
                        <i className="fa-solid fa-circle-check text-sky-400"></i>
                      </div>
                      <p className="text-slate-300 text-sm mb-2">
                        <i className="fa-solid fa-location-dot mr-1 text-rose-500"></i>{" "}
                        {current.area}
                        {distanceLabel ? ` • ${distanceLabel}` : ""}
                      </p>
                      <p className="text-white/90 text-sm line-clamp-2 font-medium italic">
                        "{current.bio ?? ""}"
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-6 mt-6 mb-8 relative z-20">
                <button
                  onClick={() => handleAction("left")}
                  className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-rose-500 text-2xl shadow-xl transition-all active:scale-75 hover:bg-slate-800"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
                <button
                  onClick={handleStarAction}
                  className="w-14 h-14 bg-slate-900 border border-amber-500/50 rounded-full flex items-center justify-center text-amber-400 text-xl shadow-lg transition-all active:scale-75 hover:bg-amber-400 hover:text-white"
                >
                  <i className="fa-solid fa-star"></i>
                </button>
                <button
                  onClick={() => handleAction("right")}
                  className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-emerald-500 text-2xl shadow-xl transition-all active:scale-75 hover:bg-slate-800"
                >
                  <i className="fa-solid fa-heart"></i>
                </button>
              </div>

              <style>{`
                  @keyframes confetti-fly {
                    0% { transform: translate(0, 0) scale(0) rotate(0deg); opacity: 0; }
                    10% { opacity: 1; transform: scale(1); }
                    100% { transform: translate(var(--tx), var(--ty)) scale(1.5) rotate(var(--rot)); opacity: 0; }
                  }
                  .animate-confetti-fly {
                    animation: confetti-fly var(--dur) cubic-bezier(0.1, 0.5, 0.2, 1) forwards;
                  }
                `}</style>
            </div>
          )
        ) : view === "live" ? (
          <LiveSection
            user={liveUser}
            profile={user}
            onUpgrade={handleUpgradePlans}
            onExit={handleExitToDiscover}
          />
        ) : view === "hub" ? (
          <GameHub
            user={liveUser}
            onExit={handleExitToDiscover}
            onUpgrade={handleUpgradePlans}
          />
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

              {premiumChecking && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-gray-300">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-kipepeo-pink border-t-transparent"></div>
                    Confirming premium status...
                  </div>
                </div>
              )}
              {premiumCheckError && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-200">
                  {premiumCheckError}
                </div>
              )}

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
                              {Math.round(parsedMpesa.confidence * 100)}%
                              confidence
                            </span>
                          </div>
                          <div className="mt-2 grid gap-2 text-xs text-gray-300">
                            <div className="flex items-center justify-between">
                              <span>Amount</span>
                              <span className="text-white">
                                {parsedMpesa.amount
                                  ? `KES ${parsedMpesa.amount}`
                                  : "-"}
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
                                {parsedMpesa.date ?? "-"}{" "}
                                {parsedMpesa.time ?? ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      {paymentError && (
                        <p className="text-xs text-red-400">{paymentError}</p>
                      )}
                      {paymentInvalidAttempts >= 2 && (
                        <a
                          href="tel:+254762634893"
                          className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-200 hover:bg-white/10"
                        >
                          Call Support +254762634893
                        </a>
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
                        onClick={() => {
                          if (premiumChecking) {
                            setPaymentError("Confirming premium status...");
                            return;
                          }
                          setPaymentProof("");
                          setPaymentError(null);
                          setPaymentInvalidAttempts(0);
                          setShowPaymentProof(true);
                        }}
                        disabled={premiumChecking}
                        className="mt-3 px-4 py-2 rounded-full bg-red-500/20 text-red-200 text-xs font-black uppercase tracking-widest border border-red-500/30 active:scale-95 transition-transform disabled:opacity-60"
                      >
                        Try Again
                      </button>
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
                        onClick={() => {
                          if (premiumChecking) {
                            setPaymentError("Confirming premium status...");
                            return;
                          }
                          setShowPaymentProof(true);
                        }}
                        disabled={premiumChecking}
                        className="w-full py-3 rounded-full bg-kipepeo-pink text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-60"
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
