
import React, { useState } from 'react';

interface Props {
  onSuccess: () => void;
  onBack: () => void;
}

const PaymentScreen: React.FC<Props> = ({ onSuccess, onBack }) => {
  const [selectedPlan, setSelectedPlan] = useState<number>(1);
  const [proofMessage, setProofMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plans = [
    { id: 1, title: '2 Weeks Gold', price: 160, description: 'Unlimited Swipes & Direct Chat' },
    { id: 2, title: 'Monthly Gold', price: 300, description: 'Priority Safari Placement & Elite Badge' },
  ];

  const verifyMpesaFormat = async () => {
    if (!proofMessage.trim()) {
      setError("Please paste your M-Pesa message first.");
      return;
    }

    setIsVerifying(true);
    setError(null);

    const normalized = proofMessage.replace(/\s+/g, " ").trim();
    const hasId = /^[A-Z0-9]{10}\s+Confirmed\./i.test(normalized);
    const hasRecipient = /sent to\s+ARRISON KARIMI/i.test(normalized);
    const hasAmount = /Ksh\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?/i.test(normalized);
    const hasTimestamp = /on\s+\d{1,2}\/\d{1,2}\/\d{2,4}\s+at\s+\d{1,2}:\d{2}\s?(AM|PM)?/i.test(
      normalized,
    );

    if (hasId && hasRecipient && hasAmount && hasTimestamp) {
      setIsVerified(true);
      setError(null);
    } else {
      setIsVerified(false);
      setError(
        "Format mismatch. Ensure the message starts with the transaction ID and shows sent to ARRISON KARIMI.",
      );
    }

    setIsVerifying(false);
  };

  const handleSendProof = () => {
    const supportNumber = "254762634893";
    const selectedPlanDetails = plans.find(p => p.id === selectedPlan);
    const message = `Hello Hushly Support, I have paid KSh ${selectedPlanDetails?.price} for the ${selectedPlanDetails?.title} plan. Here is my M-Pesa proof:\n\n${proofMessage}`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${supportNumber}?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col animate-in slide-in-from-right duration-500 font-['Outfit']">
      <header className="px-6 pt-8 flex items-center justify-between z-10">
        <button onClick={onBack} className="w-10 h-10 bg-slate-900 border border-white/5 rounded-2xl flex items-center justify-center text-white">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-24 no-scrollbar relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-amber-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-amber-500/5">
            <i className="fa-solid fa-crown text-amber-500 text-4xl animate-float"></i>
          </div>
          <p className="text-slate-500 font-medium text-sm">Join the elite Kenyan tribe.</p>
        </div>

        {/* PLANS SECTION */}
        <div className="space-y-4 mb-10">
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2 px-2">Choose Plan</p>
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => { setSelectedPlan(plan.id); setIsVerified(false); }}
              className={`w-full p-6 rounded-[2.5rem] border transition-all text-left flex items-center justify-between group ${
                selectedPlan === plan.id
                  ? 'bg-amber-500/10 border-amber-500'
                  : 'bg-slate-900/50 border-white/5'
              }`}
            >
              <div>
                <h3 className={`font-black uppercase tracking-widest text-[10px] mb-1 ${selectedPlan === plan.id ? 'text-amber-500' : 'text-slate-500'}`}>
                  {plan.title}
                </h3>
                <p className="text-white font-black text-xl">KSh {plan.price}</p>
                <p className="text-slate-500 text-[10px] mt-1 font-medium">{plan.description}</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === plan.id ? 'border-amber-500' : 'border-slate-800'}`}>
                {selectedPlan === plan.id && <div className="w-3 h-3 bg-amber-500 rounded-full"></div>}
              </div>
            </button>
          ))}
        </div>

        {/* PAYMENT STEPS */}
        <div className="space-y-6">
          <div className="bg-slate-900/80 rounded-[2.5rem] border border-white/5 p-8 relative overflow-hidden">
             <div className="flex items-start gap-4 mb-6">
                <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0">1</div>
                <div>
                   <h4 className="text-white font-black uppercase text-xs tracking-widest mb-2">Manual M-Pesa Transfer</h4>
                   <p className="text-slate-400 text-xs mb-4 font-medium">Send <span className="text-white font-black">KSh {plans.find(p => p.id === selectedPlan)?.price}</span> to the number below:</p>
                   <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                      <span className="text-xl font-black text-emerald-500 tracking-tighter">+254 748 510 136</span>
                      <button 
                        onClick={() => { navigator.clipboard.writeText("0748510136"); alert("Number copied!"); }}
                        className="text-slate-500 hover:text-white"
                      >
                         <i className="fa-solid fa-copy"></i>
                      </button>
                   </div>
                   <p className="text-[9px] text-slate-500 mt-2 font-bold uppercase tracking-widest italic">Recipient: <span className="text-white">ARRISON KARIMI</span></p>
                </div>
             </div>

             <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0">2</div>
                <div className="flex-1">
                   <h4 className="text-white font-black uppercase text-xs tracking-widest mb-2">Submit Proof</h4>
                   <p className="text-slate-500 text-[10px] mb-3 font-medium">Paste your full M-Pesa SMS confirmation below:</p>
                   <textarea 
                     value={proofMessage}
                     onChange={(e) => { setProofMessage(e.target.value); setIsVerified(false); setError(null); }}
                     placeholder="ID Confirmed. Ksh... sent to ARRISON KARIMI..."
                     className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl text-xs text-slate-300 outline-none focus:border-amber-500/50 min-h-[140px] font-mono leading-relaxed resize-none"
                   />
                </div>
             </div>

             {error && (
               <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 animate-in fade-in slide-in-from-top duration-300">
                  <i className="fa-solid fa-circle-exclamation text-sm"></i>
                  <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">{error}</p>
               </div>
             )}
          </div>

          {!isVerified ? (
            <button
              onClick={verifyMpesaFormat}
              disabled={isVerifying || !proofMessage.trim()}
              className="w-full bg-white text-slate-950 font-black py-6 rounded-[2.5rem] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm disabled:opacity-20"
            >
              {isVerifying ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Analyzing Format...
                </>
              ) : (
                'Check Proof Format'
              )}
            </button>
          ) : (
            <div className="space-y-4 animate-in zoom-in duration-300">
               <div className="bg-emerald-500/10 border border-emerald-500/50 p-4 rounded-2xl flex items-center gap-3 text-emerald-500">
                  <i className="fa-solid fa-circle-check"></i>
                  <p className="text-[10px] font-black uppercase tracking-widest">Structural format verified!</p>
               </div>
               <button
                onClick={handleSendProof}
                className="w-full bg-emerald-500 text-white font-black py-6 rounded-[2.5rem] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
              >
                <i className="fa-brands fa-whatsapp text-xl"></i>
                Send to Admin via WhatsApp
              </button>
              <p className="text-center text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                Clicking will open WhatsApp chat with support. <br/> Your account activates immediately after admin review.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Ambiance */}
      <div className="fixed top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[120px] pointer-events-none"></div>
    </div>
  );
};

export default PaymentScreen;
