import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { UserProfile, IntentType } from "../types";
import { getAllUsers, getAllUserSettings } from "../services/userService";
import AppImage from "../components/AppImage";

const DiscoverPage: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [selectedIntents, setSelectedIntents] = useState<IntentType[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [view, setView] = useState<"discover" | "plans" | "portal">("discover");

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

  if (view === "portal") {
    return (
      <div className="h-screen bg-red-950/20 flex flex-col p-8 items-center justify-center text-center font-sans animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center text-4xl mb-6 shadow-[0_0_50px_rgba(220,38,38,0.5)] border border-red-500/50">
          🌹
        </div>
        <h1 className="text-4xl font-black text-red-500 uppercase tracking-tighter mb-2">
          Escort Portal
        </h1>
        <p className="text-gray-400 text-base max-w-xs mb-10 leading-relaxed italic">
          You are entering a high-security, paid-introductions only zone. Strict
          anonymity is enforced here.
        </p>
        <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
          <button className="py-4 bg-red-600 text-white font-black rounded-xl shadow-lg uppercase tracking-widest text-sm">
            Verify & Enter Portal
          </button>
          <button
            onClick={() => setView("discover")}
            className="py-4 glass text-white/50 font-bold rounded-xl uppercase tracking-widest text-sm"
          >
            Exit to Kipepeo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-kipepeo-dark flex flex-col font-sans overflow-hidden">
      <header className="p-6 pb-2 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-gradient uppercase tracking-tighter">
              <a href="#">Hushly</a>
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setView("portal")}
              className="w-10 h-10 bg-red-600/10 border border-red-500/20 rounded-full flex items-center justify-center text-lg shadow-[0_0_15px_rgba(220,38,38,0.3)] animate-pulse"
            >
              🌹
            </button>
            <Link
              to="/chats"
              className="w-10 h-10 glass rounded-full flex items-center justify-center text-lg active:scale-90 transition-transform"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="#FF0080"
                stroke="#9D00FF"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="feather feather-bell"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </Link>
            <Link
              to="/profile"
              className="w-10 h-10 glass rounded-full flex items-center justify-center overflow-hidden border border-white/10 active:scale-90 transition-transform"
            >
              <AppImage
                src={user.photoUrl}
                className="w-full h-full object-cover bg-white/5"
                alt="Profile"
              />
            </Link>
          </div>
        </div>

        <div className="flex space-x-4 border-b border-white/5 pb-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setView("discover")}
            className={`text-xs font-black uppercase tracking-widest ${view === "discover" ? "text-kipepeo-pink border-b-2 border-kipepeo-pink pb-2" : "text-gray-600"}`}
          >
            Discovery
          </button>
          <button
            onClick={() => setView("plans")}
            className={`text-xs font-black uppercase tracking-widest ${view === "plans" ? "text-kipepeo-pink border-b-2 border-kipepeo-pink pb-2" : "text-gray-600"}`}
          >
            Weekend Plans
          </button>
        </div>

        {view === "discover" && (
          <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
            {Object.values(IntentType).map((intent) => {
              const isActive = selectedIntents.includes(intent);
              return (
                <button
                  key={intent}
                  onClick={() => toggleIntentFilter(intent)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all flex-shrink-0 border ${
                    isActive
                      ? "bg-kipepeo-pink border-kipepeo-pink text-white shadow-lg shadow-kipepeo-pink/40"
                      : "bg-white/5 border-white/5 text-gray-500"
                  }`}
                >
                  {intent}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <div className="flex-1 px-4 relative flex flex-col overflow-hidden">
        {view === "discover" ? (
          <div className="flex-1 flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-base">
                Loading profiles...
              </div>
            ) : loadError ? (
              <div className="flex-1 flex items-center justify-center text-red-400 text-base">
                {loadError}
              </div>
            ) : current ? (
              <div className="flex-1 rounded-[2.5rem] overflow-hidden relative glass border-white/5 shadow-2xl animate-in zoom-in-95 group mb-4">
                <AppImage
                  src={current.photoUrl}
                  className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700"
                  alt="Selfie"
                  loading="eager"
                  fetchPriority="high"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>

                <div className="absolute top-6 left-6 flex space-x-2">
                  {current.isOnline && (
                    <div className="bg-green-500/80 backdrop-blur-md text-[9px] font-black px-2 py-1 rounded-lg text-white uppercase tracking-widest">
                      Active Now
                    </div>
                  )}
                </div>

                <div className="absolute bottom-0 left-0 p-8 w-full">
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <h2 className="text-3xl font-black mb-1 leading-none tracking-tighter uppercase">
                        {current.nickname}
                      </h2>
                      <div className="flex items-center space-x-2 text-sm font-bold text-gray-400">
                        <span>{current.ageRange} Yrs</span>
                        <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                        <span>{current.area}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {(current.intents ?? []).map((i) => (
                      <span
                        key={i}
                        className="text-[9px] font-black uppercase bg-kipepeo-purple/30 text-kipepeo-purple px-2 py-1 rounded border border-kipepeo-purple/20"
                      >
                        {i}
                      </span>
                    ))}
                  </div>

                  <p className="text-base text-gray-300 mb-8 line-clamp-3 italic font-medium leading-relaxed max-w-xs">
                    "{current.bio}"
                  </p>

                  <div className="flex space-x-4">
                    <button
                      onClick={() =>
                        setCurrentIndex(
                          (currentIndex + 1) % filteredProfiles.length,
                        )
                      }
                      className="flex-1 py-4 glass rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-transform"
                    >
                      Skip
                    </button>
                    <button
                      onClick={() =>
                        setCurrentIndex(
                          (currentIndex + 1) % filteredProfiles.length,
                        )
                      }
                      className="flex-[2] py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-transform shadow-xl"
                    >
                      Private Chat
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                <span className="text-6xl mb-4">🌙</span>
                <p className="font-black uppercase tracking-widest text-sm">
                  No matches yet.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Try removing filters or check back later.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar pb-10">
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-base">
              No plans yet.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoverPage;
