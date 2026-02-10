import React from 'react';
import { Notification } from '../types';

interface Props {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  onClose: () => void;
}

const NotificationCenter: React.FC<Props> = ({ notifications, setNotifications, onClose }) => {
  
  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    if (window.confirm("Clear all notifications?")) {
      setNotifications([]);
    }
  };

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const typeStyles = {
    message: { icon: 'fa-comment-dots', color: 'text-sky-500', bg: 'bg-sky-500/10' },
    like: { icon: 'fa-heart', color: 'text-rose-500', bg: 'bg-rose-500/10' },
    system: { icon: 'fa-circle-info', color: 'text-amber-500', bg: 'bg-amber-500/10' }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 animate-in fade-in duration-300">
      <div className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-950/50 backdrop-blur-xl">
        <div>
          <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">HUSHLY <span className="text-rose-500">ALERTS</span></h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{notifications.length} Total Alerts</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={markAllRead}
             title="Mark all as read"
             className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 border border-white/5 active:scale-90"
           >
              <i className="fa-solid fa-check-double"></i>
           </button>
           <button 
             onClick={clearAll}
             title="Clear all"
             className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-rose-500/50 border border-white/5 active:scale-90"
           >
              <i className="fa-solid fa-trash-can"></i>
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
        {notifications.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-30">
             <i className="fa-solid fa-bell-slash text-6xl mb-4"></i>
             <p className="font-bold">No notifications yet.</p>
             <p className="text-xs">Quiet safari so far, rafiki!</p>
          </div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={`relative bg-slate-900 border border-white/5 rounded-3xl p-5 transition-all active:scale-[0.98] ${!n.read ? 'ring-1 ring-rose-500/30 bg-rose-500/5 shadow-2xl' : 'opacity-60 grayscale-[0.5]'}`}
            >
              <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center ${typeStyles[n.type].bg}`}>
                  {n.avatar ? (
                    <img src={n.avatar} className="w-full h-full rounded-2xl object-cover" alt="" />
                  ) : (
                    <i className={`fa-solid ${typeStyles[n.type].icon} ${typeStyles[n.type].color} text-xl`}></i>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-black text-white truncate">{n.title}</h3>
                    <span className="text-[8px] font-black text-slate-500 uppercase whitespace-nowrap">{getTimeAgo(n.timestamp)}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{n.message}</p>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(n.id);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-slate-700 hover:text-rose-500 transition-colors"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {!n.read && (
                <div className="absolute top-4 left-4 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-6">
         <div className="bg-slate-900 rounded-3xl p-4 border border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
               <i className="fa-solid fa-wand-sparkles"></i>
            </div>
            <div>
               <p className="text-[10px] text-white font-black uppercase tracking-widest">AI Tip</p>
               <p className="text-[10px] text-slate-500">Unread notifications expire after 7 days to keep the tribe clean.</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default NotificationCenter;