
import React, { useState, useEffect, useMemo } from 'react';
import { User, Profile, Filters } from '../types';
import { MOCK_PROFILES } from '../constants';

interface Props {
  user: User | null;
  filters: Filters;
  onSwipe: (dir: 'left' | 'right') => void;
  onProfileClick: (profile: Profile) => void;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'dotlottie-wc': any;
    }
  }
}

const DotLottieWC = 'dotlottie-wc' as any;

const DatingSwiper: React.FC<Props> = ({ user, filters, onSwipe, onProfileClick }) => {
  const [index, setIndex] = useState(0);
  const [showStarBurst, setShowStarBurst] = useState(false);
  const [burstKey, setBurstKey] = useState(0); 
  const [countdown, setCountdown] = useState('');

  const filteredProfiles = useMemo(() => {
    return MOCK_PROFILES.filter(p => {
      if (p.isEscort) return false;
      if (filters.gender !== 'Everyone' && p.gender !== filters.gender) return false;
      if (filters.location.length > 0 && !filters.location.includes(p.location)) return false;
      if (p.age < filters.ageRange[0] || p.age > filters.ageRange[1]) return false;
      return true;
    });
  }, [filters]);

  const currentProfile = filteredProfiles[index % filteredProfiles.length];

  useEffect(() => {
    if (!user || user.dailySwipesRemaining > 0) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const nextDrop = user.lastDropAt + (24 * 60 * 60 * 1000);
      const diff = nextDrop - now;

      if (diff <= 0) {
        setCountdown('00:00:00');
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [user]);

  const handleAction = (dir: 'left' | 'right') => {
    if (!user || user.dailySwipesRemaining <= 0) return;
    onSwipe(dir);
    setIndex(prev => prev + 1);
  };

  const handleStarAction = () => {
    if (!user || user.dailySwipesRemaining <= 0) return;
    
    // Performance optimization: reduce particle count to 50 for smoother rendering
    setBurstKey(prev => prev + 1);
    setShowStarBurst(true);
    
    // Snappier transition: change profile sooner
    setTimeout(() => {
      onSwipe('right');
      setIndex(prev => prev + 1);
    }, 400);

    // Clean up animation state
    setTimeout(() => {
      setShowStarBurst(false);
    }, 2500);
  };

  if (!user) return null;

  if (user.dailySwipesRemaining <= 0 || filteredProfiles.length === 0) {
    return (
      <div className="h-full relative flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
        <div className="relative z-10 w-fit h-fit flex items-center justify-center mb-2 overflow-visible">
          <DotLottieWC
            src="https://lottie.host/ef4d935d-c6d1-472a-9a29-ad403e4ed20b/439t582a3D.lottie"
            style={{ width: '100px', height: '100px' }}
            autoplay
            loop
          ></DotLottieWC>
        </div>
        
        <h2 className="relative z-10 text-3xl font-black text-white mb-2 tracking-tighter">
          {filteredProfiles.length === 0 ? 'No Profiles Match Filters' : 'No Matches Left Today'}
        </h2>
        <p className="relative z-10 text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed font-medium">
          {filteredProfiles.length === 0 
            ? 'Try adjusting your discovery settings to see more people from the tribe.' 
            : 'Check back later as your drop refreshes.'}
        </p>
        
        {user.dailySwipesRemaining <= 0 && (
          <div className="relative z-10 bg-slate-900/40 backdrop-blur-md px-8 py-6 rounded-3xl border border-white/5 shadow-2xl mb-10 w-full max-w-xs mx-auto">
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Refueling Safari</p>
             <p className="text-4xl font-black text-rose-500 font-mono tracking-tighter">{countdown || '24:00:00'}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col h-full animate-in fade-in zoom-in duration-300 relative">
      {showStarBurst && (
        <div key={burstKey} className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center overflow-hidden">
          {/* Reduced particle count to 60 for better mobile performance */}
          {[...Array(60)].map((_, i) => {
            const isStar = i % 2 === 0;
            const angle = Math.random() * 360;
            const distance = 80 + Math.random() * 300; 
            const tx = Math.cos(angle * Math.PI / 180) * distance;
            const ty = Math.sin(angle * Math.PI / 180) * distance;
            const size = 12 + Math.random() * 14;
            const delay = Math.random() * 0.2;
            const duration = 1.2 + Math.random() * 0.8;
            const rotation = Math.random() * 360;
            
            return (
              <div
                key={i}
                className={`absolute ${isStar ? 'text-amber-400' : 'text-rose-500'} animate-confetti-fly opacity-0`}
                style={{
                  '--tx': `${tx}px`,
                  '--ty': `${ty}px`,
                  '--rot': `${rotation}deg`,
                  '--dur': `${duration}s`,
                  fontSize: `${size}px`,
                  animationDelay: `${delay}s`,
                  willChange: 'transform, opacity'
                } as React.CSSProperties}
              >
                <i className={`fa-solid ${isStar ? 'fa-star' : 'fa-heart'}`}></i>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
            <i className="fa-solid fa-fire text-white text-sm"></i>
          </div>
          <span className="font-bold text-lg">Discovery</span>
        </div>
        <div className="bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
          <span className="text-xs font-bold text-rose-500">{user.dailySwipesRemaining}</span>
          <span className="text-[10px] text-slate-500 ml-1 uppercase">Drop Left</span>
        </div>
      </div>

      {currentProfile && (
        <div className="relative flex-1 group z-10" onClick={() => onProfileClick(currentProfile)}>
          <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl bg-slate-900 border border-white/5">
            <img 
              src={currentProfile.photos[0]} 
              alt={currentProfile.name} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            

            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex items-center gap-2 mb-1 cursor-pointer">
                <h3 className="text-3xl font-bold text-white tracking-tighter">{currentProfile.name}, {currentProfile.age}</h3>
                <i className="fa-solid fa-circle-check text-sky-400"></i>
              </div>
              <p className="text-slate-300 text-sm mb-2">
                <i className="fa-solid fa-location-dot mr-1 text-rose-500"></i> {currentProfile.location} • {currentProfile.distance}
              </p>
              <p className="text-white/90 text-sm line-clamp-2 font-medium italic">"{currentProfile.bio}"</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-6 mt-6 mb-8 relative z-20">
        <button 
          onClick={() => handleAction('left')}
          className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-rose-500 text-2xl shadow-xl transition-all active:scale-75 hover:bg-slate-800"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
        <button 
          onClick={handleStarAction}
          className="w-14 h-14 bg-slate-900 border border-amber-500/50 rounded-full flex items-center justify-center text-amber-400 text-xl shadow-lg transition-all active:scale-75 hover:bg-amber-400 hover:text-white"
        >
          <i className="fa-solid fa-star"></i>
        </button>
        <button 
          onClick={() => handleAction('right')}
          className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-emerald-500 text-2xl shadow-xl transition-all active:scale-75 hover:bg-slate-800"
        >
          <i className="fa-solid fa-heart"></i>
        </button>
      </div>

      <style>{`
        @keyframes confetti-fly {
          0% { transform: translate(0, 0) scale(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; transform: scale(1); }
          100% { transform: translate(var(--tx), var(--ty)) scale(1.5) rotate(var(--rot)); opacity: 0; }
        }
        .animate-confetti-fly {
          animation: confetti-fly var(--dur) cubic-bezier(0.1, 0.5, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default DatingSwiper;
