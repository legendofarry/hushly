import React from 'react';

interface Props {
  onJoin: () => void;
  onLogin: () => void;
}

const LandingScreen: React.FC<Props> = ({ onJoin, onLogin }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-gradient-to-br from-rose-600/30 via-transparent to-amber-500/20 blur-[100px] pointer-events-none"></div>
      
      {/* Decorative Hearts */}
      <div className="absolute top-[15%] left-[10%] opacity-20 animate-float">
        <i className="fa-solid fa-heart text-6xl text-rose-500/40"></i>
      </div>
      <div className="absolute bottom-[25%] right-[10%] opacity-10 animate-float" style={{ animationDelay: '1s' }}>
        <i className="fa-solid fa-heart text-8xl text-rose-400/30 rotate-12"></i>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative z-10 pt-20">
        <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl rotate-3">
          <i className="fa-solid fa-heart text-rose-500 text-5xl"></i>
        </div>
        
        <h1 className="text-6xl font-black text-white italic tracking-tighter mb-4 leading-none uppercase">
          HUSHLY
        </h1>
        <p className="text-lg text-slate-300 font-medium mb-12 max-w-[280px] leading-relaxed">
          Authentic Kenyan connections, <br/>
          <span className="text-white">right at your fingertips.</span>
        </p>
      </div>

      <div className="px-8 pb-16 relative z-10 w-full max-w-sm mx-auto space-y-4">
        <button 
          onClick={onJoin}
          className="w-full bg-white text-slate-950 font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-sm"
        >
          Create Account
        </button>
        <button 
          onClick={onLogin}
          className="w-full bg-slate-900/60 backdrop-blur-md border border-white/10 text-white font-black py-5 rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-sm"
        >
          Sign In
        </button>
        
        <div className="pt-6 text-center">
          <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-tighter">
            By tapping Create Account or Sign In, you agree to our <br/>
            <span className="underline text-slate-400">Terms</span> and <span className="underline text-slate-400">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingScreen;