import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti"; // Import the confetti library
import { AppNotification, UserProfile, IntentType } from "../types";
import { getAllUsers, getAllUserSettings } from "../services/userService";
import AppImage from "../components/AppImage";
import { ensureConversation } from "../services/chatService";
import {
  listenToNotifications,
  markNotificationsRead,
} from "../services/notificationService";

const DiscoverPage: React.FC<{ user: UserProfile }> = ({ user }) => {
  const navigate = useNavigate();
  const [selectedIntents, setSelectedIntents] = useState<IntentType[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [view, setView] = useState<"discover" | "plans" | "portal">("discover");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

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

  const toggleIntentFilter = (intent: IntentType) => {
    setSelectedIntents((prev) =>
      prev.includes(intent)
        ? prev.filter((i) => i !== intent)
        : [...prev, intent],
    );
  };

  const filteredProfiles = useMemo(() => {
    const matchesFilter =
      selectedIntents.length === 0
        ? profiles
        : profiles.filter((profile) =>
            profile.intents?.some((intent) => selectedIntents.includes(intent)),
          );

    const sharedIntent = (profile: UserProfile) =>
      profile.intents?.some((intent) => user.intents.includes(intent));

    const priority = matchesFilter.filter(sharedIntent);
    const secondary = matchesFilter.filter((profile) => !sharedIntent(profile));
    return [...priority, ...secondary];
  }, [profiles, selectedIntents, user.intents]);

  useEffect(() => {
    if (currentIndex >= filteredProfiles.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, filteredProfiles.length]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedIntents]);

  const current = filteredProfiles[currentIndex];
  const unreadNotifications = notifications.filter((n) => !n.read);

  const handleStartChat = async (target: UserProfile) => {
    try {
      const conversationId = await ensureConversation(user, target);
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
    if (notification.conversationId) {
      navigate(`/chats/${notification.conversationId}`);
    }
    setShowNotifications(false);
  };

  // --- ACTIONS ---
  const handleNextProfile = () => {
    if (filteredProfiles.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % filteredProfiles.length);
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Logic to record skip would go here
    handleNextProfile();
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();

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
            Escort Portal
          </h1>

          <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-4 mb-8 backdrop-blur-sm">
            <p className="text-red-200/80 text-sm text-center leading-relaxed font-medium">
              <span className="block mb-2 text-xs uppercase tracking-widest text-red-500 font-bold">
                Confidential Zone
              </span>
              Strict anonymity enforced. High-security, paid-introductions only.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <button className="w-full py-4 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] uppercase tracking-widest text-xs transition-all active:scale-95">
              Verify Identity & Enter
            </button>
            <button
              onClick={() => setView("discover")}
              className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white font-semibold rounded-xl uppercase tracking-widest text-xs transition-all"
            >
              Exit to Safety
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN APP VIEW ---
  return (
    <div className="h-screen w-full bg-slate-950 text-white font-sans flex flex-col overflow-hidden relative selection:bg-pink-500 selection:text-white">
      {/* Dynamic Background */}
      <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-pink-900/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <header className="px-5 pt-5 pb-2 z-20 shrink-0">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-1">
            <div className="w-2 h-8 bg-gradient-to-b from-pink-500 to-purple-600 rounded-full"></div>
            <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              <a href="#">Hushly</a>
            </h1>
          </div>

          <div className="flex items-center gap-3">
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
              to="/chats"
              className="w-10 h-10 flex items-center justify-center text-lg active:scale-90 transition-transform"
            >
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
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mask-fade-right">
            {Object.values(IntentType).map((intent) => {
              const isActive = selectedIntents.includes(intent);
              return (
                <button
                  key={intent}
                  onClick={() => toggleIntentFilter(intent)}
                  className={`
                    px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border transition-all duration-300
                    ${
                      isActive
                        ? "bg-gradient-to-r from-pink-600 to-purple-600 border-transparent text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]"
                        : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10"
                    }
                  `}
                >
                  {intent}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 px-4 pb-4 overflow-hidden relative flex flex-col z-10">
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
                    className={`w-full text-left p-3 rounded-xl border ${
                      notification.read
                        ? "border-white/5 text-gray-400"
                        : "border-kipepeo-pink/40 text-white"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-kipepeo-pink">
                      {notification.type === "system"
                        ? "System"
                        : (notification.fromNickname ?? "New Message")}
                    </p>
                    <p className="text-base text-gray-300 mt-1 line-clamp-2">
                      {notification.body}
                    </p>
                  </button>
                ))}
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

                      <div className="relative mb-6">
                        <p className="text-sm text-gray-300/90 leading-relaxed font-medium line-clamp-3">
                          "{current.bio}"
                        </p>
                      </div>

                      {/* Action Bar (Updated) */}
                      <div className="grid grid-cols-4 gap-4 mt-auto pt-2 items-center">
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
          <div className="flex-1 flex flex-col items-center justify-center bg-white/5 rounded-3xl border border-white/5 animate-in fade-in slide-in-from-bottom-4">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 rotate-3">
              <span className="text-3xl">🥂</span>
            </div>
            <p className="text-gray-400 font-medium">No plans scheduled yet.</p>
            <p className="text-gray-600 text-xs mt-2 uppercase tracking-wide">
              Check back Friday
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoverPage;
