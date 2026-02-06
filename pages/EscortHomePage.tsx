import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IntentType, UserProfile } from "../types";
import { getAllUsers, getAllUserSettings } from "../services/userService";
import { createNotification } from "../services/notificationService";
import AppImage from "../components/AppImage";
import LottiePlayer from "../components/LottiePlayer";

interface Props {
  user: UserProfile;
}

const EscortHomePage: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [detailsProfile, setDetailsProfile] = useState<UserProfile | null>(
    null,
  );
  const [requestTarget, setRequestTarget] = useState<UserProfile | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestContact, setRequestContact] = useState(user.email || "");
  const [requestSending, setRequestSending] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [exitLoading, setExitLoading] = useState(false);

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
          if (settings && !settings.discoverable) return false;
          return profile.intents?.includes(IntentType.HIRING);
        });
        setProfiles(filtered);
      })
      .catch((err) => {
        console.error(err);
        if (active) setError("Unable to load escort profiles right now.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user.id]);

  const categories = [
    "All",
    "Dinner",
    "Weekend",
    "Overnight",
    "Adventure",
    "Travel",
  ];

  const filteredProfiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return profiles.filter((profile) => {
      const matchesQuery =
        !normalized ||
        profile.nickname.toLowerCase().includes(normalized) ||
        profile.area.toLowerCase().includes(normalized);
      const matchesCategory =
        category === "All" ||
        profile.bio?.toLowerCase().includes(category.toLowerCase());
      return matchesQuery && matchesCategory;
    });
  }, [profiles, query, category]);

  const handleRequestOpen = (target: UserProfile) => {
    setRequestFeedback(null);
    setRequestError(null);
    setRequestTarget(target);
    setRequestMessage("");
    setRequestContact(user.email || "");
  };

  const handleRequestSend = async () => {
    if (!requestTarget) return;
    if (!requestMessage.trim() || !requestContact.trim()) {
      setRequestError("Please add your contact and a short request message.");
      return;
    }
    setRequestSending(true);
    setRequestError(null);
    try {
      await createNotification({
        toUserId: requestTarget.id,
        fromUserId: user.id,
        fromNickname: user.nickname,
        type: "system",
        body: `New escort request from ${user.nickname}. Contact: ${requestContact}. Message: ${requestMessage}`,
      });
      setRequestFeedback("Request sent. The escort will reach out soon.");
      setRequestTarget(null);
      setRequestMessage("");
    } catch (err) {
      console.error(err);
      setRequestError("Unable to send request right now.");
    } finally {
      setRequestSending(false);
    }
  };

  const handleExitConfirm = () => {
    setShowExitConfirm(false);
    setExitLoading(true);
    setTimeout(() => {
      navigate("/discover");
    }, 1400);
  };

  return (
    <div className="min-h-screen bg-[#0b0508] text-white font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,0,120,0.25),_transparent_55%)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(255,90,0,0.18),_transparent_55%)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      <header className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-white/5 sticky top-0 z-20 backdrop-blur-sm bg-[#0b0508]/80">
        <div>
          <p className="text-[10px] text-rose-200 uppercase tracking-[0.5em]">
            Confidential
          </p>
          <h1 className="text-2xl font-black uppercase tracking-widest text-red-100">
            Velvet Escort Lounge
          </h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em]">
            Verified private companions
          </p>
        </div>
        <button
          onClick={() => setShowExitConfirm(true)}
          className="px-4 py-2 rounded-full border border-red-500/30 text-red-100 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 active:scale-95 transition-transform"
        >
          Exit Escort Portal
        </button>
      </header>

      <div className="px-6 py-6 space-y-6 relative z-10">
        {requestFeedback && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {requestFeedback}
          </div>
        )}

        <section className="rounded-3xl border border-red-500/20 bg-[#14070c]/80 p-5 space-y-4 shadow-[0_0_30px_rgba(255,0,90,0.08)]">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">
              Find a Companion
            </h2>
            <span className="text-[10px] text-gray-500 uppercase tracking-[0.3em]">
              {filteredProfiles.length} available
            </span>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or area"
            className="w-full rounded-2xl bg-black/40 border border-red-500/20 px-4 py-3 text-sm text-red-100 placeholder:text-gray-500 focus:outline-none focus:border-red-400/40"
          />
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  category === item
                    ? "bg-red-500/80 text-white border-red-400/60"
                    : "bg-black/40 text-gray-400 border-red-500/20"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="text-center py-20 text-gray-500 text-sm">
            Loading escort profiles...
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-400 text-sm">{error}</div>
        ) : filteredProfiles.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            No escorts available right now. Check back later.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                className="rounded-3xl border border-red-500/20 bg-[#14070c]/90 overflow-hidden shadow-[0_0_30px_rgba(255,0,90,0.08)]"
              >
                <div className="relative h-56">
                  <AppImage
                    src={profile.photoUrl}
                    alt={profile.nickname}
                    className="w-full h-full object-cover"
                    fetchPriority="high"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                  <div className="absolute bottom-4 left-4">
                    <p className="text-xl font-black">{profile.nickname}</p>
                    <p className="text-xs text-gray-300 uppercase tracking-widest">
                      {profile.area}
                    </p>
                  </div>
                  {profile.isOnline && (
                    <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] uppercase tracking-widest text-emerald-200">
                      Online
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {profile.bio}
                  </p>
                  <div className="flex items-center justify-between text-xs uppercase tracking-widest text-gray-500">
                    <span>Rate</span>
                    <span className="text-white font-bold">
                      {profile.ratePerDay || "Ask"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRequestOpen(profile)}
                      className="flex-1 py-2 rounded-full bg-red-500/90 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
                    >
                      Request
                    </button>
                    <button
                      onClick={() => setDetailsProfile(profile)}
                      className="flex-1 py-2 rounded-full bg-black/40 text-gray-300 text-xs font-black uppercase tracking-widest border border-red-500/20 text-center"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <section className="rounded-3xl border border-red-500/20 bg-[#14070c]/80 p-5 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-red-200">
            Safety First
          </h3>
          <p className="text-sm text-gray-400">
            Meet in public places, share your location with a trusted friend,
            and trust your instincts. We verify profiles but your safety comes
            first.
          </p>
        </section>

        {detailsProfile && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-6">
            <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-[#14070c] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black uppercase tracking-widest">
                    {detailsProfile.nickname}
                  </h3>
                  <p className="text-xs text-gray-500 uppercase tracking-[0.3em]">
                    {detailsProfile.area}
                  </p>
                </div>
                <button
                  onClick={() => setDetailsProfile(null)}
                  className="text-xs uppercase tracking-widest text-gray-400"
                >
                  Close
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border border-red-500/30">
                  <AppImage
                    src={detailsProfile.photoUrl}
                    alt={detailsProfile.nickname}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-widest text-gray-400">
                    Age Range: {detailsProfile.ageRange}
                  </p>
                  <p className="text-xs uppercase tracking-widest text-gray-400">
                    Rate: {detailsProfile.ratePerDay || "Ask"}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-300">{detailsProfile.bio}</p>
              <div className="flex flex-wrap gap-2">
                {(detailsProfile.intents ?? []).map((intent) => (
                  <span
                    key={intent}
                    className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-500/30 text-red-200"
                  >
                    {intent}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {requestTarget && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-6">
            <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-[#14070c] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black uppercase tracking-widest">
                    Request {requestTarget.nickname}
                  </h3>
                  <p className="text-xs text-gray-500 uppercase tracking-[0.3em]">
                    Share how to reach you
                  </p>
                </div>
                <button
                  onClick={() => setRequestTarget(null)}
                  className="text-xs uppercase tracking-widest text-gray-400"
                >
                  Close
                </button>
              </div>
              <input
                value={requestContact}
                onChange={(e) => setRequestContact(e.target.value)}
                placeholder="WhatsApp or phone"
                className="w-full rounded-2xl bg-black/40 border border-red-500/20 px-4 py-3 text-sm text-red-100 placeholder:text-gray-500 focus:outline-none"
              />
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={3}
                placeholder="Short request message"
                className="w-full rounded-2xl bg-black/40 border border-red-500/20 p-3 text-sm text-red-100 placeholder:text-gray-500 focus:outline-none"
              />
              {requestError && (
                <p className="text-xs text-red-300">{requestError}</p>
              )}
              <button
                onClick={handleRequestSend}
                disabled={requestSending}
                className="w-full py-3 rounded-full bg-red-500/90 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-60"
              >
                {requestSending ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        )}

        {showExitConfirm && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-6">
            <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#14070c] p-6 space-y-4 text-center">
              <h3 className="text-base font-black uppercase tracking-widest text-red-100">
                Leave Escort Portal?
              </h3>
              <p className="text-sm text-gray-400">
                You will return to the main app. Are you sure?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-3 rounded-full bg-white/5 text-gray-300 text-xs font-black uppercase tracking-widest border border-red-500/20 active:scale-95 transition-transform"
                >
                  Stay
                </button>
                <button
                  onClick={handleExitConfirm}
                  className="flex-1 py-3 rounded-full bg-red-500/90 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}

        {exitLoading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 px-6">
            <LottiePlayer
              path="/assets/lottie/loading.json"
              className="w-40 h-40"
            />
            <p className="mt-4 text-xs uppercase tracking-[0.3em] text-red-200">
              Exiting portal...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EscortHomePage;
