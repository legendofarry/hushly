import React, { useState, useEffect, useCallback } from 'react';
import { AppView, User, Achievement, Profile, Notification, Filters } from './types';
import { DAILY_SWIPE_LIMIT, ACHIEVEMENTS, MOCK_PROFILES } from './constants';
import SplashScreen from './components/SplashScreen';
import LandingScreen from './components/LandingScreen';
import LoginScreen from './components/LoginScreen';
import Registration from './components/Registration';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import Navbar from './components/Navbar';
import DatingSwiper from './components/DatingSwiper';
import EscortPortal from './components/EscortPortal';
import LiveSection from './components/LiveSection';
import GameHub from './components/GameHub';
import ProfileView from './components/ProfileView';
import ChatScreen from './components/ChatScreen';
import NotificationCenter from './components/NotificationCenter';
import AchievementCelebration from './components/AchievementCelebration';
import BackgroundHearts from './components/BackgroundHearts';
import PaymentScreen from './components/PaymentScreen';
import FilterModal from './components/FilterModal';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('splash');
  const [user, setUser] = useState<User | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);
  const [headerToggle, setHeaderToggle] = useState(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isNavHiddenManually, setIsNavHiddenManually] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    gender: 'Everyone',
    ageRange: [18, 37],
    location: 'Nairobi',
    distance: 50,
    hasBio: false,
    interests: [],
    lookingFor: '',
    languages: [],
    zodiac: '',
    education: '',
    familyPlans: '',
    communicationStyle: '',
    loveStyle: '',
    pets: '',
    drinking: '',
    smoking: '',
    workout: '',
    socialMedia: '',
    expandDistance: true,
    expandAge: true,
    mode: 'For You'
  });

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 'n1',
      type: 'system',
      title: 'Karibu Hushly!',
      message: 'Welcome to the Tribe. Complete your profile to get more matches.',
      timestamp: Date.now() - 3600000,
      read: false
    }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeaderToggle(prev => !prev);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const checkAndRefreshDrop = (currentUser: User): User => {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    if (!currentUser.lastDropAt || (now - currentUser.lastDropAt >= twentyFourHours)) {
      const refreshedUser = {
        ...currentUser,
        dailySwipesRemaining: DAILY_SWIPE_LIMIT,
        lastDropAt: now
      };
      localStorage.setItem('hushly_user', JSON.stringify(refreshedUser));
      return refreshedUser;
    }
    return currentUser;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const savedUserStr = localStorage.getItem('hushly_user');
      if (savedUserStr) {
        let savedUser = JSON.parse(savedUserStr);
        savedUser = checkAndRefreshDrop(savedUser);
        if (!savedUser.followingIds) savedUser.followingIds = [];
        setUser(savedUser);
        setView('dating');
      } else {
        setView('landing');
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleAuthComplete = (newUser: User) => {
    const userWithDrop = { ...newUser, lastDropAt: Date.now(), followingIds: [] };
    setUser(userWithDrop);
    localStorage.setItem('hushly_user', JSON.stringify(userWithDrop));
    setView('dating');
    triggerAchievement('a1');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('hushly_user', JSON.stringify(updatedUser));
  };

  const triggerAchievement = (id: string) => {
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (ach && user) {
      if (user.achievements.find(ua => ua.id === id)) return;
      setActiveAchievement(ach);
      const updatedUser = {
        ...user,
        achievements: [...user.achievements, { ...ach, unlocked: true }]
      };
      handleUpdateUser(updatedUser);
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (user && user.dailySwipesRemaining > 0) {
      const updatedUser = {
        ...user,
        dailySwipesRemaining: user.dailySwipesRemaining - 1
      };
      handleUpdateUser(updatedUser);
      if (direction === 'right' && Math.random() > 0.7) {
        triggerAchievement('a2');
      }
    }
  };

  const togglePremium = () => {
    if (user) {
      const updatedUser = { ...user, isPaid: true };
      handleUpdateUser(updatedUser);
      setView('dating');
    }
  };

  const handleViewOtherProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    setView('view-profile');
  };

  const handleToggleFollow = (profileId: string) => {
    if (!user) return;
    const isFollowing = user.followingIds?.includes(profileId);
    const updatedFollowing = isFollowing
      ? user.followingIds?.filter(id => id !== profileId)
      : [...(user.followingIds || []), profileId];
    
    handleUpdateUser({ ...user, followingIds: updatedFollowing });
  };

  const renderContent = () => {
    switch (view) {
      case 'landing':
        return <LandingScreen onJoin={() => setView('registration')} onLogin={() => setView('login')} />;
      case 'login':
        return <LoginScreen onLogin={handleAuthComplete} onForgotPassword={() => setView('reset-password')} onBack={() => setView('landing')} />;
      case 'reset-password':
        return <ResetPasswordScreen onBack={() => setView('login')} />;
      case 'registration':
        return <Registration onComplete={handleAuthComplete} />;
      case 'dating':
        return <DatingSwiper user={user} filters={filters} onSwipe={handleSwipe} onProfileClick={handleViewOtherProfile} />;
      case 'escorts':
        return <EscortPortal user={user} onUpgrade={() => setView('payment')} onExit={() => setView('dating')} />;
      case 'live':
        return <LiveSection user={user} onUpgrade={() => setView('payment')} onProfileClick={handleViewOtherProfile} />;
      case 'hub':
        return <GameHub user={user} onExit={() => setView('dating')} onViewProfile={handleViewOtherProfile} onUpgrade={() => setView('payment')} />;
      case 'messages':
        return <ChatScreen user={user} onProfileClick={handleViewOtherProfile} />;
      case 'profile':
        return (
          <ProfileView 
            user={user} 
            onUpgrade={() => setView('payment')} 
            onUpdateUser={handleUpdateUser} 
            isOwnProfile={true} 
            onFullscreenToggle={(isHidden) => setIsNavHiddenManually(isHidden)}
          />
        );
      case 'view-profile':
        return (
          <ProfileView 
            user={selectedProfile as any} 
            onUpgrade={() => {}} 
            onUpdateUser={() => {}} 
            isOwnProfile={false}
            currentUser={user}
            onToggleFollow={handleToggleFollow}
            onBack={() => setView('dating')} 
          />
        );
      case 'payment':
        return <PaymentScreen onSuccess={togglePremium} onBack={() => setView('dating')} />;
      default:
        return null;
    }
  };

  if (view === 'splash') return <SplashScreen />;

  const showNav = !isNavHiddenManually && !['landing', 'login', 'registration', 'reset-password', 'splash', 'view-profile', 'escorts', 'payment', 'hub'].includes(view);

  return (
    <div className="relative h-screen w-full flex flex-col bg-slate-950 overflow-hidden">
      <BackgroundHearts />

      {/* Top Bar - ONLY in swipe (dating) tab */}
      {view === 'dating' && (
        <div className="pb-2 pt-4 px-6 flex justify-between items-center z-40 bg-slate-950/50 backdrop-blur-md pb-4 animate-in fade-in slide-in-from-top duration-300">
           <div className="flex items-center">
              <div className="w-2.5 h-8 bg-gradient-to-b from-[#f43f5e] to-[#7c3aed] rounded-full mr-3 shadow-[0_0_15px_rgba(244,63,94,0.4)]"></div>
              <div className="overflow-hidden h-fit">
                <h1 key={headerToggle ? 'brand' : 'tagline'} className="text-2xl font-black text-white tracking-tighter leading-8 animate-text-swap uppercase">
                  {headerToggle ? 'HUSHLY' : 'Tribe Vibes'}
                </h1>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsFilterModalOpen(true)}
                className="w-10 h-10 bg-slate-900 border border-white/5 rounded-full flex items-center justify-center text-slate-300 shadow-lg active:scale-90 transition-all"
                title="Discovery Settings"
              >
                <i className="fa-solid fa-sliders"></i>
              </button>
              <button 
                onClick={() => setView('escorts')}
                className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-500 shadow-lg active:scale-90 transition-all"
                title="Companion Portal"
              >
                <i className="fa-solid fa-gem"></i>
              </button>
           </div>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto no-scrollbar relative z-10 ${showNav ? 'pb-20' : ''}`}>
        {renderContent()}
      </div>

      {showNav && <Navbar currentView={view} setView={setView} unreadNotifications={1} />}

      {activeAchievement && (
        <AchievementCelebration 
          achievement={activeAchievement} 
          onClose={() => setActiveAchievement(null)} 
        />
      )}

      {isFilterModalOpen && (
        <FilterModal 
          filters={filters} 
          onApply={(updatedFilters) => {
            setFilters(updatedFilters);
            setIsFilterModalOpen(false);
          }} 
          onClose={() => setIsFilterModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default App;