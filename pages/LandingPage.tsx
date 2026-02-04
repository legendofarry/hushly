import React from "react";
import { useNavigate } from "react-router-dom";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Create an array for the hearts
  const hearts = Array.from({ length: 50 });

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-kipepeo-dark flex flex-col items-center justify-center p-6 text-center font-sans">
      {/* --- NEW ADDITION: Inline Styles for Heart Animation --- */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(100vh) scale(0.5); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(-70vh) scale(1.2); opacity: 0; }
        }
      `}</style>

      {/* --- NEW ADDITION: Background Image (Kilimanjaro/Nairobi vibe) --- */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/assets/images/mtKilimanjaro.png')", // Nairobi/Kenya scenic vibe
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.3, // Low opacity to blend with your dark theme
          mixBlendMode: "luminosity",
        }}
      ></div>

      {/* --- NEW ADDITION: Floating Hearts --- */}
      <div className="hearts absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {hearts.map((_, i) => (
          <div
            key={i}
            className="absolute text-kipepeo-red/90"
            style={{
              content: '"❤"',
              left: `${Math.random() * 100}%`,
              bottom: "-50px",
              fontSize: `${Math.random() * 20 + 10}px`,
              animation: `floatUp ${Math.random() * 10 + 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          >
            ❤
          </div>
        ))}
      </div>

      {/* ORIGINAL CONTENT BELOW */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-kipepeo-pink/10 rounded-full blur-[120px] z-0"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-kipepeo-purple/10 rounded-full blur-[120px] z-0"></div>

      <div className="z-10 animate-float mb-12 relative">
        <h1 className="text-7xl font-black mb-2 text-gradient tracking-tighter neon-text">
          HUSHLY
        </h1>
        <p className="text-gray-500 font-black tracking-[0.5em] text-[10px] uppercase">
          After Hours • Anonymous
        </p>
      </div>

      <div className="z-10 max-w-sm w-full relative">
        <h2 className="text-4xl font-extrabold mb-4 leading-none">
          Find your weekend plot.
        </h2>

        <div className="space-y-4">
          <button
            onClick={() => navigate("/onboarding")}
            className="w-full py-5 px-8 bg-white text-black font-black rounded-2xl shadow-2xl transform transition-all active:scale-95 text-sm uppercase tracking-widest"
          >
            Register
          </button>
          <button className="w-full py-5 px-8 glass text-white font-bold rounded-2xl text-xs uppercase tracking-widest transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-95">
            Log In
          </button>
        </div>
      </div>

      <div className="absolute bottom-8 flex flex-col items-center space-y-2 z-10">
        <div className="flex space-x-4 grayscale opacity-40">
          <span className="text-xs font-bold">PRIVATE</span>
          <span className="text-xs font-bold">REAL-TIME</span>
          <span className="text-xs font-bold">KENYA</span>
        </div>
        <p className="text-[8px] text-gray-700 uppercase font-black">
          18+ Only • Strictly Weekend Vibes
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
