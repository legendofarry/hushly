import React, { useState, useEffect } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { UserProfile } from "./types";
import LandingPage from "./pages/LandingPage";
import OnboardingPage from "./pages/OnboardingPage";
import DiscoverPage from "./pages/DiscoverPage";
import ChatListPage from "./pages/ChatListPage";
import ChatDetailPage from "./pages/ChatDetailPage";
import ProfilePage from "./pages/ProfilePage";

const AppRoutes: React.FC<{
  user: UserProfile | null;
  setUser: (u: UserProfile | null) => void;
}> = ({ user, setUser }) => {
  const navigate = useNavigate();

  const handleOnboardingComplete = (u: UserProfile) => {
    setUser(u);
    localStorage.setItem("kipepeo_user", JSON.stringify(u));
    navigate("/discover");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("kipepeo_user");
    navigate("/");
  };

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/discover" /> : <LandingPage />}
      />
      <Route
        path="/home"
        element={user ? <Navigate to="/discover" replace /> : <Navigate to="/" replace />}
      />
      <Route
        path="/onboarding"
        element={<OnboardingPage onComplete={handleOnboardingComplete} />}
      />
      <Route
        path="/discover"
        element={user ? <DiscoverPage user={user} /> : <Navigate to="/" />}
      />
      <Route
        path="/chats"
        element={user ? <ChatListPage user={user} /> : <Navigate to="/" />}
      />
      <Route
        path="/chats/:id"
        element={user ? <ChatDetailPage user={user} /> : <Navigate to="/" />}
      />
      <Route
        path="/profile"
        element={
          user ? (
            <ProfilePage user={user} onLogout={handleLogout} />
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

  useEffect(() => {
    // Simulate checking local storage for a "logged in" session
    const savedUser = localStorage.getItem("kipepeo_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
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
        <AppRoutes user={user} setUser={setUser} />
      </div>
    </HashRouter>
  );
};

export default App;
