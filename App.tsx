import React, { Suspense, useEffect, useState } from "react";
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
const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const OnboardingPage = React.lazy(() => import("./pages/OnboardingPage"));
const DiscoverPage = React.lazy(() => import("./pages/DiscoverPage"));
const ChatListPage = React.lazy(() => import("./pages/ChatListPage"));
const ChatDetailPage = React.lazy(() => import("./pages/ChatDetailPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
const SecurityPrivacyPage = React.lazy(
  () => import("./pages/SecurityPrivacyPage"),
);
const PersonalInfoPage = React.lazy(() => import("./pages/PersonalInfoPage"));
const LikesAnalyticsPage = React.lazy(
  () => import("./pages/LikesAnalyticsPage"),
);
const UserProfileViewPage = React.lazy(
  () => import("./pages/UserProfileViewPage"),
);
const ManagePaymentsPage = React.lazy(
  () => import("./pages/ManagePaymentsPage"),
);
const EscortHomePage = React.lazy(() => import("./pages/EscortHomePage"));
const LiveRoomPage = React.lazy(() => import("./pages/LiveRoomPage"));
const PaymentScreen = React.lazy(
  () => import("./hushly/components/PaymentScreen"),
);
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
    const isOwner = normalizeEmail(u.email) === normalizeEmail(OWNER_EMAIL);
    const activePremium =
      Boolean(u.isPremium) &&
      (!u.premiumExpiresAt || u.premiumExpiresAt > Date.now());
    return isOwner || activePremium;
  };

  return (
    <Suspense fallback={<SplashScreen />}>
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
            user && isVerified ? (
              <DiscoverPage user={user} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/chats"
          element={
            user && isVerified ? (
              <ChatListPage user={user} />
            ) : (
              <Navigate to="/" />
            )
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
          path="/pricing"
          element={
            user && isVerified ? (
              <PaymentScreen
                onBack={() => navigate(-1)}
                onSuccess={() => navigate("/profile")}
              />
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
          path="/live/:id"
          element={
            user && isVerified ? (
              <LiveRoomPage user={user} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/settings/security"
          element={
            user && isVerified ? (
              <SecurityPrivacyPage
                user={user}
                onUserUpdated={handleUserUpdated}
              />
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
    </Suspense>
  );
};

const shouldShowNav = (pathname: string, search: string) => {
  const path = pathname.toLowerCase();
  if (path === "/") return false;
  if (path.startsWith("/onboarding")) return false;
  if (path.startsWith("/settings")) return false;
  if (path.startsWith("/admin/payments")) return false;
  if (path.startsWith("/users/")) return false;
  if (path.startsWith("/chats")) return false;
  if (path.startsWith("/profile")) return false;
  if (path.startsWith("/pricing")) return false;
  if (path.startsWith("/discover")) {
    const params = new URLSearchParams(search);
    const view = params.get("view");
    if (view === "live" || view === "hub") return false;
  }
  if (path.startsWith("/live")) return false;
  return true;
};

const AppShell: React.FC<{
  user: UserProfile | null;
  isVerified: boolean;
  setUser: (u: UserProfile | null) => void;
  setIsVerified: (v: boolean) => void;
}> = ({ user, isVerified, setUser, setIsVerified }) => {
  const location = useLocation();
  const [navHiddenOverride, setNavHiddenOverride] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ hidden?: boolean }>;
      setNavHiddenOverride(Boolean(custom.detail?.hidden));
    };
    window.addEventListener("hushly:nav-visibility", handler as EventListener);
    return () => {
      window.removeEventListener(
        "hushly:nav-visibility",
        handler as EventListener,
      );
    };
  }, []);

  const showNav =
    Boolean(user && isVerified) &&
    shouldShowNav(location.pathname, location.search) &&
    !navHiddenOverride;

  return (
    <HushlyShell showNav={showNav}>
      <div className="h-[calc(100vh-6rem)] transition-all">
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
          if (normalizeEmail(authUser.email) === normalizeEmail(OWNER_EMAIL)) {
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
      />
    </HashRouter>
  );
};

export default App;
