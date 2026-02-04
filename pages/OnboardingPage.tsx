import React, { useState } from "react";
import { IntentType, KENYAN_AREAS, AGE_RANGES, UserProfile } from "../types";

interface Props {
  onComplete: (user: UserProfile) => void;
}

const OnboardingPage: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [realName, setRealName] = useState("");
  const [nickname, setNickname] = useState("");
  const [ageRange, setAgeRange] = useState(AGE_RANGES[1]);
  const [area, setArea] = useState(KENYAN_AREAS[0]);
  const [selectedIntents, setSelectedIntents] = useState<IntentType[]>([]);
  const [bio, setBio] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const toggleIntent = (intent: IntentType) => {
    setSelectedIntents((prev) =>
      prev.includes(intent)
        ? prev.filter((i) => i !== intent)
        : [...prev, intent],
    );
  };

  const simulateCapture = () => {
    setIsCapturing(true);
    setTimeout(() => {
      setCapturedPhoto(
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${nickname || "Guest"}`,
      );
      setIsCapturing(false);
    }, 1500);
  };

  const finish = () => {
    const newUser: UserProfile = {
      id: Math.random().toString(36).substr(2, 9),
      realName,
      nickname: nickname || "Ghost",
      ageRange,
      area,
      intents: selectedIntents,
      photoUrl: capturedPhoto || "",
      bio: bio || "Ready for the plot.",
      isAnonymous: true,
      isOnline: true,
      // Fix: Removed 'onboardingStep' property as it is not part of the UserProfile interface
    };
    onComplete(newUser);
  };

  return (
    <div className="min-h-screen bg-kipepeo-dark text-white p-6 flex flex-col font-sans">
      <div className="flex justify-between items-center mb-8">
        <div className="h-1 flex-1 bg-white/5 rounded-full mr-4 overflow-hidden">
          <div
            className="h-full bg-kipepeo-pink transition-all duration-500"
            style={{ width: `${(step / 5) * 100}%` }}
          ></div>
        </div>
        <span className="text-[10px] font-black text-kipepeo-pink tracking-widest">
          {step}/5
        </span>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full flex flex-col justify-center">
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-4xl font-black mb-2 neon-text">
              Privacy First.
            </h2>
            <p className="text-gray-500 mb-8 italic">
              Collected for safety. Never shown to others.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  Real Full Name
                </label>
                <input
                  type="text"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-1 focus:border-kipepeo-pink outline-none"
                  placeholder="Required for verification"
                />
              </div>
              <p className="text-[10px] text-gray-600">
                By continuing, you confirm you are 18+.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <h2 className="text-4xl font-black mb-2">Public Persona.</h2>
            <p className="text-gray-500 mb-8 italic">
              This is what people will see.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  Nickname / Display Name
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-1 focus:border-kipepeo-pink outline-none"
                  placeholder="e.g. Midnight_Rider"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  Age Range
                </label>
                <select
                  value={ageRange}
                  onChange={(e) => setAgeRange(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-1 focus:border-kipepeo-pink outline-none"
                >
                  {AGE_RANGES.map((r) => (
                    <option key={r} value={r} className="bg-kipepeo-dark">
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  Area / Base
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-1 focus:border-kipepeo-pink outline-none"
                >
                  {KENYAN_AREAS.map((a) => (
                    <option key={a} value={a} className="bg-kipepeo-dark">
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <h2 className="text-4xl font-black mb-2">Your Intents.</h2>
            <p className="text-gray-500 mb-8 italic">
              What are you looking for?
            </p>
            <div className="grid grid-cols-1 gap-2">
              {Object.values(IntentType).map((intent) => (
                <button
                  key={intent}
                  onClick={() => toggleIntent(intent)}
                  className={`p-4 rounded-xl border text-left flex justify-between items-center transition-all ${selectedIntents.includes(intent) ? "bg-kipepeo-pink/20 border-kipepeo-pink" : "bg-white/5 border-white/10 opacity-60"}`}
                >
                  <span className="font-bold text-sm uppercase tracking-tighter">
                    {intent}
                  </span>
                  {selectedIntents.includes(intent) && (
                    <span className="text-kipepeo-pink">✔</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 text-center">
            <h2 className="text-4xl font-black mb-2">Live Photo.</h2>
            <p className="text-gray-500 mb-10 italic">
              Strictly live selfie. No uploads allowed for safety.
            </p>

            <div className="w-64 h-64 mx-auto bg-white/5 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center overflow-hidden relative group">
              {capturedPhoto ? (
                <img
                  src={capturedPhoto}
                  className="w-full h-full object-cover"
                  alt="Selfie"
                />
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-4xl mb-2">📸</span>
                  <span className="text-[10px] font-bold text-gray-500">
                    CAMERA ONLY
                  </span>
                </div>
              )}
              {isCapturing && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-kipepeo-pink border-t-transparent animate-spin rounded-full"></div>
                </div>
              )}
            </div>

            <button
              onClick={simulateCapture}
              disabled={isCapturing}
              className="mt-10 px-8 py-3 bg-white text-black font-black rounded-full text-xs uppercase tracking-widest active:scale-95 transition-transform"
            >
              {capturedPhoto ? "Retake Selfie" : "Take Live Selfie"}
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <h2 className="text-4xl font-black mb-2">Final Vibe.</h2>
            <p className="text-gray-500 mb-8 italic">Write your bio.</p>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 outline-none mb-4 font-medium text-sm"
              placeholder="I'm here for..."
            />
          </div>
        )}
      </div>

      <div className="mt-auto">
        <button
          onClick={() => {
            if (step === 4 && !capturedPhoto)
              return alert("Live photo is mandatory for trust!");
            step < 5 ? setStep(step + 1) : finish();
          }}
          className="w-full py-5 bg-white text-black font-black rounded-[2rem] text-sm uppercase tracking-widest animate-pulse-glow"
        >
          {step === 5 ? "Vibe Check (Finish)" : "Continue"}
        </button>
      </div>
    </div>
  );
};

export default OnboardingPage;
