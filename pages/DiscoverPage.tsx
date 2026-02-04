
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserProfile, IntentType } from '../types';

const MOCK_PROFILES: UserProfile[] = [
  {
    id: '1',
    realName: 'Private',
    nickname: 'Sugar_Mama_254',
    ageRange: '36-45',
    bio: 'Looking for a consistent companion for luxury weekend travels. Be respectful and mature.',
    area: 'Nairobi - Westlands',
    intents: [IntentType.MUTUAL, IntentType.HIRING],
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sugar',
    isAnonymous: true,
    isOnline: true
  },
  {
    id: '2',
    realName: 'Private',
    nickname: 'Chill_Bazenga',
    ageRange: '23-27',
    bio: 'Just looking for chill vibes, music, and good conversation. Maybe drinks.',
    area: 'Nairobi - Kilimani',
    intents: [IntentType.CHILL, IntentType.FRIENDS],
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chill',
    isAnonymous: true,
    isOnline: true
  }
];

const DiscoverPage: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [activeIntent, setActiveIntent] = useState<IntentType>(IntentType.CASUAL);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [view, setView] = useState<'discover' | 'plans' | 'portal'>('discover');
  
  const current = MOCK_PROFILES[currentIndex];

  if (view === 'portal') {
    return (
      <div className="h-screen bg-red-950/20 flex flex-col p-8 items-center justify-center text-center font-sans animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center text-4xl mb-6 shadow-[0_0_50px_rgba(220,38,38,0.5)] border border-red-500/50">🌹</div>
        <h1 className="text-4xl font-black text-red-500 uppercase tracking-tighter mb-2">Escort Portal</h1>
        <p className="text-gray-400 text-sm max-w-xs mb-10 leading-relaxed italic">You are entering a high-security, paid-introductions only zone. Strict anonymity is enforced here.</p>
        <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
           <button className="py-4 bg-red-600 text-white font-black rounded-xl shadow-lg uppercase tracking-widest text-xs">Verify & Enter Portal</button>
           <button onClick={() => setView('discover')} className="py-4 glass text-white/50 font-bold rounded-xl uppercase tracking-widest text-xs">Exit to Kipepeo</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-kipepeo-dark flex flex-col font-sans overflow-hidden">
      <header className="p-6 pb-2 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
             <h1 className="text-2xl font-black text-gradient uppercase tracking-tighter">Kipepeo</h1>
             <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setView('portal')}
              className="w-10 h-10 bg-red-600/10 border border-red-500/20 rounded-full flex items-center justify-center text-lg shadow-[0_0_15px_rgba(220,38,38,0.3)] animate-pulse"
            >
              🌹
            </button>
            <Link to="/chats" className="w-10 h-10 glass rounded-full flex items-center justify-center text-lg active:scale-90 transition-transform">💬</Link>
            <Link to="/profile" className="w-10 h-10 glass rounded-full flex items-center justify-center overflow-hidden border border-white/10 active:scale-90 transition-transform">
               <img src={user.photoUrl} className="w-full h-full object-cover" alt="Profile" />
            </Link>
          </div>
        </div>
        
        <div className="flex space-x-4 border-b border-white/5 pb-3 overflow-x-auto no-scrollbar">
           <button onClick={() => setView('discover')} className={`text-[10px] font-black uppercase tracking-widest ${view === 'discover' ? 'text-kipepeo-pink border-b-2 border-kipepeo-pink pb-2' : 'text-gray-600'}`}>Discovery</button>
           <button onClick={() => setView('plans')} className={`text-[10px] font-black uppercase tracking-widest ${view === 'plans' ? 'text-kipepeo-pink border-b-2 border-kipepeo-pink pb-2' : 'text-gray-600'}`}>Weekend Plans</button>
        </div>

        {view === 'discover' && (
          <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
            {Object.values(IntentType).map(intent => (
              <button 
                key={intent} 
                onClick={() => setActiveIntent(intent)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all flex-shrink-0 border ${activeIntent === intent ? 'bg-kipepeo-pink border-kipepeo-pink text-white shadow-lg shadow-kipepeo-pink/40' : 'bg-white/5 border-white/5 text-gray-500'}`}
              >
                {intent}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 px-4 relative flex flex-col overflow-hidden">
        {view === 'discover' ? (
          <div className="flex-1 flex flex-col">
            {current ? (
              <div className="flex-1 rounded-[2.5rem] overflow-hidden relative glass border-white/5 shadow-2xl animate-in zoom-in-95 group mb-4">
                <img src={current.photoUrl} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700" alt="Selfie" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>
                
                <div className="absolute top-6 left-6 flex space-x-2">
                  <div className="bg-green-500/80 backdrop-blur-md text-[8px] font-black px-2 py-1 rounded text-white uppercase tracking-widest">Live Selfie Verified</div>
                  {current.isOnline && <div className="bg-white/10 backdrop-blur-md text-[8px] font-black px-2 py-1 rounded text-white uppercase tracking-widest">Active Now</div>}
                </div>

                <div className="absolute bottom-0 left-0 p-8 w-full">
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <h2 className="text-3xl font-black mb-1 leading-none tracking-tighter uppercase">{current.nickname}</h2>
                      <div className="flex items-center space-x-2 text-xs font-bold text-gray-400">
                        <span>{current.ageRange} Yrs</span>
                        <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                        <span>{current.area}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {current.intents.map(i => (
                      <span key={i} className="text-[8px] font-black uppercase bg-kipepeo-purple/30 text-kipepeo-purple px-2 py-1 rounded border border-kipepeo-purple/20">{i}</span>
                    ))}
                  </div>
                  
                  <p className="text-sm text-gray-300 mb-8 line-clamp-3 italic font-medium leading-relaxed max-w-xs">"{current.bio}"</p>
                  
                  <div className="flex space-x-4">
                     <button onClick={() => setCurrentIndex((currentIndex + 1) % MOCK_PROFILES.length)} className="flex-1 py-4 glass rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform">Skip</button>
                     <button onClick={() => setCurrentIndex((currentIndex + 1) % MOCK_PROFILES.length)} className="flex-[2] py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform shadow-xl">Private Chat</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                <span className="text-6xl mb-4">🌙</span>
                <p className="font-black uppercase tracking-widest text-xs">Waiting for plots...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar pb-10">
            <div className="glass p-6 rounded-3xl border border-kipepeo-pink/20 bg-kipepeo-pink/5">
              <h3 className="text-xs font-black uppercase text-kipepeo-pink mb-2">Post a Weekend Plot</h3>
              <p className="text-[10px] text-gray-500 mb-4">What's the vibe? Music, drinks, or road trip?</p>
              <button className="w-full py-3 bg-white text-black font-black rounded-xl text-[10px] uppercase tracking-widest">Create New Plan</button>
            </div>
            
            <div className="space-y-3">
               {[1, 2, 3].map(i => (
                 <div key={i} className="glass p-5 rounded-2xl border border-white/5 active:scale-98 transition-transform">
                    <div className="flex justify-between items-start mb-2">
                       <h4 className="font-black text-sm uppercase tracking-tight">Friday Chill & Amapiano</h4>
                       <span className="text-[8px] font-black bg-white/5 px-2 py-1 rounded">2km away</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-4 leading-relaxed line-clamp-2">"Got some rare vinyls and drinks at my place in Kilimani. Looking for 2 chill people to join the vibe."</p>
                    <div className="flex items-center justify-between">
                       <div className="flex -space-x-2">
                          {[1,2].map(x => <div key={x} className="w-6 h-6 rounded-full border border-kipepeo-dark bg-gray-800 flex items-center justify-center text-[8px]">👤</div>)}
                          <div className="w-6 h-6 rounded-full border border-kipepeo-dark bg-kipepeo-pink text-white flex items-center justify-center text-[8px] font-bold">+2</div>
                       </div>
                       <button className="px-4 py-2 bg-kipepeo-purple text-white text-[8px] font-black rounded-lg uppercase tracking-widest">Request Join</button>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoverPage;
