import React, { useState } from 'react';

interface Props {
  onBack: () => void;
}

const ResetPasswordScreen: React.FC<Props> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsSent(true);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 flex flex-col animate-in slide-in-from-right duration-500">
      <header className="flex items-center mb-10 pt-4">
        <button 
          onClick={onBack} 
          className="w-12 h-12 bg-slate-900 border border-white/5 rounded-2xl flex items-center justify-center text-white active:scale-90 transition-all"
        >
          <i className="fa-solid fa-chevron-left"></i>
        </button>
      </header>

      {!isSent ? (
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">Reset password.</h2>
          <p className="text-slate-500 mb-10 font-medium leading-relaxed">Enter your email and we'll send a recovery link to your inbox.</p>

          <div className="space-y-4 mb-8">
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/5 p-5 rounded-2xl text-white outline-none focus:border-rose-500 focus:bg-slate-900 transition-all placeholder:text-slate-600" 
              placeholder="Email address" 
            />
          </div>
          
          <button 
            onClick={handleReset}
            disabled={isLoading || !email}
            className="w-full bg-rose-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-rose-500/20 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest text-sm"
          >
            {isLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Send recovery link'}
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xs mx-auto">
          <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8 border-2 border-emerald-500/20">
            <i className="fa-solid fa-paper-plane text-emerald-500 text-4xl"></i>
          </div>
          <h2 className="text-3xl font-black text-white mb-4 tracking-tighter italic">Check your <span className="text-emerald-500">inbox.</span></h2>
          <p className="text-slate-500 text-sm mb-12 leading-relaxed">If an account exists for <span className="text-white font-bold">{email}</span>, you'll receive a link shortly.</p>
          <button 
            onClick={onBack}
            className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl font-black text-white uppercase tracking-widest text-xs transition-all active:scale-95"
          >
            Back to Sign In
          </button>
        </div>
      )}
    </div>
  );
};

export default ResetPasswordScreen;