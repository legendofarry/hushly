import React, { useEffect, useState } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { UserProfile } from "./types";
import { auth } from "./firebase";
import LandingPage from "./pages/LandingPage";
import OnboardingPage from "./pages/OnboardingPage";
import DiscoverPage from "./pages/DiscoverPage";
import ChatListPage from "./pages/ChatListPage";
import ChatDetailPage from "./pages/ChatDetailPage";
import ProfilePage from "./pages/ProfilePage";
import SecurityPrivacyPage from "./pages/SecurityPrivacyPage";
import PersonalInfoPage from "./pages/PersonalInfoPage";
import LikesAnalyticsPage from "./pages/LikesAnalyticsPage";
import { clearSession, setSession } from "./services/authService";
import {
  getUserProfile,
  updateUserEmailVerification,
} from "./services/userService";

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

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  const normalizeEmail = (value?: string | null) =>
    (value ?? "").trim().toLowerCase();

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

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-kipepeo-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-kipepeo-orange"></div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="min-h-screen font-sans selection:bg-kipepeo-pink selection:text-white bg-kipepeo-dark">
        <AppRoutes
          user={user}
          isVerified={isVerified}
          setUser={setUser}
          setIsVerified={setIsVerified}
        />
      </div>
    </HashRouter>
  );
};

export default App;
