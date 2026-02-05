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
    const lastReadAt =
      conversation?.lastReadAt?.[user.id]?.toMillis?.() ?? 0;
    return lastMessageAt > lastReadAt;
  };

  return (
    <div className="min-h-screen bg-kipepeo-dark flex flex-col font-sans relative">
      <header className="p-6 border-b border-white/5 flex justify-between items-center bg-kipepeo-dark sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <Link
            to="/discover"
            className="text-2xl active:scale-90 transition-transform"
          >
            ←
          </Link>
          <h1 className="text-2xl font-black">MESSAGES</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleNotifications}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95 relative"
          >
            {unreadNotifications.length > 0 && (
              <div className="absolute top-2 right-2.5 w-2 h-2 bg-pink-500 rounded-full shadow-[0_0_5px_#ec4899]"></div>
            )}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-300"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <Link
            to="/profile"
            className="w-10 h-10 glass rounded-full overflow-hidden border border-white/10 active:scale-90 transition-transform"
          >
            <AppImage
              src={user.photoUrl}
              className="w-full h-full object-cover bg-white/5"
              alt="Profile"
              loading="eager"
              fetchPriority="high"
            />
          </Link>
        </div>
      </header>

      {showNotifications && (
        <div className="absolute top-20 right-6 z-30 w-72 glass rounded-2xl border border-white/10 p-4 shadow-xl">
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
                    {getNotificationTitle(notification)}
                  </p>
                  <p className="text-base text-gray-300 mt-1 line-clamp-2">
                    {getNotificationBody(notification)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
        <div className="mb-10">
          <h2 className="text-xs font-black text-gray-600 uppercase tracking-[0.3em] mb-4">
            New Plots
          </h2>
          <div className="flex space-x-4 overflow-x-auto pb-4 no-scrollbar">
            <div className="flex-shrink-0 w-16 h-16 rounded-full border-2 border-dashed border-kipepeo-pink flex items-center justify-center bg-kipepeo-pink/5">
              <span className="text-kipepeo-pink text-xl font-black">3</span>
            </div>
            {[3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden border-2 border-kipepeo-orange shadow-lg shadow-kipepeo-orange/20"
              >
                <AppImage
                  src={`https://picsum.photos/100/100?random=${i}`}
                  className="w-full h-full object-cover bg-white/5"
                  alt="Match"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xs font-black text-gray-600 uppercase tracking-[0.3em] mb-4">
            Conversations
          </h2>
          {loading ? (
            <div className="text-center py-20 text-gray-500 text-base">
              Loading conversations...
            </div>
          ) : sortedConversations.length > 0 ? (
            sortedConversations.map((conversation) => {
              const members: string[] = conversation.members ?? [];
              const otherId = members.find((id) => id !== user.id);
              const profile =
                conversation.memberProfiles?.[otherId ?? ""] ?? {};
              const isUnread = isConversationUnread(conversation);
              return (
                <Link
                  to={`/chats/${conversation.id}`}
                  key={conversation.id}
                  className={`flex items-center p-4 glass rounded-2xl transition-all active:scale-95 border hover:bg-white/5 ${
                    isUnread
                      ? "border-kipepeo-pink/40 bg-kipepeo-pink/5"
                      : "border-white/5"
                  }`}
                >
                  <AppImage
                    src={profile.photoUrl ?? user.photoUrl}
                    className="w-14 h-14 rounded-full mr-4 object-cover border-2 border-kipepeo-purple bg-white/5"
                    alt="Chat"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-black text-lg">
                        {profile.nickname ?? "Unknown"}
                      </h3>
                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-kipepeo-pink">
                            New
                          </span>
                        )}
                        <span className="text-xs text-gray-500 font-bold uppercase">
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                    </div>
                    <p
                      className={`text-base truncate font-medium ${
                        isUnread ? "text-white" : "text-gray-500"
                      }`}
                    >
                      {conversation.lastMessage ?? "Start the conversation"}
                    </p>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="text-center py-20 opacity-20 grayscale">
              <p className="font-black uppercase tracking-widest text-sm">
                No chats yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatListPage;
