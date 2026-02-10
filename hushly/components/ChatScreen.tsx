
import React, { useState } from 'react';
import { User, Conversation, Profile } from '../types';
import { MOCK_PROFILES } from '../constants';

interface Props {
  user: User | null;
  onProfileClick: (profile: Profile) => void;
}

const ChatScreen: React.FC<Props> = ({ user, onProfileClick }) => {
  const [mockConvos] = useState<Conversation[]>([
    {
      id: 'c1',
      participant: MOCK_PROFILES[0],
      lastMessage: "Are we still on for coffee later? ☕",
      unreadCount: 1,
      timestamp: Date.now() - 3600000
    },
    {
      id: 'c2',
      participant: MOCK_PROFILES[1],
      lastMessage: "That sounds amazing!",
      unreadCount: 0,
      timestamp: Date.now() - 86400000
    }
  ]);

  return (
    <div className="min-h-full bg-slate-950 flex flex-col animate-in fade-in duration-500">
      <div className="px-6 pt-12 pb-4">
        <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-6">Messages</h2>
        
        {/* Active Matches Row */}
        <div className="mb-8">
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4">New Matches</p>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            <button className="flex flex-col items-center gap-2 group">
              <div className="w-16 h-16 rounded-full border-2 border-rose-500 border-dashed p-1 group-active:scale-95 transition-transform">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-rose-500">
                  <i className="fa-solid fa-plus"></i>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">Add</span>
            </button>
            {MOCK_PROFILES.slice(0, 4).map(profile => (
              <button 
                key={profile.id} 
                onClick={() => onProfileClick(profile)}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-16 h-16 rounded-full p-1 border-2 border-transparent group-active:scale-95 transition-all">
                  <img src={profile.photos[0]} className="w-full h-full rounded-full object-cover" alt="" />
                </div>
                <span className="text-[10px] text-white font-bold truncate w-16 text-center">{profile.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="space-y-2">
          {mockConvos.map(convo => (
            <button 
              key={convo.id}
              onClick={() => onProfileClick(convo.participant)}
              className="w-full flex items-center gap-4 p-4 bg-slate-900/40 rounded-3xl border border-white/5 active:scale-[0.98] transition-all"
            >
              <div className="relative">
                <img src={convo.participant.photos[0]} className="w-14 h-14 rounded-2xl object-cover" alt="" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950"></div>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-white font-black text-sm">{convo.participant.name}</h4>
                  <span className="text-[8px] text-slate-500 font-black uppercase">1h ago</span>
                </div>
                <p className={`text-xs truncate ${convo.unreadCount > 0 ? 'text-white font-bold' : 'text-slate-500'}`}>
                  {convo.lastMessage}
                </p>
              </div>
              {convo.unreadCount > 0 && (
                <div className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-black text-white">
                  {convo.unreadCount}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
