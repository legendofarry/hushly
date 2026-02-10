import React, { useEffect, useState } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { UserProfile } from "./types";
import { auth } from "./firebase";
import HushlyShell from "./components/HushlyShell";
import SplashScreen from "./hushly/components/SplashScreen";
import LandingPage from "./pages/LandingPage";
import OnboardingPage from "./pages/OnboardingPage";
import DiscoverPage from "./pages/DiscoverPage";
import ChatListPage from "./pages/ChatListPage";
import ChatDetailPage from "./pages/ChatDetailPage";
import ProfilePage from "./pages/ProfilePage";
import SecurityPrivacyPage from "./pages/SecurityPrivacyPage";
import PersonalInfoPage from "./pages/PersonalInfoPage";
import LikesAnalyticsPage from "./pages/LikesAnalyticsPage";
import UserProfileViewPage from "./pages/UserProfileViewPage";
import ManagePaymentsPage from "./pages/ManagePaymentsPage";
import EscortHomePage from "./pages/EscortHomePage";
import { clearSession, setSession } from "./services/authService";
import {
  getUserProfile,
  ensurePublicNickname,
  listenToUserProfile,
  updateUserEmailVerification,
  updateUserProfile,
} from "./services/userService";
import { OWNER_EMAIL } from "./services/paymentService";

const normalizeEmail = (value?: string | null) =>
  (value ?? "").trim().toLowerCase();

