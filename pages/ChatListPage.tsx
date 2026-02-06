import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppNotification, UserProfile } from "../types";
import AppImage from "../components/AppImage";
import { listenToConversations } from "../services/chatService";
import {
  listenToNotifications,
  markNotificationsRead,
} from "../services/notificationService";

interface Props {
  user: UserProfile;
}

const ChatListPage: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const unsubscribe = listenToConversations(user.id, (items) => {
      setConversations(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user.id]);

  useEffect(() => {
    const unsubscribe = listenToNotifications(user.id, (items) => {
      setNotifications(items);
    });
    return () => unsubscribe();
  }, [user.id]);

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const aTime = a?.lastMessageAt?.toMillis?.() ?? 0;
      const bTime = b?.lastMessageAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
  }, [conversations]);

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read),
    [notifications],
  );

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

  const formatTime = (timestamp: any) => {
    const millis = timestamp?.toMillis?.() ?? null;
    if (!millis) return "";
    const diff = Date.now() - millis;
    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const isConversationUnread = (conversation: any) => {
    const lastMessageAt = conversation?.lastMessageAt?.toMillis?.() ?? 0;
    if (!lastMessageAt) return false;
    const lastSenderId = conversation?.lastSenderId;
    if (!lastSenderId || lastSenderId === user.id) return false;
    const lastReadAt = conversation?.lastReadAt?.[user.id]?.toMillis?.() ?? 0;
    return lastMessageAt > lastReadAt;
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#121212] font-sans text-gray-200 selection:bg-kipepeo-pink/30">
      {/* Background Ambience */}
      <div className="fixed -left-40 top-0 h-96 w-96 rounded-full bg-kipepeo-purple/10 blur-[100px] pointer-events-none"></div>
      <div className="fixed -right-40 bottom-0 h-96 w-96 rounded-full bg-kipepeo-pink/10 blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/5 bg-[#121212]/80 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Link
            to="/discover"
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
          <h1 className="text-xl font-black tracking-tighter text-white">
            MESSAGES
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleNotifications}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-white/5 text-gray-300 transition-all hover:bg-white/10 hover:text-white active:scale-95"
          >
            {unreadNotifications.length > 0 && (
              <span className="absolute right-2 top-2.5 h-2 w-2 animate-pulse rounded-full bg-kipepeo-pink shadow-[0_0_8px_#ec4899]"></span>
            )}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </button>

          <Link
            to="/profile"
            className="h-10 w-10 overflow-hidden rounded-full border border-white/10 ring-2 ring-transparent transition-all hover:ring-kipepeo-pink/50 active:scale-90"
          >
            <AppImage
              src={user.photoUrl}
              className="h-full w-full object-cover"
              alt="Profile"
              loading="eager"
            />
          </Link>
        </div>
      </header>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="absolute right-6 top-20 z-50 w-80 origin-top-right animate-in fade-in zoom-in-95 duration-200">
          <div className="absolute -top-2 right-4 h-4 w-4 rotate-45 border-l border-t border-white/10 bg-[#121212]"></div>
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#121212]/95 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                Notifications
              </h3>
              {notifications.filter((n) => !n.read).length > 0 && (
                <span className="rounded-full bg-kipepeo-pink/20 px-2 py-0.5 text-[9px] font-bold text-kipepeo-pink">
                  {notifications.filter((n) => !n.read).length} New
                </span>
              )}
            </div>
            <div className="max-h-[350px] overflow-y-auto overflow-x-hidden scroll-smooth py-2">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1"
                    stroke="currentColor"
                    className="mb-3 h-10 w-10 text-gray-500"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5"
                    />
                  </svg>
                  <p className="text-sm font-bold text-gray-400">
                    All caught up
                  </p>
                </div>
              ) : (
                <div className="space-y-1 px-2">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`group relative w-full rounded-xl border p-3 text-left transition-all duration-200 hover:scale-[0.98] ${
                        notification.read
                          ? "border-transparent bg-transparent opacity-60 hover:bg-white/5 hover:opacity-100"
                          : "border-kipepeo-pink/20 bg-gradient-to-r from-kipepeo-pink/10 to-transparent hover:border-kipepeo-pink/40"
                      }`}
                    >
                      {!notification.read && (
                        <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-kipepeo-pink shadow-[0_0_8px_rgba(236,72,153,0.8)]"></span>
                      )}
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            notification.read
                              ? "bg-white/5 text-gray-500"
                              : "bg-kipepeo-pink/20 text-kipepeo-pink"
                          }`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-4 w-4"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div>
                          <p
                            className={`text-[11px] font-bold uppercase tracking-wider ${
                              notification.read ? "text-gray-400" : "text-white"
                            }`}
                          >
                            {getNotificationTitle(notification)}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-400 group-hover:text-gray-300">
                            {getNotificationBody(notification)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 h-8 w-full bg-gradient-to-t from-[#121212] to-transparent"></div>
          </div>
        </div>
      )}

      {/* Main Conversation List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="flex items-end justify-between px-2 pb-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
              Recent Chats
            </h2>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-kipepeo-pink border-t-transparent"></div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-gray-600">
                Syncing...
              </p>
            </div>
          ) : sortedConversations.length > 0 ? (
            <div className="space-y-3">
              {sortedConversations.map((conversation) => {
                const members: string[] = conversation.members ?? [];
                const otherId = members.find((id) => id !== user.id);
                const profile =
                  conversation.memberProfiles?.[otherId ?? ""] ?? {};
                const isUnread = isConversationUnread(conversation);

                return (
                  <Link
                    to={`/chats/${conversation.id}`}
                    key={conversation.id}
                    className={`group relative flex items-center gap-4 rounded-2xl border p-4 transition-all duration-300 hover:scale-[1.01] hover:bg-white/5 active:scale-95 ${
                      isUnread
                        ? "border-kipepeo-pink/30 bg-gradient-to-r from-kipepeo-pink/10 to-transparent shadow-[0_0_20px_-10px_rgba(236,72,153,0.3)]"
                        : "border-white/5 bg-white/[0.02]"
                    }`}
                  >
                    {/* Avatar with Status Dot */}
                    <div className="relative shrink-0">
                      <AppImage
                        src={profile.photoUrl ?? user.photoUrl}
                        className={`h-14 w-14 rounded-full object-cover transition-transform group-hover:scale-105 ${
                          isUnread
                            ? "ring-2 ring-kipepeo-pink"
                            : "ring-1 ring-white/10"
                        }`}
                        alt="Chat Profile"
                      />
                      {isUnread && (
                        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#121212] bg-kipepeo-pink"></span>
                      )}
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3
                          className={`truncate text-base font-black tracking-tight ${
                            isUnread
                              ? "text-white"
                              : "text-gray-300 group-hover:text-white"
                          }`}
                        >
                          {profile.nickname ?? "Unknown"}
                        </h3>
                        <span className="ml-2 shrink-0 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <p
                        className={`truncate text-sm ${
                          isUnread
                            ? "font-bold text-gray-200"
                            : "font-medium text-gray-500 group-hover:text-gray-400"
                        }`}
                      >
                        {conversation.lastMessage ?? "Start the conversation"}
                      </p>
                    </div>

                    {/* Right Arrow (Chevron) */}
                    <div className="shrink-0 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-500"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 grayscale">
                <span className="text-3xl">👻</span>
              </div>
              <h3 className="text-lg font-black text-gray-300">No chats yet</h3>
              <p className="max-w-[200px] text-xs text-gray-600 mt-1">
                Explore the discover feed to find someone to vibe with.
              </p>
              <Link
                to="/discover"
                className="mt-6 rounded-xl bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-black transition-transform hover:scale-105 active:scale-95"
              >
                Start Exploring
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatListPage;
