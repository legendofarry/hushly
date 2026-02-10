
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { KENYA_LOCATIONS } from '../constants';

interface Props {
  user: User | null;
  onUpgrade: () => void;
  onUpdateUser: (user: User) => void;
  isOwnProfile: boolean;
  currentUser?: User | null;
  onToggleFollow?: (profileId: string) => void;
  onBack?: () => void;
  onFullscreenToggle?: (isHidden: boolean) => void;
}

// Coordinates for Kenyan cities to support OpenStreetMap pinning
const CITY_COORDS: Record<string, { lat: number, lon: number }> = {
  'Nairobi': { lat: -1.286389, lon: 36.817223 },
  'Mombasa': { lat: -4.043477, lon: 39.668206 },
  'Kisumu': { lat: -0.10221, lon: 34.76171 },
  'Nakuru': { lat: -0.3031, lon: 36.08 },
  'Eldoret': { lat: 0.514277, lon: 35.26978 },
  'Thika': { lat: -1.033333, lon: 37.066667 },
  'Malindi': { lat: -3.217476, lon: 40.119106 },
  'Kitale': { lat: 1.01572, lon: 35.00622 }
};

const ProfileView: React.FC<Props> = ({ 
  user, 
  onUpgrade, 
  onUpdateUser, 
  isOwnProfile, 
  currentUser, 
  onToggleFollow,
  onBack,
  onFullscreenToggle
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locError, setLocError] = useState<{title: string, msg: string, icon: string} | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Analytics & Map States
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  // Edit Form States
  const [editName, setEditName] = useState(user?.name || '');
  const [editAge, setEditAge] = useState(user?.age || 24);
  const [editLocation, setEditLocation] = useState(user?.location || '');
  const [editBio, setEditBio] = useState(user?.bio || '');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isFollowing = currentUser?.followingIds?.includes(user?.id || '');
  const displayFollowerCount = (user?.followerCount || 0) + (isFollowing ? 1 : 0);

  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditAge(user.age);
      setEditLocation(user.location);
      setEditBio(user.bio);
    }
  }, [user]);

  // Handle hiding/showing the navbar based on modal visibility
  useEffect(() => {
    if (isOwnProfile && onFullscreenToggle) {
      onFullscreenToggle(isEditing || showLocationMap || isCameraOpen || showAnalytics);
    }
  }, [isEditing, showLocationMap, isCameraOpen, showAnalytics, isOwnProfile, onFullscreenToggle]);

  if (!user) return null;

  const handleOpenMap = () => {
    setShowLocationMap(true);
  };

  const generateAiInsights = () => {
    setIsLoadingInsight(true);
    const tips = [
      "Keep your photos clear and well-lit, no blurry shots.",
      "Add one fun detail in your bio to make replies easy.",
      "Reply quickly to new chats while the vibe is warm.",
    ];
    const insight = tips.map((tip, index) => `${index + 1}. ${tip}`).join("\n");
    window.setTimeout(() => {
      setAiInsight(insight);
      setIsLoadingInsight(false);
    }, 250);
  };

  const handleOpenAnalytics = () => {
    setShowAnalytics(true);
    if (!aiInsight) {
      generateAiInsights();
    }
  };

  const handlePinLocation = async () => {
    setIsLocating(true);
    setLocError(null);
    
    if (!navigator.geolocation) {
      setLocError({
        title: "Not Supported",
        msg: "Your browser doesn't support automatic location pinning.",
        icon: "fa-circle-exclamation"
      });
      setIsLocating(false);
      return;
    }

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      let closestCity: string | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;

      Object.entries(CITY_COORDS).forEach(([city, coords]) => {
        const dLat = latitude - coords.lat;
        const dLon = longitude - coords.lon;
        const distance = Math.sqrt(dLat * dLat + dLon * dLon);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestCity = city;
        }
      });

      if (closestCity && KENYA_LOCATIONS.includes(closestCity)) {
        setEditLocation(closestCity);
      } else {
        setLocError({
          title: "Out of Bounds",
          msg: "We found your location but it's outside our current Safari zones.",
          icon: "fa-map-pin"
        });
      }
      setIsLocating(false);
    }, (error) => {
      setIsLocating(false);
      setLocError({
        title: "GPS Timeout",
        msg: "Satellite signal is too weak. Try moving near a window.",
        icon: "fa-satellite-dish"
      });
    }, geoOptions);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', aspectRatio: 1 }, 
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setCapturedImage(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
      }
    }
  };

  const savePhoto = () => {
    if (capturedImage) {
      const updatedUser = {
        ...user,
        photos: [capturedImage, ...user.photos.slice(1, 5)]
      } as User;
      onUpdateUser(updatedUser);
      stopCamera();
    }
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      alert("Name cannot be empty!");
      return;
    }
    if (!editLocation) {
       alert("Please pin your location to continue!");
       return;
    }
    const updatedUser: User = {
      ...user,
      name: editName,
      age: editAge,
      location: editLocation,
      bio: editBio
    } as User;
    onUpdateUser(updatedUser);
    setIsEditing(false);
  };

  const performLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      localStorage.removeItem('hushly_user');
      window.location.reload();
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // OpenStreetMap URL Generator
  const getOsmUrl = () => {
    const coords = CITY_COORDS[user.location] || CITY_COORDS['Nairobi'];
    const { lat, lon } = coords;
    // Embed URL with marker
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.02}%2C${lat - 0.02}%2C${lon + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lon}`;
  };

  const handleCopyCoords = () => {
    const coords = CITY_COORDS[user.location] || CITY_COORDS['Nairobi'];
    navigator.clipboard.writeText(`${coords.lat}, ${coords.lon}`);
    alert("Coordinates copied to clipboard!");
  };

  return (
    <div className="min-h-full bg-slate-950 flex flex-col">
      {/* Dynamic Header for Back Button */}
      {!isOwnProfile && (
        <div className="pt-12 px-6 flex justify-between items-center z-40 bg-slate-950/50 backdrop-blur-md pb-4">
           <button onClick={onBack} className="w-10 h-10 flex items-center justify-center text-white bg-slate-900 rounded-full border border-white/5">
              <i className="fa-solid fa-chevron-left"></i>
           </button>
           <h1 className="text-xl font-black italic text-white tracking-tighter uppercase">{user.name}'s Profile</h1>
           <button className="w-10 h-10 flex items-center justify-center text-white bg-slate-900 rounded-full border border-white/5">
              <i className="fa-solid fa-ellipsis"></i>
           </button>
        </div>
      )}

      <div className={`flex flex-col items-center ${isOwnProfile ? 'pt-16' : 'pt-8'} pb-12 animate-in fade-in duration-500`}>
        <div className="relative mb-6">
           <div className="w-32 h-32 rounded-full border-4 border-rose-500 p-1 relative shadow-2xl shadow-rose-500/20 overflow-hidden">
             <img src={user.photos[0]} className="w-full h-full rounded-full object-cover" alt="" />
           </div>
           {isOwnProfile && (
             <button 
               onClick={startCamera}
               className="absolute bottom-0 right-0 w-10 h-10 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-rose-500 shadow-xl active:scale-90 transition-transform"
             >
               <i className="fa-solid fa-camera"></i>
             </button>
           )}
        </div>
        <h2 className="text-3xl font-black text-white">{user.name}, {user.age}</h2>
        
        {/* Clickable Location */}
        <button 
          onClick={handleOpenMap}
          className="text-slate-500 flex items-center gap-2 mb-4 hover:text-rose-400 transition-colors group active:scale-95"
        >
           <i className="fa-solid fa-location-dot text-rose-500 group-hover:animate-bounce"></i> 
           <span className="underline underline-offset-4 decoration-rose-500/20">{user.location}, Kenya</span>
        </button>

        {!isOwnProfile && (
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-slate-900/50 border border-white/5 px-4 py-1.5 rounded-full flex items-center gap-2">
              <span className="text-white font-black text-sm">{displayFollowerCount.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Followers</span>
            </div>
            {isFollowing && (
              <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-500/20 animate-in zoom-in duration-300">
                <i className="fa-solid fa-user-check text-xs"></i>
              </div>
            )}
          </div>
        )}

        {isOwnProfile ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="bg-rose-500/10 border border-rose-500/30 px-6 py-2 rounded-full text-xs font-bold uppercase text-rose-500 hover:bg-rose-500/20 transition-all mb-6 flex items-center gap-2"
          >
            <i className="fa-solid fa-pen-to-square"></i> Edit Profile
          </button>
        ) : (
          <div className="flex gap-4 mb-6 w-full px-12">
             <button 
               onClick={() => onToggleFollow?.(user.id)}
               className={`flex-1 py-4 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 ${isFollowing ? 'bg-slate-800 text-white' : 'bg-white text-slate-950'}`}
             >
               {isFollowing ? 'Unfollow' : 'Follow'}
             </button>
             <button className="flex-1 bg-rose-500 text-white py-4 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-rose-500/20 transition-all active:scale-95">
               Message
             </button>
          </div>
        )}

        {isOwnProfile && (
          <div className="w-full grid grid-cols-2 gap-4 px-4">
             <button 
               onClick={handleOpenAnalytics}
               className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl text-center active:scale-95 transition-all group"
             >
                <p className="text-2xl font-black text-white group-hover:text-rose-500 transition-colors">42</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Matches</p>
             </button>
             <button 
               onClick={handleOpenAnalytics}
               className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl text-center active:scale-95 transition-all group"
             >
                <p className="text-2xl font-black text-white group-hover:text-rose-500 transition-colors">1.2k</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Likes</p>
             </button>
          </div>
        )}
      </div>

      {/* LOCATION MAP MODAL (OPENSTREETMAP) */}
      {showLocationMap && (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col animate-in slide-in-from-bottom duration-500">
          <header className="relative z-10 p-6 flex items-center justify-between bg-slate-950/90 border-b border-white/5">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/20">
                  <i className="fa-solid fa-map-pin text-rose-500"></i>
               </div>
               <div>
                  <h3 className="text-white font-black uppercase tracking-widest italic leading-none">{user.location}</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Discovery Region</p>
               </div>
             </div>
             <div className="flex gap-3">
               <button 
                 onClick={handleCopyCoords}
                 className="w-12 h-12 bg-slate-900/50 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/10 active:scale-90 transition-all"
               >
                  <i className="fa-solid fa-copy"></i>
               </button>
               <button 
                 onClick={() => setShowLocationMap(false)} 
                 className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/10 active:scale-90 transition-all"
               >
                  <i className="fa-solid fa-xmark"></i>
               </button>
             </div>
          </header>

          <div className="flex-1 relative bg-slate-900 overflow-hidden">
             <iframe 
               width="100%" 
               height="100%" 
               frameBorder="0" 
               scrolling="no" 
               marginHeight={0} 
               marginWidth={0} 
               src={getOsmUrl()}
               style={{ border: 'none', filter: 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)' }} // Dark mode filter
               title="OpenStreetMap Location"
             />
             
             {/* CUSTOM OVERLAY PIN (centered) */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                <div className="relative animate-float">
                   <div className="w-16 h-16 bg-rose-500 rounded-t-full rounded-bl-full rotate-45 flex items-center justify-center shadow-[0_20px_40px_rgba(244,63,94,0.4)] border-2 border-white/20">
                      <i className="fa-solid fa-heart text-white text-xl -rotate-45"></i>
                   </div>
                   <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-4 h-4 bg-rose-500/40 rounded-full blur-md animate-pulse"></div>
                </div>
             </div>
          </div>
        </div>
      )}

      <div className="space-y-6 mb-24 px-4">
        {isOwnProfile && !user.isPaid && (
          <button 
            onClick={onUpgrade}
            className="w-full gradient-primary p-6 rounded-3xl flex items-center justify-between shadow-2xl shadow-rose-500/20 transition-all active:scale-95"
          >
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                  <i className="fa-solid fa-crown text-xl"></i>
               </div>
               <div className="text-left">
                  <p className="text-white font-black uppercase tracking-tighter">Get Gold Status</p>
                  <p className="text-white/70 text-xs">Unlock all premium features</p>
               </div>
            </div>
            <i className="fa-solid fa-chevron-right text-white"></i>
          </button>
        )}

        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800">
           <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Bio</h3>
           <p className="text-slate-300 text-sm italic">"{user.bio || "No bio yet."}"</p>
        </div>

        {isOwnProfile && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
               <i className="fa-solid fa-medal text-amber-500"></i> Achievements
            </h3>
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
               {user.achievements.map(ach => (
                 <div key={ach.id} className="min-w-[120px] aspect-square bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center justify-center p-4">
                    <span className="text-4xl mb-2">{ach.icon}</span>
                    <p className="text-[10px] font-black text-white uppercase tracking-tighter text-center">{ach.title}</p>
                 </div>
               ))}
               {user.achievements.length === 0 && <p className="text-slate-500 text-sm">No achievements unlocked yet. Keep swiping!</p>}
            </div>
          </div>
        )}

        {isOwnProfile && (
          <div className="bg-slate-900 rounded-3xl divide-y divide-slate-800 border border-slate-800">
             <button 
               onClick={handleOpenAnalytics}
               className="w-full flex items-center justify-between p-5 text-left text-white font-medium hover:bg-slate-800/50 transition-colors"
             >
                <div className="flex items-center gap-3">
                   <i className="fa-solid fa-chart-line text-slate-500"></i> View Insights & Analytics
                </div>
                <i className="fa-solid fa-chevron-right text-xs text-slate-700"></i>
             </button>
             <button 
               onClick={() => setShowLogoutConfirm(true)}
               className="w-full flex items-center justify-between p-5 text-left text-rose-500 font-bold hover:bg-slate-800/50 transition-colors"
             >
                <div className="flex items-center gap-3">
                   <i className="fa-solid fa-arrow-right-from-bracket"></i> Logout
                </div>
             </button>
          </div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && isOwnProfile && (
        <div className="fixed inset-0 z-[150] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="w-full max-w-sm bg-slate-900 border border-white/5 rounded-[3rem] p-8 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-rose-500/50"></div>
              
              {!isLoggingOut ? (
                <>
                  <div className="w-24 h-24 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 relative">
                     <i className="fa-solid fa-ghost text-rose-500 text-5xl animate-float"></i>
                     <div className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                        <i className="fa-solid fa-question text-[10px] text-white"></i>
                     </div>
                  </div>
                  
                  <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter italic">Leaving the <span className="text-rose-500">Tribe?</span></h3>
                  <p className="text-slate-400 text-sm mb-8 leading-relaxed font-medium px-2">
                    Your Safari session will end. Are you sure you want to disappear like a ghost?
                  </p>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={performLogout}
                      className="w-full bg-rose-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-xs"
                    >
                      Logout Now
                    </button>
                    <button 
                      onClick={() => setShowLogoutConfirm(false)}
                      className="w-full bg-slate-800 text-slate-400 font-black py-4 rounded-2xl border border-white/5 transition-all active:scale-95 uppercase tracking-widest text-xs"
                    >
                      Stay Active
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center gap-6 animate-pulse">
                   <div className="w-32 h-32 flex items-center justify-center">
                      <i className="fa-solid fa-ghost text-rose-500 text-6xl animate-float"></i>
                   </div>
                   <p className="text-white font-black uppercase tracking-widest text-xs animate-pulse">Clearing Safari tracks...</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && isOwnProfile && (
        <div className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom duration-500">
           <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950">
              <h3 className="text-white font-black uppercase tracking-widest italic">Safari <span className="text-rose-500">Insights</span></h3>
              <button onClick={() => setShowAnalytics(false)} className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white border border-slate-800">
                <i className="fa-solid fa-xmark"></i>
              </button>
           </div>

           <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              <div className="grid grid-cols-3 gap-3">
                 <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl text-center">
                    <p className="text-xl font-black text-white">1.2k</p>
                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Total Likes</p>
                 </div>
                 <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl text-center">
                    <p className="text-xl font-black text-rose-500">184</p>
                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Mutuals</p>
                 </div>
                 <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl text-center">
                    <p className="text-xl font-black text-emerald-500">+12%</p>
                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Engagement</p>
                 </div>
              </div>

              <div className="bg-gradient-to-br from-rose-500/10 to-indigo-500/10 border border-white/10 rounded-[2.5rem] p-6 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                    <i className="fa-solid fa-heart text-6xl"></i>
                 </div>
                 <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-wand-sparkles"></i> Dating Coach
                 </h4>
                 
                 {isLoadingInsight ? (
                   <div className="py-8 flex flex-col items-center justify-center text-slate-500 gap-4">
                      <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
                      <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Analyzing your vibe...</p>
                   </div>
                 ) : (
                   <div className="space-y-4">
                      <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                        {aiInsight}
                      </p>
                      <button 
                        onClick={generateAiInsights}
                        className="text-[10px] font-black text-white uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl border border-white/5"
                      >
                        Refresh Insights
                      </button>
                   </div>
                 )}
              </div>
           </div>
           
           <div className="p-6 bg-slate-950 border-t border-white/5">
              <button 
                onClick={onUpgrade}
                className="w-full bg-white text-slate-950 font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 text-xs uppercase tracking-widest"
              >
                 Boost Visibility with Gold
              </button>
           </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditing && isOwnProfile && (
        <div className="fixed inset-0 z-[110] bg-slate-950/95 backdrop-blur-md flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
           <div className="flex items-center justify-between mb-8">
              <button onClick={() => setIsEditing(false)} className="text-slate-500 font-bold uppercase text-xs">Cancel</button>
              <h3 className="text-white font-black uppercase tracking-widest">Edit Profile</h3>
              <button onClick={handleSaveProfile} className="text-rose-500 font-black uppercase text-xs">Save</button>
           </div>

           <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Display Name</label>
                <input 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                  placeholder="Your Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Age</label>
                  <input 
                    type="number"
                    value={editAge}
                    onChange={(e) => setEditAge(parseInt(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Verified Location</label>
                  <div className="relative">
                    <input 
                      value={isLocating ? "Updating..." : editLocation || "Location not set"}
                      readOnly
                      className={`w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 pr-12 outline-none cursor-default transition-all ${editLocation ? 'text-white' : 'text-slate-600 italic'}`}
                    />
                    <button 
                      onClick={handlePinLocation}
                      disabled={isLocating}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 w-8 h-8 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 transition-colors ${isLocating ? 'animate-pulse' : ''}`}
                    >
                      <i className={`fa-solid ${isLocating ? 'fa-spinner fa-spin' : 'fa-location-crosshairs'}`}></i>
                    </button>
                  </div>
                  <p className="text-[8px] text-slate-600 mt-1 uppercase font-black">Location is GPS-locked</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Bio</label>
                <textarea 
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-rose-500 resize-none transition-all"
                  placeholder="Tell the tribe about yourself..."
                />
              </div>
           </div>
        </div>
      )}

      {locError && isOwnProfile && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="w-full max-w-sm bg-slate-900 border border-white/5 rounded-[3rem] p-8 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-rose-500/50"></div>
              <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                 <i className={`fa-solid ${locError.icon} text-rose-500 text-3xl`}></i>
              </div>
              <h3 className="text-2xl font-black text-white mb-2">{locError.title}</h3>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                {locError.msg}
              </p>
              <div className="space-y-3">
                <button 
                  onClick={handlePinLocation}
                  className="w-full bg-white text-slate-950 font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-rotate-right"></i> Try Again
                </button>
                <button 
                  onClick={() => setLocError(null)}
                  className="w-full text-slate-500 font-bold py-2 text-xs uppercase tracking-widest"
                >
                  Dismiss
                </button>
              </div>
           </div>
        </div>
      )}

      {isCameraOpen && isOwnProfile && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center gap-[50px] p-6 animate-in fade-in duration-300">
          <div className="w-full flex justify-between items-center">
            <button onClick={stopCamera} className="text-white text-xl p-2">
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h3 className="text-white font-bold">Retake Profile Photo</h3>
            <div className="w-10"></div>
          </div>

          <div className="relative w-full aspect-square max-w-sm rounded-[3rem] overflow-hidden border-4 border-rose-500/30">
            {capturedImage ? (
              <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
            ) : (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
            )}
            {!capturedImage && (
              <div className="absolute inset-0 border-[40px] border-black/40 rounded-full pointer-events-none"></div>
            )}
          </div>

          <div className="w-full max-w-sm space-y-4">
            {!capturedImage ? (
              <button 
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full bg-white border-8 border-slate-300/50 mx-auto flex items-center justify-center active:scale-90 transition-transform"
              >
                <div className="w-12 h-12 rounded-full bg-rose-500"></div>
              </button>
            ) : (
              <div className="flex gap-4">
                <button 
                  onClick={() => setCapturedImage(null)}
                  className="flex-1 bg-slate-800 text-white font-bold p-4 rounded-2xl"
                >
                  Retake
                </button>
                <button 
                  onClick={savePhoto}
                  className="flex-[2] gradient-primary text-white font-bold p-4 rounded-2xl shadow-xl shadow-rose-500/20"
                >
                  Use This Photo
                </button>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};

export default ProfileView;