const AppRoutes: React.FC<{
  user: UserProfile | null;
  isVerified: boolean;
  setUser: (u: UserProfile | null) => void;
  setIsVerified: (v: boolean) => void;
}> = ({ user, isVerified, setUser, setIsVerified }) => {
  const navigate = useNavigate();

  const handleOnboardingComplete = (u: UserProfile) => {
    setUser(u);
    setIsVerified(true);
    localStorage.setItem("kipepeo_user", JSON.stringify(u));
    navigate("/discover");
  };

  const handleLoginComplete = (u: UserProfile) => {
    setUser(u);
    setIsVerified(true);
    localStorage.setItem("kipepeo_user", JSON.stringify(u));
    navigate("/discover");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("kipepeo_user");
    clearSession().catch((error) => console.error(error));
    navigate("/");
  };

  const handleUserUpdated = (u: UserProfile) => {
    setUser(u);
    localStorage.setItem("kipepeo_user", JSON.stringify(u));
  };

  const isPremiumUser = (u: UserProfile | null) => {
    if (!u) return false;
    const isOwner =
      normalizeEmail(u.email) === normalizeEmail(OWNER_EMAIL);
    const activePremium =
      Boolean(u.isPremium) &&
      (!u.premiumExpiresAt || u.premiumExpiresAt > Date.now());
    return isOwner || activePremium;
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          user && isVerified ? (
            <Navigate to="/discover" />
          ) : (
            <LandingPage onLogin={handleLoginComplete} />
          )
        }
      />
      <Route
        path="/home"
        element={
          user && isVerified ? (
            <Navigate to="/discover" replace />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/onboarding"
        element={<OnboardingPage onComplete={handleOnboardingComplete} />}
      />
      <Route
        path="/discover"
        element={
          user && isVerified ? <DiscoverPage user={user} /> : <Navigate to="/" />
        }
      />
      <Route
        path="/chats"
        element={
          user && isVerified ? <ChatListPage user={user} /> : <Navigate to="/" />
        }
      />
      <Route
        path="/chats/:id"
        element={
          user && isVerified ? (
            <ChatDetailPage user={user} />
          ) : (
            <Navigate to="/" />
          )
        }
      />
      <Route
        path="/profile"
        element={
          user && isVerified ? (
            <ProfilePage user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" />
          )
        }
      />
      <Route
        path="/likes"
        element={
          user && isVerified ? (
            <LikesAnalyticsPage user={user} />
          ) : (
            <Navigate to="/" />
          )
        }
      />
      <Route
        path="/users/:id"
        element={
          user && isVerified ? (
            <UserProfileViewPage viewer={user} />
          ) : (
            <Navigate to="/" />
          )
        }
      />
      <Route
        path="/admin/payments"
        element={
          user && isVerified ? (
            <ManagePaymentsPage user={user} />
          ) : (
            <Navigate to="/" />
          )
        }
      />
      <Route
        path="/escort"
        element={
          user && isVerified ? (
            <EscortHomePage user={user} />
          ) : (
            <Navigate to="/discover" />
          )
        }
      />
      <Route
        path="/settings/security"
        element={
          user && isVerified ? (
            <SecurityPrivacyPage user={user} onUserUpdated={handleUserUpdated} />
          ) : (
            <Navigate to="/" />
          )
        }
      />
      <Route
        path="/settings/personal"
        element={
          user && isVerified ? (
            <PersonalInfoPage user={user} onUserUpdated={handleUserUpdated} />
          ) : (
            <Navigate to="/" />
          )
        }
      />
    </Routes>
  );
};

const shouldShowNav = (pathname: string) => {
  const path = pathname.toLowerCase();
  if (path === "/") return false;
  if (path.startsWith("/onboarding")) return false;
  if (path.startsWith("/settings")) return false;
  if (path.startsWith("/admin/payments")) return false;
  if (path.startsWith("/users/")) return false;
  return true;
};

const AppShell: React.FC<{
  user: UserProfile | null;
  isVerified: boolean;
  setUser: (u: UserProfile | null) => void;
  setIsVerified: (v: boolean) => void;
  privacyShieldActive: boolean;
  focusShieldActive: boolean;
  showPrivacyNotice: boolean;
  dismissPrivacyNotice: () => void;
}> = ({
  user,
  isVerified,
  setUser,
  setIsVerified,
  privacyShieldActive,
  focusShieldActive,
  showPrivacyNotice,
  dismissPrivacyNotice,
}) => {
  const location = useLocation();
  const showNav = Boolean(user && isVerified) && shouldShowNav(location.pathname);

  return (
    <HushlyShell showNav={showNav}>
      {privacyShieldActive && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl">
          <div className="rounded-2xl border border-white/10 bg-black/60 px-6 py-4 text-center text-xs uppercase tracking-[0.3em] text-white">
            {focusShieldActive
              ? "Privacy Shield Active"
              : "Screenshots Are Blocked"}
          </div>
        </div>
      )}

      {showPrivacyNotice && user && (
        <div className="fixed bottom-6 left-1/2 z-40 w-[90%] max-w-md -translate-x-1/2 rounded-3xl border border-white/10 bg-black/70 p-4 text-xs text-gray-200 shadow-xl">
          <p className="font-semibold uppercase tracking-widest text-white">
            Privacy Notice
          </p>
          <p className="mt-2 text-gray-300">
            Screenshots and screen recordings are prohibited. Sharing private
            content without consent may lead to account restrictions.
          </p>
          <button
            onClick={dismissPrivacyNotice}
            className="mt-3 rounded-full bg-rose-500 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white"
          >
            I Understand
          </button>
        </div>
      )}

      <div
        className={`min-h-screen transition-all ${
          privacyShieldActive ? "blur-2xl pointer-events-none" : ""
        }`}
      >
        <AppRoutes
          user={user}
          isVerified={isVerified}
          setUser={setUser}
          setIsVerified={setIsVerified}
        />
      </div>
    </HushlyShell>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [focusShieldActive, setFocusShieldActive] = useState(false);
  const [screenshotShieldActive, setScreenshotShieldActive] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!active) return;

      if (!authUser) {
        setUser(null);
        setIsVerified(false);
        localStorage.removeItem("kipepeo_user");
        sessionStorage.removeItem("kipepeo_session");
        setLoading(false);
        return;
      }

      if (!authUser.emailVerified) {
        setUser(null);
        setIsVerified(false);
        localStorage.removeItem("kipepeo_user");
        sessionStorage.removeItem("kipepeo_session");
        setLoading(false);
        return;
      }

      setIsVerified(true);
      try {
        const token = await authUser.getIdToken();
        setSession(authUser.uid, token);
        const savedUser = localStorage.getItem("kipepeo_user");
        if (savedUser) {
          const parsed = JSON.parse(savedUser) as UserProfile;
          if (
            parsed?.id === authUser.uid &&
            parsed.email &&
            parsed.emailVerified
          ) {
            setUser(parsed);
            setLoading(false);
            return;
          }
        }
        const profile = await getUserProfile(authUser.uid);
        if (profile) {
          if (!profile.emailVerified || !profile.email) {
            await updateUserEmailVerification(
              authUser.uid,
              true,
              normalizeEmail(authUser.email ?? profile.email),
            );
            profile.emailVerified = true;
            const normalized = normalizeEmail(authUser.email ?? profile.email);
            if (normalized) {
              profile.email = normalized;
            }
          }
          if (
            normalizeEmail(authUser.email) ===
            normalizeEmail(OWNER_EMAIL)
          ) {
            if (!profile.isPremium || profile.premiumExpiresAt) {
              await updateUserProfile(authUser.uid, {
                isPremium: true,
                premiumExpiresAt: null,
              });
            }
            profile.isPremium = true;
            profile.premiumExpiresAt = null;
          }
          try {
            await ensurePublicNickname(profile);
          } catch (error) {
            console.error(error);
          }
          setUser(profile);
          localStorage.setItem("kipepeo_user", JSON.stringify(profile));
        } else {
          await clearSession();
          setUser(null);
          setIsVerified(false);
        }
      } catch (error) {
        console.error(error);
        setUser(null);
        setIsVerified(false);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = listenToUserProfile(user.id, (profile) => {
      if (!profile) return;
      setUser(profile);
      localStorage.setItem("kipepeo_user", JSON.stringify(profile));
    });
    return () => unsubscribe();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setShowPrivacyNotice(false);
      return;
    }
    const key = `privacy_notice_${user.id}`;
    if (!sessionStorage.getItem(key)) {
      setShowPrivacyNotice(true);
    }
  }, [user?.id]);

  useEffect(() => {
    let screenshotTimer: number | null = null;
    const triggerScreenshotShield = () => {
      setScreenshotShieldActive(true);
      if (screenshotTimer) {
        window.clearTimeout(screenshotTimer);
      }
      screenshotTimer = window.setTimeout(() => {
        setScreenshotShieldActive(false);
      }, 1500);
    };
    const setFocusShield = (active: boolean) => {
      setFocusShieldActive(active);
    };
    const handleVisibility = () => {
      setFocusShield(document.hidden);
    };
    const handleBlur = () => setFocusShield(true);
    const handleFocus = () => setFocusShield(false);
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      const tag = target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea") return true;
      return Boolean(
        target.closest('input, textarea, [contenteditable="true"]'),
      );
    };
    const handleContextMenu = (event: Event) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };
    const handleCopy = (event: Event) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };
    const handleCut = (event: Event) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };
    const handlePaste = (event: Event) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.key === "PrintScreen") {
        triggerScreenshotShield();
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        ["c", "x", "v", "s", "p"].includes(key)
      ) {
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("cut", handleCut, true);
    document.addEventListener("paste", handlePaste, true);
    document.addEventListener("keydown", handleKeyDown, true);

    const maybeAndroid = (window as any)?.HushlyAndroid?.setSecureFlag;
    if (typeof maybeAndroid === "function") {
      try {
        maybeAndroid(true);
      } catch (error) {
        console.warn("Unable to enable Android secure flag.", error);
      }
    }
    const maybeIOS = (window as any)?.webkit?.messageHandlers?.privacyShield;
    if (maybeIOS?.postMessage) {
      try {
        maybeIOS.postMessage({ action: "enableScreenshotDetection" });
      } catch (error) {
        console.warn("Unable to enable iOS screenshot detection.", error);
      }
    }

    (window as any).kipepeoScreenshotDetected = triggerScreenshotShield;

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("cut", handleCut, true);
      document.removeEventListener("paste", handlePaste, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      if (screenshotTimer) {
        window.clearTimeout(screenshotTimer);
      }
      delete (window as any).kipepeoScreenshotDetected;
    };
  }, []);

  const privacyShieldActive = focusShieldActive || screenshotShieldActive;
  const dismissPrivacyNotice = () => {
    if (user?.id) {
      sessionStorage.setItem(`privacy_notice_${user.id}`, "1");
    }
    setShowPrivacyNotice(false);
  };

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <HashRouter>
      <AppShell
        user={user}
        isVerified={isVerified}
        setUser={setUser}
        setIsVerified={setIsVerified}
        privacyShieldActive={privacyShieldActive}
        focusShieldActive={focusShieldActive}
        showPrivacyNotice={showPrivacyNotice}
        dismissPrivacyNotice={dismissPrivacyNotice}
      />
    </HashRouter>
  );
};

export default App;
