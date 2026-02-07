import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppNotification, UserProfile } from "../types";
import AppImage from "../components/AppImage";
import {
  clearConversationForUser,
  listenToConversations,
  markConversationUnread,
  setConversationArchived,
  setConversationDeleted,
  setConversationMuted,
  setConversationPinned,
} from "../services/chatService";
import {
  clearNotificationsForUser,
  deleteNotification,
  listenToNotifications,
  markNotificationsRead,
  setNotificationRead,
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
  const [notificationMenu, setNotificationMenu] = useState<{
    notification: AppNotification;
    x: number;
    y: number;
  } | null>(null);
  const [freshNotificationIds, setFreshNotificationIds] = useState<Set<string>>(
    new Set(),
  );
  const [showArchived, setShowArchived] = useState(false);
  const [menuMessage, setMenuMessage] = useState<string | null>(null);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    conversation: any;
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationLongPressRef = useRef<number | null>(null);
  const notificationTouchStartRef = useRef<{ x: number; y: number } | null>(
    null,
  );
  const suppressNotificationClickRef = useRef(false);
  const prevNotificationIdsRef = useRef<Set<string>>(new Set());
  const longPressTimeoutRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);

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

  useEffect(() => {
    if (!notifications.length) {
      setFreshNotificationIds(new Set());
      prevNotificationIdsRef.current = new Set();
      return;
    }
    const prevIds = prevNotificationIdsRef.current;
    const nextIds = new Set(notifications.map((n) => n.id));
    const freshUnread = notifications.filter(
      (n) => !n.read && !prevIds.has(n.id),
    );
    setFreshNotificationIds((prev) => {
      const next = new Set(prev);
      freshUnread.forEach((n) => next.add(n.id));
      Array.from(next).forEach((id) => {
        if (!nextIds.has(id)) {
          next.delete(id);
        }
      });
      return next;
    });
    prevNotificationIdsRef.current = nextIds;
  }, [notifications]);

  useEffect(() => {
    if (!menuMessage && !menuError) return;
    const timeout = window.setTimeout(() => {
      setMenuMessage(null);
      setMenuError(null);
    }, 2800);
    return () => window.clearTimeout(timeout);
  }, [menuMessage, menuError]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeContextMenu();
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeContextMenu();
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!notificationMenu) return;
    const handleClick = (event: MouseEvent) => {
      if (
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(event.target as Node)
      ) {
        setNotificationMenu(null);
        suppressNotificationClickRef.current = false;
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationMenu(null);
        suppressNotificationClickRef.current = false;
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [notificationMenu]);

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const aPinned = Boolean(a?.pinnedBy?.[user.id]);
      const bPinned = Boolean(b?.pinnedBy?.[user.id]);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      const aTime = a?.lastMessageAt?.toMillis?.() ?? 0;
      const bTime = b?.lastMessageAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
  }, [conversations, user.id]);

  const activeConversations = useMemo(() => {
    return sortedConversations.filter((conversation) => {
      const isDeleted = Boolean(conversation?.deletedAt?.[user.id]);
      const isArchived = Boolean(conversation?.archivedBy?.[user.id]);
      return !isDeleted && !isArchived;
    });
  }, [sortedConversations, user.id]);

  const archivedConversations = useMemo(() => {
    return sortedConversations.filter((conversation) => {
      const isDeleted = Boolean(conversation?.deletedAt?.[user.id]);
      const isArchived = Boolean(conversation?.archivedBy?.[user.id]);
      return !isDeleted && isArchived;
    });
  }, [sortedConversations, user.id]);

  const visibleConversations = showArchived
    ? archivedConversations
    : activeConversations;

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read),
    [notifications],
  );

  const clampMenuPosition = (x: number, y: number) => {
    const menuWidth = 240;
    const menuHeight = 300;
    const padding = 16;
    const maxX = window.innerWidth - menuWidth - padding;
    const maxY = window.innerHeight - menuHeight - padding;
    return {
      x: Math.max(padding, Math.min(x, maxX)),
      y: Math.max(padding, Math.min(y, maxY)),
    };
  };

  const clampNotificationMenuPosition = (x: number, y: number) => {
    const menuWidth = 220;
    const menuHeight = 200;
    const padding = 16;
    const maxX = window.innerWidth - menuWidth - padding;
    const maxY = window.innerHeight - menuHeight - padding;
    return {
      x: Math.max(padding, Math.min(x, maxX)),
      y: Math.max(padding, Math.min(y, maxY)),
    };
  };

  const openContextMenu = (conversation: any, x: number, y: number) => {
    const position = clampMenuPosition(x, y);
    setContextMenu({ conversation, ...position });
  };

  const openNotificationMenu = (
    notification: AppNotification,
    x: number,
    y: number,
  ) => {
    const position = clampNotificationMenuPosition(x, y);
    setNotificationMenu({ notification, ...position });
  };

  const closeContextMenu = () => {
    suppressClickRef.current = false;
    setContextMenu(null);
  };

  const closeNotificationMenu = () => {
    suppressNotificationClickRef.current = false;
    setNotificationMenu(null);
  };

  const handleConversationClick = (conversation: any) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    navigate(`/chats/${conversation.id}`);
  };

  const handleConversationContextMenu = (
    event: React.MouseEvent,
    conversation: any,
  ) => {
    event.preventDefault();
    openContextMenu(conversation, event.clientX, event.clientY);
  };

  const handleTouchStart = (
    event: React.TouchEvent,
    conversation: any,
  ) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    suppressClickRef.current = false;
    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
    }
    longPressTimeoutRef.current = window.setTimeout(() => {
      suppressClickRef.current = true;
      longPressTimeoutRef.current = null;
      openContextMenu(conversation, touch.clientX, touch.clientY);
    }, 550);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!touchStartRef.current || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimeoutRef.current) {
        window.clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    touchStartRef.current = null;
  };

  const handleToggleArchive = async () => {
    if (!contextMenu?.conversation) return;
    setIsUpdating(true);
    setMenuError(null);
    try {
      const archived = Boolean(
        contextMenu.conversation?.archivedBy?.[user.id],
      );
      await setConversationArchived(
        contextMenu.conversation.id,
        user.id,
        !archived,
      );
      setMenuMessage(archived ? "Chat unarchived." : "Chat archived.");
    } catch (error) {
      console.error(error);
      setMenuError("Unable to archive this chat.");
    } finally {
      setIsUpdating(false);
      closeContextMenu();
    }
  };

  const handleTogglePin = async () => {
    if (!contextMenu?.conversation) return;
    setIsUpdating(true);
    setMenuError(null);
    try {
      const pinned = Boolean(contextMenu.conversation?.pinnedBy?.[user.id]);
      await setConversationPinned(
        contextMenu.conversation.id,
        user.id,
        !pinned,
      );
      setMenuMessage(pinned ? "Chat unpinned." : "Chat pinned.");
    } catch (error) {
      console.error(error);
      setMenuError("Unable to update pin.");
    } finally {
      setIsUpdating(false);
      closeContextMenu();
    }
  };

  const handleToggleMute = async () => {
    if (!contextMenu?.conversation) return;
    setIsUpdating(true);
    setMenuError(null);
    try {
      const muted = Boolean(contextMenu.conversation?.mutedBy?.[user.id]);
      await setConversationMuted(
        contextMenu.conversation.id,
        user.id,
        !muted,
      );
      setMenuMessage(muted ? "Notifications unmuted." : "Chat muted.");
    } catch (error) {
      console.error(error);
      setMenuError("Unable to update notifications.");
    } finally {
      setIsUpdating(false);
      closeContextMenu();
    }
  };

  const handleMarkUnread = async () => {
    if (!contextMenu?.conversation) return;
    setIsUpdating(true);
    setMenuError(null);
    try {
      await markConversationUnread(contextMenu.conversation.id, user.id);
      setMenuMessage("Marked as unread.");
    } catch (error) {
      console.error(error);
      setMenuError("Unable to mark unread.");
    } finally {
      setIsUpdating(false);
      closeContextMenu();
    }
  };

  const handleDeleteConversation = async () => {
    if (!contextMenu?.conversation) return;
    const confirmDelete = window.confirm(
      "Delete this chat for you? This will hide it and clear your view.",
    );
    if (!confirmDelete) return;
    setIsUpdating(true);
    setMenuError(null);
    try {
      await clearConversationForUser(contextMenu.conversation.id, user.id);
      await setConversationDeleted(contextMenu.conversation.id, user.id);
      setMenuMessage("Chat deleted.");
    } catch (error) {
      console.error(error);
      setMenuError("Unable to delete chat.");
    } finally {
      setIsUpdating(false);
      closeContextMenu();
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
    if (suppressNotificationClickRef.current) {
      suppressNotificationClickRef.current = false;
      return;
    }
    setFreshNotificationIds((prev) => {
      const next = new Set(prev);
      next.delete(notification.id);
      return next;
    });
    if (notification.type === "like" && notification.fromUserId) {
      navigate(`/users/${notification.fromUserId}`);
    } else if (notification.conversationId) {
      navigate(`/chats/${notification.conversationId}`);
    }
    setShowNotifications(false);
  };

  const handleNotificationContextMenu = (
    event: React.MouseEvent,
    notification: AppNotification,
  ) => {
    event.preventDefault();
    openNotificationMenu(notification, event.clientX, event.clientY);
  };

  const handleNotificationTouchStart = (
    event: React.TouchEvent,
    notification: AppNotification,
  ) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    notificationTouchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
    if (notificationLongPressRef.current) {
      window.clearTimeout(notificationLongPressRef.current);
    }
    notificationLongPressRef.current = window.setTimeout(() => {
      notificationLongPressRef.current = null;
      suppressNotificationClickRef.current = true;
      openNotificationMenu(notification, touch.clientX, touch.clientY);
    }, 500);
  };

  const handleNotificationTouchMove = (event: React.TouchEvent) => {
    if (!notificationTouchStartRef.current || event.touches.length !== 1)
      return;
    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - notificationTouchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - notificationTouchStartRef.current.y);
    if (deltaX > 10 || deltaY > 10) {
      if (notificationLongPressRef.current) {
        window.clearTimeout(notificationLongPressRef.current);
        notificationLongPressRef.current = null;
      }
    }
  };

  const handleNotificationTouchEnd = () => {
    if (notificationLongPressRef.current) {
      window.clearTimeout(notificationLongPressRef.current);
      notificationLongPressRef.current = null;
    }
    notificationTouchStartRef.current = null;
  };

  const handleClearNotifications = async () => {
    const confirmClear = window.confirm("Clear all notifications?");
    if (!confirmClear) return;
    setIsUpdating(true);
    setMenuError(null);
    try {
      await clearNotificationsForUser(user.id);
      setMenuMessage("Notifications cleared.");
    } catch (error) {
      console.error(error);
      setMenuError("Unable to clear notifications.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleNotificationRead = async (notification: AppNotification) => {
    setIsUpdating(true);
    setMenuError(null);
    try {
      await setNotificationRead(notification.id, !notification.read);
      setMenuMessage(
        notification.read ? "Marked as unread." : "Marked as read.",
      );
    } catch (error) {
      console.error(error);
      setMenuError("Unable to update notification.");
    } finally {
      setIsUpdating(false);
      closeNotificationMenu();
    }
  };

  const handleDeleteNotification = async (notification: AppNotification) => {
    setIsUpdating(true);
    setMenuError(null);
    try {
      await deleteNotification(notification.id);
      setMenuMessage("Notification removed.");
    } catch (error) {
      console.error(error);
      setMenuError("Unable to delete notification.");
    } finally {
      setIsUpdating(false);
      closeNotificationMenu();
    }
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
              <div className="flex items-center gap-2">
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="rounded-full bg-kipepeo-pink/20 px-2 py-0.5 text-[9px] font-bold text-kipepeo-pink">
                    {notifications.filter((n) => !n.read).length} New
                  </span>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearNotifications}
                    disabled={isUpdating}
                    className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-gray-300 hover:bg-white/10 disabled:opacity-60"
                  >
                    Clear
                  </button>
                )}
              </div>
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
                      onContextMenu={(event) =>
                        handleNotificationContextMenu(event, notification)
                      }
                      onTouchStart={(event) =>
                        handleNotificationTouchStart(event, notification)
                      }
                      onTouchMove={handleNotificationTouchMove}
                      onTouchEnd={handleNotificationTouchEnd}
                      className={`group relative w-full rounded-xl border p-3 text-left transition-all duration-200 hover:scale-[0.98] ${
                        notification.read
                          ? "border-transparent bg-transparent opacity-60 hover:bg-white/5 hover:opacity-100"
                          : "border-kipepeo-pink/20 bg-gradient-to-r from-kipepeo-pink/10 to-transparent hover:border-kipepeo-pink/40"
                      } ${
                        freshNotificationIds.has(notification.id)
                          ? "ring-2 ring-kipepeo-pink/60 animate-pulse"
                          : ""
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

      {notificationMenu && (
        <div className="fixed inset-0 z-50" onClick={closeNotificationMenu}>
          <div
            ref={notificationMenuRef}
            onClick={(event) => event.stopPropagation()}
            className="absolute w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#141414]/95 shadow-2xl backdrop-blur-xl"
            style={{ top: notificationMenu.y, left: notificationMenu.x }}
          >
            <div className="border-b border-white/5 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-300">
                Notification
              </p>
              <p className="mt-1 text-[10px] text-gray-500 line-clamp-1">
                {notificationMenu.notification.body}
              </p>
            </div>
            <div className="py-1">
              <button
                onClick={() =>
                  handleToggleNotificationRead(notificationMenu.notification)
                }
                disabled={isUpdating}
                className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-widest text-gray-200 hover:bg-white/5 disabled:opacity-60"
              >
                {notificationMenu.notification.read
                  ? "Mark Unread"
                  : "Mark Read"}
                <span className="text-[9px] text-gray-500">Status</span>
              </button>
              <button
                onClick={() =>
                  handleDeleteNotification(notificationMenu.notification)
                }
                disabled={isUpdating}
                className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-widest text-red-300 hover:bg-white/5 disabled:opacity-60"
              >
                Delete
                <span className="text-[9px] text-red-300">Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Conversation List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-2">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                {showArchived ? "Archived Chats" : "Recent Chats"}
              </h2>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-600">
                Hold or right click for options
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] p-1">
              <button
                onClick={() => setShowArchived(false)}
                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition ${
                  showArchived
                    ? "text-gray-500 hover:text-gray-300"
                    : "bg-white text-black"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setShowArchived(true)}
                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition ${
                  showArchived
                    ? "bg-white text-black"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Archived
              </button>
            </div>
          </div>

          {menuMessage && (
            <div className="px-2 text-[10px] text-emerald-300">
              {menuMessage}
            </div>
          )}
          {menuError && (
            <div className="px-2 text-[10px] text-red-400">{menuError}</div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-kipepeo-pink border-t-transparent"></div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-gray-600">
                Syncing...
              </p>
            </div>
          ) : visibleConversations.length > 0 ? (
            <div className="space-y-3">
              {visibleConversations.map((conversation) => {
                const members: string[] = conversation.members ?? [];
                const otherId = members.find((id) => id !== user.id);
                const profile =
                  conversation.memberProfiles?.[otherId ?? ""] ?? {};
                const isUnread = isConversationUnread(conversation);
                const isPinned = Boolean(conversation?.pinnedBy?.[user.id]);
                const isMuted = Boolean(conversation?.mutedBy?.[user.id]);
                const isArchived = Boolean(
                  conversation?.archivedBy?.[user.id],
                );

                return (
                  <div
                    key={conversation.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleConversationClick(conversation)}
                    onContextMenu={(event) =>
                      handleConversationContextMenu(event, conversation)
                    }
                    onTouchStart={(event) =>
                      handleTouchStart(event, conversation)
                    }
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        handleConversationClick(conversation);
                      }
                    }}
                    className={`group relative flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300 hover:scale-[1.01] hover:bg-white/5 active:scale-95 focus:outline-none focus:ring-2 focus:ring-kipepeo-pink/40 ${
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
                        <div className="flex items-center gap-2 min-w-0">
                          <h3
                            className={`truncate text-base font-black tracking-tight ${
                              isUnread
                                ? "text-white"
                                : "text-gray-300 group-hover:text-white"
                            }`}
                          >
                            {profile.nickname ?? "Unknown"}
                          </h3>
                          {isPinned && (
                            <span className="text-[9px] uppercase tracking-widest text-kipepeo-pink">
                              Pinned
                            </span>
                          )}
                          {isArchived && (
                            <span className="text-[9px] uppercase tracking-widest text-gray-500">
                              Archived
                            </span>
                          )}
                        </div>
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
                      {isMuted && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[9px] uppercase tracking-widest text-gray-600">
                          Muted
                        </span>
                      )}
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
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 grayscale">
                <span className="text-3xl">
                  {showArchived ? "🗂️" : "👻"}
                </span>
              </div>
              <h3 className="text-lg font-black text-gray-300">
                {showArchived ? "No archived chats" : "No chats yet"}
              </h3>
              <p className="max-w-[200px] text-xs text-gray-600 mt-1">
                {showArchived
                  ? "Archived chats will show up here."
                  : "Explore the discover feed to find someone to vibe with."}
              </p>
              {!showArchived && (
                <Link
                  to="/discover"
                  className="mt-6 rounded-xl bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-black transition-transform hover:scale-105 active:scale-95"
                >
                  Start Exploring
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <div className="fixed inset-0 z-50" onClick={closeContextMenu}>
          <div
            ref={menuRef}
            onClick={(event) => event.stopPropagation()}
            className="absolute w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#141414]/95 shadow-2xl backdrop-blur-xl"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <div className="border-b border-white/5 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-300">
                Chat Options
              </p>
              <p className="mt-1 text-[10px] text-gray-500">
                {contextMenu.conversation?.memberProfiles?.[
                  (contextMenu.conversation.members ?? []).find(
                    (id: string) => id !== user.id,
                  ) ?? ""
                ]?.nickname ?? "Conversation"}
              </p>
            </div>
            <div className="py-1">
              <button
                onClick={handleToggleMute}
                disabled={isUpdating}
                className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-widest text-gray-200 hover:bg-white/5 disabled:opacity-60"
              >
                {contextMenu.conversation?.mutedBy?.[user.id]
                  ? "Unmute Chat"
                  : "Mute Chat"}
                <span className="text-[9px] text-gray-500">Alerts</span>
              </button>
              <button
                onClick={handleTogglePin}
                disabled={isUpdating}
                className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-widest text-gray-200 hover:bg-white/5 disabled:opacity-60"
              >
                {contextMenu.conversation?.pinnedBy?.[user.id]
                  ? "Unpin Chat"
                  : "Pin Chat"}
                <span className="text-[9px] text-gray-500">Priority</span>
              </button>
              <button
                onClick={handleToggleArchive}
                disabled={isUpdating}
                className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-widest text-gray-200 hover:bg-white/5 disabled:opacity-60"
              >
                {contextMenu.conversation?.archivedBy?.[user.id]
                  ? "Unarchive"
                  : "Archive"}
                <span className="text-[9px] text-gray-500">Hide</span>
              </button>
              <button
                onClick={handleMarkUnread}
                disabled={isUpdating}
                className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-widest text-gray-200 hover:bg-white/5 disabled:opacity-60"
              >
                Mark Unread
                <span className="text-[9px] text-gray-500">Reminder</span>
              </button>
              <button
                onClick={handleDeleteConversation}
                disabled={isUpdating}
                className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-widest text-red-300 hover:bg-white/5 disabled:opacity-60"
              >
                Delete Chat
                <span className="text-[9px] text-red-300">For you</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatListPage;
