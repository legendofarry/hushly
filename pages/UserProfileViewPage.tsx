import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { UserProfile } from "../types";
import { getUserProfile } from "../services/userService";
import AppImage from "../components/AppImage";

interface Props {
  viewer: UserProfile;
}

const UserProfileViewPage: React.FC<Props> = ({ viewer }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (id === viewer.id) {
      navigate("/profile", { replace: true });
      return;
    }

    let active = true;
    setLoading(true);
    getUserProfile(id)
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setError(data ? null : "User not found.");
      })
      .catch((err) => {
        console.error(err);
        if (active) setError("Unable to load profile.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, viewer.id, navigate]);

  return (
    <div className="min-h-screen bg-kipepeo-dark text-white font-sans">
      <header className="p-6 flex justify-between items-center border-b border-white/5 bg-kipepeo-dark sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <Link
            to="/discover"
            className="text-2xl active:scale-90 transition-transform"
          ></Link>
          <h1 className="text-xl font-black uppercase tracking-widest">
            Profile View
          </h1>
        </div>
        <Link
          to="/chats"
          className="w-10 h-10 glass rounded-full flex items-center justify-center text-lg active:scale-90 transition-transform"
        >
          Chat
        </Link>
      </header>

      <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
        {loading ? (
          <div className="text-center py-20 text-gray-500 text-base">
            Loading profile...
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-400 text-base">
            {error}
          </div>
        ) : profile ? (
          <>
            <div className="flex flex-col items-center mb-10">
              <div className="relative mb-6">
                <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-kipepeo-pink p-1 shadow-[0_0_30px_rgba(255,0,128,0.2)]">
                  <AppImage
                    src={profile.photoUrl}
                    className="w-full h-full object-cover rounded-full"
                    alt={profile.nickname}
                    loading="eager"
                    fetchPriority="high"
                  />
                </div>
              </div>
              <h2 className="text-3xl font-black mb-1 uppercase tracking-tighter">
                {profile.nickname}
              </h2>
              <div className="flex items-center space-x-2 flex-wrap justify-center">
                <span className="text-gray-500 font-black uppercase tracking-widest text-[9px] bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  Age Range: {profile.ageRange}
                </span>
                <span className="text-gray-500 font-black uppercase tracking-widest text-[9px] bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  {profile.area}
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <section>
                <h3 className="text-xs font-black text-gray-600 uppercase tracking-[0.3em] mb-4 ml-2">
                  Intent
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(profile.intents ?? []).map((i) => (
                    <span
                      key={i}
                      className="px-4 py-2 bg-kipepeo-pink/10 text-kipepeo-pink text-[10px] font-black rounded-xl border border-kipepeo-pink/20 uppercase tracking-tighter"
                    >
                      {i}
                    </span>
                  ))}
                </div>
              </section>

              <section className="glass rounded-[2rem] p-6 border border-white/5">
                <h3 className="text-xs font-black text-gray-600 uppercase tracking-[0.3em] mb-3">
                  Bio
                </h3>
                <p className="text-gray-300 italic text-sm font-medium leading-relaxed">
                  "{profile.bio}"
                </p>
              </section>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default UserProfileViewPage;
