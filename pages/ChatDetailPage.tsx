import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserProfile } from "../types";
import AppImage from "../components/AppImage";
import {
  listenToConversation,
  listenToMessages,
  markConversationRead,
  sendMessage as sendChatMessage,
} from "../services/chatService";
import { markNotificationsReadByConversation } from "../services/notificationService";

interface Props {
  user: UserProfile;
}

const ChatDetailPage: React.FC<Props> = ({ user }) => {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = listenToConversation(conversationId, (data) => {
      setConversation(data);
    });
    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = listenToMessages(conversationId, (items) => {
      setMessages(items);
    });
    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    void markConversationRead(conversationId, user.id);
  }, [conversationId, user.id, messages.length]);

  useEffect(() => {
    if (!conversationId) return;
    void markNotificationsReadByConversation(user.id, conversationId);
  }, [conversationId, user.id]);

  const otherParticipant = useMemo(() => {
    const members: string[] = conversation?.members ?? [];
    const otherId = members.find((member) => member !== user.id);
    if (!otherId) return null;
    const profile = conversation?.memberProfiles?.[otherId];
    return {
      id: otherId,
      nickname: profile?.nickname ?? "Chat",
      photoUrl: profile?.photoUrl ?? user.photoUrl,
    };
  }, [conversation, user.id, user.photoUrl]);

  const sendMessage = async () => {
    if (!inputValue.trim() || !conversationId || !otherParticipant) return;
    try {
      await sendChatMessage({
        conversationId,
        sender: user,
        recipientId: otherParticipant.id,
        text: inputValue.trim(),
        recipientNickname: otherParticipant.nickname,
      });
      setInputValue("");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="relative flex h-screen flex-col bg-[#121212] font-sans selection:bg-kipepeo-pink/30">
      {/* Ambient Background Effects */}
      <div className="fixed left-0 top-0 h-full w-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-900/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-kipepeo-pink/5 rounded-full blur-[100px]"></div>
      </div>

      {/* --- Header --- */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-[#121212]/80 px-4 py-3 backdrop-blur-xl transition-all">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/chats")}
            className="group flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10 active:scale-90"
          >
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
              className="text-gray-400 group-hover:text-white"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div className="relative">
              <AppImage
                src={otherParticipant?.photoUrl ?? user.photoUrl}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-transparent transition-all hover:ring-kipepeo-pink/50"
                alt={otherParticipant?.nickname ?? "Chat profile"}
                loading="eager"
                fetchPriority="high"
              />
              {/* Online Status Dot (Visual Polish) */}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#121212] bg-green-500"></span>
            </div>

            <div className="flex flex-col">
              <h3 className="text-sm font-black tracking-wide text-white">
                {otherParticipant?.nickname ?? "Chat"}
              </h3>
              <span className="text-[9px] font-bold uppercase tracking-widest text-kipepeo-pink">
                Online Now
              </span>
            </div>
          </div>
        </div>

        {/* Option Menu Placeholder */}
        <button className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-white/5 hover:text-white">
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
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </header>

      {/* --- Messages Area --- */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-4 opacity-50">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5 text-4xl grayscale">
              👋
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Start the vibe
            </p>
          </div>
        ) : (
          messages.map((m, index) => {
            const isMe = m.senderId === user.id;
            const isLast = index === messages.length - 1;

            return (
              <div
                key={m.id}
                className={`flex w-full ${isMe ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`flex max-w-[75%] flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`relative px-5 py-3 text-sm leading-relaxed shadow-lg ${
                      isMe
                        ? "rounded-2xl rounded-tr-sm bg-gradient-to-br from-kipepeo-pink to-purple-600 text-white"
                        : "rounded-2xl rounded-tl-sm border border-white/5 bg-[#1E1E1E] text-gray-200"
                    }`}
                  >
                    {m.text}
                  </div>
                  {/* Timestamp / Status (Visual Polish) */}
                  <span className="mt-1 text-[9px] font-medium text-gray-600">
                    {isMe && isLast ? "Delivered" : ""}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- Input Area --- */}
      <div className="sticky bottom-0 z-20 w-full bg-[#121212] px-4 pb-6 pt-2">
        {/* Gradient Line Top */}
        <div className="absolute left-0 top-0 h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <div className="flex items-end gap-2 rounded-3xl bg-[#1E1E1E] p-2 ring-1 ring-white/5 transition-all focus-within:ring-kipepeo-pink/50">
          {/* Attachment Button (Visual) */}
          <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
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
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type your vibe..."
            className="max-h-32 min-h-[44px] flex-1 bg-transparent py-3 text-sm text-white placeholder-gray-500 focus:outline-none"
          />

          <button
            onClick={sendMessage}
            disabled={!inputValue.trim()}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-lg transition-all active:scale-95 ${
              inputValue.trim()
                ? "bg-gradient-to-r from-kipepeo-pink to-purple-600 text-white hover:shadow-kipepeo-pink/25"
                : "bg-white/5 text-gray-500 cursor-not-allowed"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={inputValue.trim() ? "ml-0.5" : ""}
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>

        {/* Mobile Safe Area Spacer if needed, or keeping space for bottom nav */}
        <div className="h-4"></div>
      </div>
    </div>
  );
};

export default ChatDetailPage;
