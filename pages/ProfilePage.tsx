import React from "react";
import { Link } from "react-router-dom";
import { UserProfile } from "../types";
import AppImage from "../components/AppImage";

interface Props {
  user: UserProfile;
  onLogout: () => void;
}

const ProfilePage: React.FC<Props> = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen bg-kipepeo-dark flex flex-col font-sans">
      <header className="p-6 flex justify-between items-center border-b border-white/5 bg-kipepeo-dark sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <Link
            to="/discover"
            className="text-2xl active:scale-90 transition-transform"
          >
            ←
          </Link>
          <h1 className="text-xl font-black uppercase tracking-widest">
            Vibe Settings
          </h1>
        </div>
        <Link
          to="/chats"
          className="w-10 h-10 glass rounded-full flex items-center justify-center text-lg active:scale-90 transition-transform"
        >
          💬
        </Link>
      </header>

      <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6">
            <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-kipepeo-pink p-1 shadow-[0_0_30px_rgba(255,0,128,0.2)]">
              <AppImage
                src={user.photoUrl}
                className="w-full h-full object-cover rounded-full"
                alt="Me"
                loading="eager"
                fetchPriority="high"
              />
            </div>
            <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 border-4 border-kipepeo-dark rounded-full"></div>
          </div>
          <h2 className="text-3xl font-black mb-1 uppercase tracking-tighter">
            {user.nickname}
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 font-black uppercase tracking-widest text-[9px] bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              Age Range: {user.ageRange}
            </span>
            <span className="text-gray-500 font-black uppercase tracking-widest text-[9px] bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              {user.area}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="text-xs font-black text-gray-600 uppercase tracking-[0.3em] mb-4 ml-2">
              Active Intents
            </h3>
            <div className="flex flex-wrap gap-2">
              {user.intents.map((i) => (
                <span
                  key={i}
                  className="px-4 py-2 bg-kipepeo-pink/10 text-kipepeo-pink text-[10px] font-black rounded-xl border border-kipepeo-pink/20 uppercase tracking-tighter"
                >
                  {i}
                </span>
              ))}
              <button className="px-4 py-2 bg-white/5 text-gray-500 text-[10px] font-black rounded-xl border border-white/5 uppercase tracking-tighter">
                + Edit
              </button>
            </div>
          </section>

          <section className="glass rounded-[2rem] p-6 border border-white/5">
            <h3 className="text-xs font-black text-gray-600 uppercase tracking-[0.3em] mb-3">
              Bio
            </h3>
            <p className="text-gray-300 italic text-sm font-medium leading-relaxed">
              "{user.bio}"
            </p>
          </section>

          <section className="space-y-2">
            <Link
              to="/settings/security"
              className="flex items-center justify-between p-5 glass rounded-2xl border border-white/5 active:scale-98 transition-transform"
            >
              <div className="flex items-center space-x-3">
                <span className="text-xs font-black uppercase tracking-widest">
                  Security & Privacy
                </span>
              </div>
              <span className="text-gray-500">â†’</span>
            </Link>

            <Link
              to="/settings/personal"
              className="flex items-center justify-between p-5 glass rounded-2xl border border-white/5 active:scale-98 transition-transform"
            >
              <div className="flex items-center space-x-3">
                <span className="text-xs font-black uppercase tracking-widest">
                  Personal Information
                </span>
              </div>
              <span className="text-gray-500">â†’</span>
            </Link>

            <Link
              to="/likes"
              className="flex items-center justify-between p-5 glass rounded-2xl border border-white/5 active:scale-98 transition-transform"
            >
              <div className="flex items-center space-x-3">
                <span className="text-xs font-black uppercase tracking-widest">
                  Likes Analytics
                </span>
              </div>
              <span className="text-gray-500">????????</span>
            </Link>

            <button
              onClick={onLogout}
              className="w-full py-5 bg-red-500/5 text-red-500 border border-red-500/10 rounded-2xl font-black text-xs uppercase tracking-[0.4em] mt-8 active:scale-95 transition-transform"
            >
              LOGOUT
            </button>
          </section>
        </div>

        <div className="mt-16 text-center space-y-1">
          <p className="text-[10px] text-gray-700 font-black uppercase tracking-[0.4em]">
            Kipepeo Private Network
          </p>
          <p className="text-[9px] text-gray-800 font-bold uppercase">
            Encrypted • Anonymous • Nairobi HQ
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

