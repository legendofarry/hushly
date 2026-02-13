import React from "react";

const SplashScreen: React.FC = () => {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 gradient-primary">
      <div className="relative">
        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center animate-bounce shadow-2xl">
          <i className="fa-solid fa-heart text-rose-500 text-6xl"></i>
        </div>
      </div>
      <h1 className="mt-2 itext-5xl font-bold text-white tracking-tighter">
        Hushly
      </h1>
      <p className="mt-2 text-white/80 font-medium">Kenyan Love, Redefined.</p>

      <div className="absolute bottom-10 flex flex-col items-center">
        <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white w-1/2 animate-[loading_2s_ease-in-out_infinite]"></div>
        </div>
        <p className="mt-2 text-xs text-white/60">Starting Safari...</p>
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
