
import React from "react";
import { Link } from "react-router-dom";
import { UserProfile } from "../types";
import AppImage from "../components/AppImage";

interface Props {
  user: UserProfile;
}

const ChatListPage: React.FC<Props> = ({ user }) => {
  const MOCK_CHATS = [
    { id: '1', name: 'Emerald_Nights', lastMsg: 'Sawa, tutaonana hapo Sarit.', time: '2m', avatar: 'https://picsum.photos/100/100?random=1' },
    { id: '2', name: 'The_Fixer', lastMsg: 'I have an event in Kiambu', time: '1h', avatar: 'https://picsum.photos/100/100?random=2' },
  ];

  return (
    <div className="min-h-screen bg-kipepeo-dark flex flex-col font-sans">
      <header className="p-6 border-b border-white/5 flex justify-between items-center bg-kipepeo-dark sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <Link to="/discover" className="text-2xl active:scale-90 transition-transform">←</Link>
          <h1 className="text-2xl font-black">UJUMBE</h1>
        </div>
        <Link to="/profile" className="w-10 h-10 glass rounded-full overflow-hidden border border-white/10 active:scale-90 transition-transform">
          <AppImage
            src={user.photoUrl}
            className="w-full h-full object-cover bg-white/5"
            alt="Profile"
            loading="eager"
            fetchPriority="high"
          />
        </Link>
      </header>
      
      <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
        <div className="mb-10">
          <h2 className="text-xs font-black text-gray-600 uppercase tracking-[0.3em] mb-4">New Plots</h2>
          <div className="flex space-x-4 overflow-x-auto pb-4 no-scrollbar">
            <div className="flex-shrink-0 w-16 h-16 rounded-full border-2 border-dashed border-kipepeo-pink flex items-center justify-center bg-kipepeo-pink/5">
              <span className="text-kipepeo-pink text-xl font-black">3</span>
            </div>
            {[3, 4, 5].map((i) => (
              <div key={i} className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden border-2 border-kipepeo-orange shadow-lg shadow-kipepeo-orange/20">
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
          <h2 className="text-xs font-black text-gray-600 uppercase tracking-[0.3em] mb-4">Conversations</h2>
          {MOCK_CHATS.length > 0 ? MOCK_CHATS.map((chat) => (
            <Link to={`/chats/${chat.id}`} key={chat.id} className="flex items-center p-4 glass rounded-2xl transition-all active:scale-95 border border-white/5 hover:bg-white/5">
              <AppImage
                src={chat.avatar}
                className="w-14 h-14 rounded-full mr-4 object-cover border-2 border-kipepeo-purple bg-white/5"
                alt="Chat"
              />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-black text-lg">{chat.name}</h3>
                  <span className="text-xs text-gray-500 font-bold uppercase">{chat.time}</span>
                </div>
                <p className="text-base text-gray-500 truncate font-medium">{chat.lastMsg}</p>
              </div>
            </Link>
          )) : (
            <div className="text-center py-20 opacity-20 grayscale">
              <p className="font-black uppercase tracking-widest text-sm">No chats yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatListPage;

