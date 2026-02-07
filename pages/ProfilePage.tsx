import React from "react";
import { Link } from "react-router-dom";
import { UserProfile } from "../types";
import AppImage from "../components/AppImage";
import { OWNER_EMAIL } from "../services/paymentService";

interface Props {
  user: UserProfile;
  onLogout: () => void;
}

const ProfilePage: React.FC<Props> = ({ user, onLogout }) => {
  return (
    <div className="relative min-h-screen w-full bg-[#050505] font-sans text-gray-100 selection:bg-kipepeo-pink/30">
      {/* --- Ambient Background Lights --- */}
      <div className="fixed left-0 top-0 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-900/20 blur-[120px] pointer-events-none"></div>
      <div className="fixed right-0 bottom-0 -z-10 h-[500px] w-[500px] translate-x-1/3 translate-y-1/3 rounded-full bg-kipepeo-pink/10 blur-[120px] pointer-events-none"></div>

      {/* --- Header --- */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-[#050505]/80 px-6 py-4 backdrop-blur-xl transition-all">
        <div className="flex items-center gap-4">
          <Link
            to="/discover"
            className="group flex h-10 w-10 items-center justify-center rounded-full bg-white/5 transition-all hover:bg-white/10 active:scale-90"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400 group-hover:text-white"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white">
            My Vibe
          </h1>
        </div>
      </header>

      <div className="p-6 pb-24">
        {/* --- Hero Profile Section --- */}
        <div className="relative mb-10 mt-4 flex flex-col items-center animate-in slide-in-from-bottom-4 duration-500">
          {/* Avatar with Pulse Ring */}
          <div className="relative mb-5 group">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-kipepeo-pink to-purple-600 blur-xl opacity-40 transition-opacity duration-500 group-hover:opacity-60 animate-pulse"></div>
            <div className="relative h-32 w-32 rounded-full p-[3px] bg-gradient-to-tr from-kipepeo-pink to-purple-600">
              <div className="h-full w-full overflow-hidden rounded-full border-4 border-[#050505]">
                <AppImage
                  src={user.photoUrl}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  alt="Me"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            </div>
            {/* Online Status */}
            <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full border-4 border-[#050505] bg-green-500 shadow-lg"></div>
          </div>

          <h2 className="text-3xl font-black uppercase tracking-tighter text-white drop-shadow-lg">
            {user.nickname}
          </h2>

          {/* Stats Chips */}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-4 py-1.5 backdrop-blur-md">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Age
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white">
                {user.ageRange}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-4 py-1.5 backdrop-blur-md">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Loc
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white">
                {user.area}
              </span>
            </div>
          </div>

          {user.occupation && (
            <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              {user.occupation} •{" "}
              <span className="text-kipepeo-pink">
                {user.occupationVisibility === "public" ? "Visible" : "Hidden"}
              </span>
            </p>
          )}
        </div>

        <div className="space-y-8">
          {/* --- Intents / Vibe Tags --- */}
          <section className="animate-in slide-in-from-bottom-5 duration-700 delay-100">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.25em]">
                Active Vibes
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {user.intents.map((i) => (
                <span
                  key={i}
                  className="rounded-xl border border-kipepeo-pink/20 bg-kipepeo-pink/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-kipepeo-pink shadow-[0_0_15px_-5px_rgba(236,72,153,0.3)]"
                >
                  {i}
                </span>
              ))}
            </div>
          </section>

          {/* --- Bio Card --- */}
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 animate-in slide-in-from-bottom-5 duration-700 delay-150">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="60"
                height="60"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-white"
              >
                <path d="M14.017 21L14.017 18C14.017 16.8954 13.1216 16 12.017 16H9.01697C7.91243 16 7.01697 16.8954 7.01697 18L7.01697 21H2.01697V7H16.017V21H14.017ZM12.0625 13C12.9351 13 13.7548 12.5937 14.3055 11.9562C14.8143 12.5986 15.6087 13 16.5 13C17.9575 13 19.127 11.7516 18.9951 10.3015L18.4224 4H9.57757L9.00494 10.3015C8.87297 11.7516 10.0425 13 11.5 13C12.3913 13 13.1857 12.5986 13.6945 11.9562C13.626 12.0354 13.5516 12.1105 13.4715 12.1805C13.0645 12.5366 12.5654 12.7938 12.017 12.9231L12.0625 13Z"></path>
              </svg>
            </div>
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.25em] mb-3">
              About Me
            </h3>
            <p className="relative z-10 text-sm font-medium leading-relaxed text-gray-200 italic">
              "{user.bio}"
            </p>
          </section>

          {/* --- SETTINGS GRID (2x2 Mobile) --- */}
          <section className="space-y-4 animate-in slide-in-from-bottom-5 duration-700 delay-200">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.25em] ml-1">
              Control Center
            </h3>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
              {/* 1. Security Card (Blue Theme) */}
              <Link
                to="/settings/security"
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/5 bg-[#121212] p-5 transition-all hover:scale-[1.02] active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>

                <div className="mb-4 h-12 w-12 flex items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all duration-300">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      x="3"
                      y="11"
                      width="18"
                      height="11"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-white mb-1">
                    Security
                  </h4>
                  <p className="text-[10px] text-gray-500 font-medium leading-tight">
                    Password & Safety
                  </p>
                </div>
              </Link>

              {/* 2. Personal Card (Purple Theme) */}
              <Link
                to="/settings/personal"
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/5 bg-[#121212] p-5 transition-all hover:scale-[1.02] active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>

                <div className="mb-4 h-12 w-12 flex items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20 group-hover:bg-purple-500/20 group-hover:scale-110 transition-all duration-300">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-white mb-1">
                    Profile
                  </h4>
                  <p className="text-[10px] text-gray-500 font-medium leading-tight">
                    Edit details
                  </p>
                </div>
              </Link>

              {/* 3. Likes Card (Pink Theme) */}
              <Link
                to="/likes"
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/5 bg-[#121212] p-5 transition-all hover:scale-[1.02] active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-pink-600/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>

                <div className="mb-4 h-12 w-12 flex items-center justify-center rounded-2xl bg-pink-500/10 text-pink-400 ring-1 ring-pink-500/20 group-hover:bg-pink-500/20 group-hover:scale-110 transition-all duration-300">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-white mb-1">
                    Analytics
                  </h4>
                  <p className="text-[10px] text-gray-500 font-medium leading-tight">
                    View Likes
                  </p>
                </div>
              </Link>

              {/* 4. Admin Card (Yellow) OR Placeholder/Support (Green) */}
              {user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase() ? (
                <Link
                  to="/admin/payments"
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/5 bg-[#121212] p-5 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>

                  <div className="mb-4 h-12 w-12 flex items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20 group-hover:bg-yellow-500/20 group-hover:scale-110 transition-all duration-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="1"
                        y="4"
                        width="22"
                        height="16"
                        rx="2"
                        ry="2"
                      ></rect>
                      <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                  </div>

                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-white mb-1">
                      Admin
                    </h4>
                    <p className="text-[10px] text-gray-500 font-medium leading-tight">
                      Payments
                    </p>
                  </div>
                </Link>
              ) : (
                <Link
                  to="/support"
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/5 bg-[#121212] p-5 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>

                  <div className="mb-4 h-12 w-12 flex items-center justify-center rounded-2xl bg-green-500/10 text-green-400 ring-1 ring-green-500/20 group-hover:bg-green-500/20 group-hover:scale-110 transition-all duration-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>

                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-white mb-1">
                      Help
                    </h4>
                    <p className="text-[10px] text-gray-500 font-medium leading-tight">
                      Get Support
                    </p>
                  </div>
                </Link>
              )}
            </div>
          </section>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="group relative mt-10 w-full overflow-hidden rounded-2xl bg-[#0a0a0a] py-5 transition-all hover:bg-red-500/10 active:scale-95"
          >
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
              <div className="absolute h-full w-full bg-red-500/10 blur-xl"></div>
            </div>
            <span className="relative z-10 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.4em] text-red-500/80 group-hover:text-red-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Log Out
            </span>
          </button>
        </div>

        <div className="mt-16 text-center space-y-2 opacity-40 grayscale transition-all hover:opacity-80 hover:grayscale-0">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.4em]">
            Hushly
          </p>
          <div className="flex justify-center gap-4 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
            <span>Encrypted</span>
            <span>•</span>
            <span>Anonymous</span>
            <span>•</span>
            <span>Nairobi HQ</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
