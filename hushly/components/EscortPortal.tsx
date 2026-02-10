
import React, { useState, useEffect } from 'react';
import { User, Profile } from '../types';
import { MOCK_PROFILES } from '../constants';

interface Props {
  user: User | null;
  onUpgrade: () => void;
  onExit: () => void;
}

const EscortPortal: React.FC<Props> = ({ user, onUpgrade, onExit }) => {
  const [isDiving, setIsDiving] = useState(true);
  const [tab, setTab] = useState<'browse' | 'list'>('browse');
  const [showPayment, setShowPayment] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  
  const escorts = MOCK_PROFILES.filter(p => p.isEscort);

  useEffect(() => {
    const timer = setTimeout(() => setIsDiving(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleListSelf = () => {
    if (user?.isPaid) {
      alert("Opening listing editor...");
    } else {
      setShowPayment(true);
    }
  };

  if (isDiving) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent"></div>
        <div className="relative">
          <div className="w-32 h-32 border-4 border-amber-400 rounded-full animate-[ping_2s_infinite] opacity-50"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <i className="fa-solid fa-gem text-5xl text-amber-400 animate-pulse"></i>
          </div>
        </div>
        <h2 className="mt-8 text-2xl font-black text-amber-400 tracking-[0.3em] uppercase animate-pulse">Entering Elite Portal</h2>
        <div className="mt-4 flex gap-2">
           {[...Array(3)].map((_, i) => (
             <div key={i} className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}></div>
           ))}
        </div>
      </div>
    );
  }

  if (showPayment) {
    return (
      <div className="fixed inset-0 z-[110] p-6 flex flex-col items-center justify-center bg-slate-950 animate-in fade-in zoom-in duration-300">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(251,191,36,0.5)]">
          <i className="fa-solid fa-crown text-white text-5xl"></i>
        </div>
        <h2 className="text-3xl font-black text-white text-center mb-2 tracking-tighter">PREMIUM REQUIRED</h2>
        <p className="text-slate-400 text-center mb-8 px-4 font-medium">Verified membership is mandatory for elite listings to ensure the security of the Safari.</p>
        
        <div className="w-full space-y-4 mb-8">
           <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-amber-400/50 flex items-center justify-between group active:scale-95 transition-all">
              <div>
                <p className="text-white font-black text-lg">1 Month Gold</p>
                <p className="text-slate-500 text-xs font-bold uppercase">Standard Visibility</p>
              </div>
              <p className="text-amber-400 font-black text-xl">KSh 1,500</p>
           </div>
           <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-800 flex items-center justify-between active:scale-95 transition-all">
              <div>
                <p className="text-white/60 font-black text-lg">3 Months Gold</p>
                <p className="text-slate-500 text-xs font-bold uppercase">Priority Placement</p>
              </div>
              <p className="text-white/40 font-black text-xl">KSh 3,500</p>
           </div>
        </div>

        <button 
          onClick={() => {
            onUpgrade();
            setShowPayment(false);
          }}
          className="w-full bg-amber-500 hover:bg-amber-400 text-white font-black py-5 rounded-3xl shadow-[0_10px_30px_rgba(245,158,11,0.3)] transition-all active:scale-95 text-lg uppercase tracking-widest"
        >
          Activate with M-Pesa
        </button>
        <button onClick={() => setShowPayment(false)} className="mt-6 text-slate-500 font-black uppercase tracking-widest text-xs">Return to Shadows</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-950 overflow-hidden font-['Outfit']">
      {/* Background Ambience */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 blur-[120px] rounded-full"></div>

      {/* Dynamic Header */}
      <div className="relative px-6 pt-12 pb-6 flex items-center justify-between z-10">
        <div>
          <h2 className="text-xs font-black text-amber-500 uppercase tracking-[0.4em] mb-1">Luxury Companion</h2>
          <h1 className="text-3xl font-black text-white italic tracking-tighter">Elite <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-600">Safari</span></h1>
        </div>
        <div className="flex bg-slate-900/80 backdrop-blur-xl p-1 rounded-2xl border border-white/5 shadow-2xl">
          <button 
            onClick={() => setTab('browse')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${tab === 'browse' ? 'bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'text-slate-500'}`}
          >
            DIVE
          </button>
          <button 
            onClick={() => setTab('list')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${tab === 'list' ? 'bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'text-slate-500'}`}
          >
            LIST
          </button>
        </div>
      </div>

      {tab === 'browse' ? (
        <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-24 space-y-8 scroll-smooth">
          {escorts.map((escort, idx) => (
            <div 
              key={escort.id} 
              className="relative aspect-[4/5] rounded-[3rem] overflow-hidden group shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5"
            >
              <img src={escort.photos[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]" alt="" />
              
              {/* Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
              
              {/* Verified Badge */}
              <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse shadow-[0_0_10px_#fbbf24]"></div>
                <span className="text-[10px] text-white font-black uppercase tracking-widest">Verified Elite</span>
              </div>

              {/* Distance Badge */}
              <div className="absolute top-6 right-6 bg-amber-500/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/30">
                 <span className="text-[10px] text-amber-500 font-black uppercase">{escort.distance}</span>
              </div>

              {/* Content Box */}
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <h3 className="text-4xl font-black text-white tracking-tighter mb-2">{escort.name}, {escort.age}</h3>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {escort.services?.map(s => (
                    <span key={s} className="bg-white/10 backdrop-blur-md text-[9px] px-3 py-1 rounded-full text-white font-bold uppercase tracking-widest border border-white/5">
                      {s}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3">
                  <a 
                    href={`tel:${escort.phoneNumber}`}
                    className="flex-1 bg-white hover:bg-amber-50 text-slate-950 font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_15px_30px_rgba(255,255,255,0.1)]"
                  >
                    <i className="fa-solid fa-phone-volume text-lg"></i>
                    <span className="uppercase tracking-[0.2em] text-xs">Direct Call</span>
                  </a>
                  <button className="w-16 h-16 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[2rem] flex items-center justify-center text-white active:scale-90 transition-all">
                    <i className="fa-solid fa-comment-dots text-xl"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* End of list spacer */}
          <div className="h-20 flex items-center justify-center">
             <div className="w-1 h-1 bg-amber-500/50 rounded-full mx-1"></div>
             <div className="w-1 h-1 bg-amber-500/50 rounded-full mx-1"></div>
             <div className="w-1 h-1 bg-amber-500/50 rounded-full mx-1"></div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 relative">
          <div className="relative mb-12">
            <div className="w-40 h-40 bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-amber-500/30 flex items-center justify-center relative overflow-hidden group">
               <div className="absolute inset-0 bg-amber-500/5 group-hover:scale-150 transition-transform duration-[3s]"></div>
               <i className="fa-solid fa-user-tie text-slate-700 text-6xl group-hover:text-amber-500/50 transition-colors"></i>
            </div>
            <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-2xl">
               <i className="fa-solid fa-plus text-white text-xl"></i>
            </div>
          </div>
          
          <h3 className="text-3xl font-black text-white mb-4 tracking-tighter">JOIN THE ROSTER</h3>
          <p className="text-slate-500 font-medium mb-12 max-w-xs leading-relaxed">
            Market your exclusivity to thousands of premium clients in <span className="text-white">Nairobi, Mombasa, and beyond.</span>
          </p>
          
          <div className="grid grid-cols-2 gap-4 w-full mb-12">
             <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5">
                <i className="fa-solid fa-shield-heart text-amber-500 text-2xl mb-2"></i>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Full Privacy</p>
             </div>
             <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5">
                <i className="fa-solid fa-bolt text-rose-500 text-2xl mb-2"></i>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Instant Reach</p>
             </div>
          </div>

          <button 
            onClick={handleListSelf}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white py-6 rounded-[2.5rem] font-black shadow-[0_20px_40px_rgba(245,158,11,0.3)] text-lg uppercase tracking-[0.3em] active:scale-95 transition-all"
          >
            Create Listing
          </button>
        </div>
      )}

      {/* Close Portal Button (Custom UI) */}
      <button 
        onClick={onExit}
        className="absolute top-14 right-6 w-12 h-12 bg-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/10 active:scale-90 transition-all hover:bg-white/10 group z-50 shadow-2xl"
      >
        <i className="fa-solid fa-door-open group-hover:scale-110 transition-transform"></i>
        <span className="absolute -bottom-6 text-[8px] font-black text-white uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Exit Portal</span>
      </button>
    </div>
  );
};

export default EscortPortal;
