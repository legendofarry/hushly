
import React, { useEffect } from 'react';
import { Achievement } from '../types';

interface Props {
  achievement: Achievement;
  onClose: () => void;
}

const AchievementCelebration: React.FC<Props> = ({ achievement, onClose }) => {
  useEffect(() => {
    // Optional: play celebration sound
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const rarityColor = {
    common: 'text-slate-400',
    rare: 'text-sky-400',
    epic: 'text-purple-400',
    legendary: 'text-amber-400'
  }[achievement.rarity];

  const rarityBg = {
    common: 'bg-slate-500/10 border-slate-500/20',
    rare: 'bg-sky-500/10 border-sky-500/20',
    epic: 'bg-purple-500/10 border-purple-500/20',
    legendary: 'bg-amber-500/10 border-amber-500/20'
  }[achievement.rarity];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="w-full max-w-sm flex flex-col items-center animate-in zoom-in slide-in-from-bottom duration-500 delay-150">
        
        <div className="relative mb-12">
          {/* Confetti simulation circles */}
          <div className="absolute inset-0 flex items-center justify-center">
             {[...Array(12)].map((_, i) => (
               <div 
                key={i} 
                className="absolute w-2 h-2 rounded-full bg-rose-500 animate-ping" 
                style={{ 
                  transform: `rotate(${i * 30}deg) translateY(-80px)`,
                  animationDelay: `${i * 0.1}s`
                }}
               />
             ))}
          </div>

          <div className={`w-48 h-48 rounded-full border-4 border-white/10 p-4 flex items-center justify-center relative bg-gradient-to-b from-white/5 to-transparent`}>
             <span className="text-8xl animate-float">{achievement.icon}</span>
             <div className="absolute -top-4 bg-white text-slate-950 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">
               Unlocked!
             </div>
          </div>
        </div>

        <div className={`px-6 py-2 rounded-full border mb-4 text-[10px] font-black uppercase tracking-widest ${rarityBg} ${rarityColor}`}>
           {achievement.rarity} Achievement
        </div>

        <h2 className="text-4xl font-black text-white text-center mb-2 tracking-tighter">
          {achievement.title}
        </h2>
        
        <p className="text-slate-400 text-center mb-12">
          You just earned a permanent badge for your profile. Congratulations, rafiki!
        </p>

        <button 
          onClick={onClose}
          className="w-full bg-white text-slate-950 font-black py-4 rounded-2xl shadow-2xl transition-all active:scale-95"
        >
          Claim Reward
        </button>
      </div>
    </div>
  );
};

export default AchievementCelebration;
