import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LikeRecord, UserProfile } from "../types";
import {
  listenToLikesReceived,
  listenToLikesSent,
} from "../services/likeService";
import { getAnalyticsInsights, rewriteBio } from "../services/aiService";

interface Props {
  user: UserProfile;
}

const LikesAnalyticsPage: React.FC<Props> = ({ user }) => {
  const [receivedLikes, setReceivedLikes] = useState<LikeRecord[]>([]);
  const [sentLikes, setSentLikes] = useState<LikeRecord[]>([]);
  const [receivedReady, setReceivedReady] = useState(false);
  const [sentReady, setSentReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeReceived = listenToLikesReceived(
      user.id,
      (items) => {
        setReceivedLikes(items);
        setReceivedReady(true);
      },
      (err) => {
        setError(err.message);
        setReceivedReady(true);
      },
    );

    const unsubscribeSent = listenToLikesSent(
      user.id,
      (items) => {
        setSentLikes(items);
        setSentReady(true);
      },
      (err) => {
        setError(err.message);
        setSentReady(true);
      },
    );

    return () => {
      unsubscribeReceived();
      unsubscribeSent();
    };
  }, [user.id]);

  const loading = !(receivedReady && sentReady);

  const startOfToday = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }, []);

  const startOfWeek = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }, []);

  const analytics = useMemo(() => {
    const receivedToday = receivedLikes.filter(
      (like) => like.createdAt >= startOfToday,
    ).length;
    const sentToday = sentLikes.filter(
      (like) => like.createdAt >= startOfToday,
    ).length;
    const receivedWeek = receivedLikes.filter(
      (like) => like.createdAt >= startOfWeek,
    ).length;
    const sentWeek = sentLikes.filter(
      (like) => like.createdAt >= startOfWeek,
    ).length;
    const sentTargets = new Set(sentLikes.map((like) => like.toUserId));
    const mutual = receivedLikes.filter((like) =>
      sentTargets.has(like.fromUserId),
    );
    return {
      receivedToday,
      sentToday,
      receivedWeek,
      sentWeek,
      mutualCount: mutual.length,
    };
  }, [receivedLikes, sentLikes, startOfToday, startOfWeek]);

  const achievements = useMemo(() => {
    const receivedTotal = receivedLikes.length;
    const sentTotal = sentLikes.length;
    const mutualTotal = analytics.mutualCount;

    return [
      {
        id: "first-like",
        title: "First Spark",
        description: "Receive your first like.",
        unlocked: receivedTotal >= 1,
        accent: "text-amber-300",
      },
      {
        id: "fan-favorite",
        title: "Fan Favorite",
        description: "Receive 10 likes.",
        unlocked: receivedTotal >= 10,
        accent: "text-pink-300",
      },
      {
        id: "heartthrob",
        title: "Heartthrob",
        description: "Receive 50 likes.",
        unlocked: receivedTotal >= 50,
        accent: "text-rose-300",
      },
      {
        id: "social-butterfly",
        title: "Social Butterfly",
        description: "Send 10 likes.",
        unlocked: sentTotal >= 10,
        accent: "text-emerald-300",
      },
      {
        id: "ice-breaker",
        title: "Ice Breaker",
        description: "Send 50 likes.",
        unlocked: sentTotal >= 50,
        accent: "text-teal-300",
      },
      {
        id: "mutual-vibe",
        title: "Mutual Vibes",
        description: "Get 1 mutual like.",
        unlocked: mutualTotal >= 1,
        accent: "text-sky-300",
      },
      {
        id: "match-magnet",
        title: "Match Magnet",
        description: "Get 5 mutual likes.",
        unlocked: mutualTotal >= 5,
        accent: "text-blue-300",
      },
      {
        id: "verified",
        title: "Verified Heart",
        description: "Verify your email.",
        unlocked: user.emailVerified,
        accent: "text-violet-300",
      },
      {
        id: "premium-crown",
        title: "Premium Crown",
        description: "Activate premium.",
        unlocked: Boolean(user.isPremium),
        accent: "text-yellow-300",
      },
      {
        id: "live-100",
        title: "Live 100",
        description: "Hit 100 likes in a live.",
        unlocked: false,
        accent: "text-orange-300",
      },
      {
        id: "live-500",
        title: "Live 500",
        description: "Hit 500 likes in a live.",
        unlocked: false,
        accent: "text-red-300",
      },
      {
        id: "weekend-host",
        title: "Weekend Host",
        description: "Create your first weekend plan.",
        unlocked: false,
        accent: "text-lime-300",
      },
    ];
  }, [
    receivedLikes.length,
    sentLikes.length,
    analytics.mutualCount,
    user.emailVerified,
    user.isPremium,
  ]);

  const unlockedCount = useMemo(
    () => achievements.filter((achievement) => achievement.unlocked).length,
    [achievements],
  );

  const aiInsights = useMemo(
    () =>
      getAnalyticsInsights({
        user,
        receivedLikes,
        sentLikes,
      }),
    [receivedLikes, sentLikes, user],
  );

  const aiSuggestedBio = useMemo(
    () => rewriteBio({ bio: user.bio, tone: "confident" }),
    [user.bio],
  );

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-kipepeo-dark text-white font-sans">
      <header className="p-6 flex justify-between items-center border-b border-white/5 bg-kipepeo-dark sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <Link
            to="/profile"
            className="group flex h-10 w-10 items-center justify-center rounded-full bg-white/5 transition-all hover:bg-white/10 active:scale-90"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400 group-hover:text-white"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest">
              Likes Analytics
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em]">
              Your momentum this week
            </p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full bg-kipepeo-pink/10 text-kipepeo-pink text-[10px] font-black uppercase tracking-widest border border-kipepeo-pink/30">
          Live
        </div>
      </header>

      <div className="p-6 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-500 text-sm">
            Loading analytics...
          </div>
        ) : (
          <>
            {error && (
              <div className="glass rounded-2xl border border-red-500/20 p-4 text-sm text-red-300">
                {error.includes("index")
                  ? "Firestore needs an index for likes queries. Create composite indexes for (toUserId + createdAt) and (fromUserId + createdAt)."
                  : "Unable to load likes analytics right now."}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="glass rounded-2xl p-5 border border-white/5">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">
                  Likes Received
                </p>
                <div className="text-3xl font-black">
                  {receivedLikes.length}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.receivedToday} today • {analytics.receivedWeek}{" "}
                  this week
                </p>
              </div>
              <div className="glass rounded-2xl p-5 border border-white/5">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">
                  Likes Sent
                </p>
                <div className="text-3xl font-black">{sentLikes.length}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.sentToday} today • {analytics.sentWeek} this week
                </p>
              </div>
              <div className="glass rounded-2xl p-5 border border-white/5">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">
                  Mutual Vibes
                </p>
                <div className="text-3xl font-black">
                  {analytics.mutualCount}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  People who liked you back
                </p>
              </div>
            </div>

            <div className="glass rounded-2xl border border-white/5 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">
                  AI Insights
                </h2>
                <span className="text-[10px] uppercase tracking-[0.3em] text-kipepeo-pink">
                  Live
                </span>
              </div>
              <ul className="space-y-2 text-sm text-gray-300">
                {aiInsights.map((insight) => (
                  <li key={insight}>• {insight}</li>
                ))}
              </ul>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">
                  AI Suggested Bio
                </p>
                <p className="text-sm text-gray-300 italic">
                  "{aiSuggestedBio}"
                </p>
              </div>
            </div>

            <div className="glass rounded-2xl border border-white/5 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">
                    Achievements
                  </h2>
                  <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] mt-1">
                    {unlockedCount} / {achievements.length} unlocked
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-kipepeo-pink">
                  Crowns
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`relative overflow-hidden rounded-2xl border p-4 transition-transform ${
                      achievement.unlocked
                        ? "border-white/10 bg-white/5"
                        : "border-white/5 bg-white/5 opacity-60 grayscale"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                          achievement.unlocked
                            ? "border-white/10 bg-white/10"
                            : "border-white/5 bg-white/5"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`h-6 w-6 ${
                            achievement.unlocked
                              ? achievement.accent
                              : "text-gray-500"
                          }`}
                        >
                          <path d="M3 17l2-8 5 5 2-6 2 6 5-5 2 8" />
                          <path d="M3 17h18" />
                          <circle cx="5" cy="7" r="1.5" />
                          <circle cx="12" cy="5" r="1.5" />
                          <circle cx="19" cy="7" r="1.5" />
                        </svg>
                      </div>
                      <span
                        className={`text-[10px] uppercase tracking-widest rounded-full border px-2 py-1 ${
                          achievement.unlocked
                            ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/10"
                            : "border-white/10 text-gray-500 bg-white/5"
                        }`}
                      >
                        {achievement.unlocked ? "Unlocked" : "Locked"}
                      </span>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-semibold">
                        {achievement.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="glass rounded-2xl border border-white/5 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">
                    Recent Likes Received
                  </h2>
                  <span className="text-[10px] text-gray-600 uppercase tracking-[0.3em]">
                    {receivedLikes.length} total
                  </span>
                </div>
                {receivedLikes.length === 0 ? (
                  <div className="text-gray-500 text-sm py-6 text-center">
                    No likes yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receivedLikes.slice(0, 6).map((like) => (
                      <div
                        key={like.id}
                        className="flex items-center justify-between rounded-xl border border-white/5 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-kipepeo-pink/15 border border-kipepeo-pink/40 flex items-center justify-center font-black text-sm text-kipepeo-pink">
                            {getInitials(like.fromNickname)}
                          </div>
                          <div>
                            <p className="font-semibold">
                              {like.fromNickname ?? "Someone"}
                            </p>
                            <p className="text-xs text-gray-500 uppercase tracking-widest">
                              Liked your profile
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTime(like.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass rounded-2xl border border-white/5 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">
                    Recent Likes Sent
                  </h2>
                  <span className="text-[10px] text-gray-600 uppercase tracking-[0.3em]">
                    {sentLikes.length} total
                  </span>
                </div>
                {sentLikes.length === 0 ? (
                  <div className="text-gray-500 text-sm py-6 text-center">
                    You haven't liked anyone yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sentLikes.slice(0, 6).map((like) => (
                      <div
                        key={like.id}
                        className="flex items-center justify-between rounded-xl border border-white/5 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-black text-sm text-gray-300">
                            {getInitials(like.toNickname)}
                          </div>
                          <div>
                            <p className="font-semibold">
                              {like.toNickname ?? "Someone"}
                            </p>
                            <p className="text-xs text-gray-500 uppercase tracking-widest">
                              You liked them
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTime(like.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LikesAnalyticsPage;
