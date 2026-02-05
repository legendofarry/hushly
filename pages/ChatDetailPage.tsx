import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserProfile } from "../types";
import AppImage from "../components/AppImage";
import {
  listenToConversation,
  listenToMessages,
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
    <div className="h-screen bg-kipepeo-dark flex flex-col">
      <header className="p-4 glass flex items-center z-10">
        <button onClick={() => navigate("/chats")} className="mr-4 text-2xl">
          ←
        </button>
        <div className="flex items-center">
          <AppImage
            src={otherParticipant?.photoUrl ?? user.photoUrl}
            className="w-10 h-10 rounded-full mr-3 object-cover bg-white/5"
            alt={otherParticipant?.nickname ?? "Chat profile"}
            loading="eager"
            fetchPriority="high"
          />
          <div>
            <h3 className="font-bold">
              {otherParticipant?.nickname ?? "Chat"}
            </h3>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">
              Direct chat
            </span>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.senderId === user.id ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-base ${m.senderId === user.id ? "bg-kipepeo-orange text-white rounded-tr-none" : "glass rounded-tl-none"}`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-kipepeo-dark border-t border-white/10 pb-20">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type your vibe..."
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus:outline-none"
          />
          <button
            onClick={sendMessage}
            className="w-12 h-12 bg-kipepeo-orange rounded-full flex items-center justify-center shadow-lg shadow-kipepeo-orange/20"
          >
            ✈️
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatDetailPage;

