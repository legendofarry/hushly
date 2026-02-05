import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserProfile, ChatMessage } from "../types";
import AppImage from "../components/AppImage";

interface Props {
  user: UserProfile;
}

const ChatDetailPage: React.FC<Props> = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      senderId: "target",
      text: "Mambo? Uko aje?",
      timestamp: Date.now() - 1000000,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (!inputValue.trim()) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderId: user.id,
      text: inputValue,
      timestamp: Date.now(),
    };
    setMessages([...messages, msg]);
    setInputValue("");
  };

  return (
    <div className="h-screen bg-kipepeo-dark flex flex-col">
      <header className="p-4 glass flex items-center z-10">
        <button onClick={() => navigate("/chats")} className="mr-4 text-2xl">
          ←
        </button>
        <div className="flex items-center">
          <AppImage
            src="https://picsum.photos/100/100?random=1"
            className="w-10 h-10 rounded-full mr-3 object-cover bg-white/5"
            alt="Chat profile"
            loading="eager"
            fetchPriority="high"
          />
          <div>
            <h3 className="font-bold">Wanjiru</h3>
            <span className="text-xs text-green-500 font-bold uppercase tracking-widest">
              • Online
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

