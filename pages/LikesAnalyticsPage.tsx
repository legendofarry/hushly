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
            className="text-2xl active:scale-90 transition-transform"
          ></Link>
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
                <p className="text-sm text-gray-300 italic">"{aiSuggestedBio}"</p>
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
