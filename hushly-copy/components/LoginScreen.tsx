import React, { useState } from 'react';
import { User } from '../types';
import { DAILY_SWIPE_LIMIT } from '../constants';

interface Props {
  onLogin: (user: User) => void;
  onForgotPassword: () => void;
  onBack: () => void;
}

const LoginScreen: React.FC<Props> = ({ onLogin, onForgotPassword, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSimpleLogin = () => {
    setIsLoggingIn(true);
    setTimeout(() => {
      const mockUser: User = {
        id: 'u1',
        name: 'Jambo User',
        email: email || 'user@safari.com',
        nickname: '@safari_pro',
        gender: 'Male',
        interests: ['Tech', 'Music'],
        intents: ['Serious Dating'],
        age: 26,
        location: 'Nairobi',
        bio: 'Just looking for real vibes.',
        isPaid: false,
        dailySwipesRemaining: DAILY_SWIPE_LIMIT,
        lastDropAt: Date.now(),
        avatar: {
          base: 'Male Body',
          baseColor: '#2D1F1D',
          outfit: 'Urban Wear',
          outfitColor: '#F43F5E',
          accessory: 'Gold Chain',
          accessoryColor: '#FFD700',
          hair: 'Fade',
          hairColor: '#2D1F1D'
        },
        achievements: [],
        photos: ['https://picsum.photos/400/400?random=1']
      };
      onLogin(mockUser);
      setIsLoggingIn(false);
    }, 1200);
  };

  const handleBiometricLogin = async () => {
    if (window.PublicKeyCredential) {
      try {
        setIsLoggingIn(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        handleSimpleLogin();
      } catch (err) {
        setIsLoggingIn(false);
      }
    } else {
      alert("Biometrics not supported on this device.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 flex flex-col animate-in slide-in-from-right duration-500">
      <header className="flex items-center mb-10 pt-4">
        <button 
          onClick={onBack} 
          className="w-12 h-12 bg-slate-900 border border-white/5 rounded-2xl flex items-center justify-center text-white active:scale-90 transition-all"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
      </header>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">Welcome back.</h2>
        <p className="text-slate-500 mb-10 font-medium">Please enter your details to sign in.</p>

        <div className="space-y-4 mb-8">
          <div className="space-y-1">
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/5 p-5 rounded-2xl text-white outline-none focus:border-rose-500 focus:bg-slate-900 transition-all placeholder:text-slate-600" 
              placeholder="Email address" 
            />
          </div>
          <div className="space-y-1">
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/5 p-5 rounded-2xl text-white outline-none focus:border-rose-500 focus:bg-slate-900 transition-all placeholder:text-slate-600" 
              placeholder="Password" 
            />
          </div>
        </div>

        <button 
          onClick={handleSimpleLogin}
          disabled={isLoggingIn || !email || !password}
          className="w-full bg-rose-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-rose-500/20 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest text-sm"
        >
          {isLoggingIn ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Continue'}
        </button>

        <div className="relative my-10">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
          <div className="relative flex justify-center text-[10px] font-black uppercase text-slate-600 bg-slate-950 px-4 tracking-[0.3em]">OR USE</div>
        </div>

        <button 
          onClick={handleBiometricLogin}
          className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl font-black text-white flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-widest"
        >
          <i className="fa-solid fa-fingerprint text-rose-500 text-2xl"></i>
          Secure Login
        </button>
      </div>

      <footer className="mt-12 text-center pb-8">
        <button onClick={onForgotPassword} className="text-xs font-black text-slate-500 hover:text-rose-500 uppercase tracking-widest transition-colors">
          Trouble logging in?
        </button>
      </footer>
    </div>
  );
};

export default LoginScreen;