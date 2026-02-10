
import React from 'react';
import { AppView } from '../types';

interface Props {
  currentView: AppView;
  setView: (view: AppView) => void;
  unreadNotifications?: number;
}

const Navbar: React.FC<Props> = ({ currentView, setView, unreadNotifications = 0 }) => {
  const tabs: { id: AppView; icon: string; label: string }[] = [
    { id: 'dating', icon: 'fa-fire', label: 'Swipe' },
    { id: 'live', icon: 'fa-tower-broadcast', label: 'Live' },
    { id: 'hub', icon: 'fa-gamepad', label: 'Hub' },
    { id: 'messages', icon: 'fa-message', label: 'Chat' },
    { id: 'profile', icon: 'fa-user-circle', label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[6rem] bg-slate-950/90 backdrop-blur-2xl border-t border-white/5 flex items-center justify-around px-2 z-50 pb-safe">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setView(tab.id)}
          className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300 ${
            currentView === tab.id 
              ? 'text-rose-500 scale-110' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className="relative">
            <i className={`fa-solid ${tab.icon} text-xl mb-1`}></i>
            {tab.id === 'messages' && unreadNotifications > 0 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-slate-950"></div>
            )}
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest">{tab.label}</span>
          {currentView === tab.id && (
            <div className="absolute -bottom-1 w-1 h-1 bg-rose-500 rounded-full"></div>
          )}
        </button>
      ))}
    </div>
  );
};

export default Navbar;
