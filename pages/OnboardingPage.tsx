import React, { useEffect, useRef, useState } from "react";
import { deleteUser } from "firebase/auth";
import type { User } from "firebase/auth";
import { IntentType, KENYAN_AREAS, AGE_RANGES, UserProfile } from "../types";
import { uploadToCloudinary } from "../services/cloudinaryService";
import {
  clearSession,
  registerWithEmail,
  refreshUser,
  sendVerificationEmail,
} from "../services/authService";
import {
  createUserProfile,
  updateUserEmailVerification,
  nicknameExists,
} from "../services/userService";
import { getFriendlyAuthError } from "../firebaseErrors";
import AppImage from "../components/AppImage";

interface Props {
  onComplete: (user: UserProfile) => void;
}

const OnboardingPage: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [realName, setRealName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [ageRange, setAgeRange] = useState(AGE_RANGES[1]);
  const [area, setArea] = useState(KENYAN_AREAS[0]);
  const [selectedIntents, setSelectedIntents] = useState<IntentType[]>([]);
  const [bio, setBio] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [verificationUser, setVerificationUser] = useState<User | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<UserProfile | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [ageGateChecked, setAgeGateChecked] = useState(false);
  const [ageGateProfile, setAgeGateProfile] = useState<UserProfile | null>(null);
  const selfieInputRef = useRef<HTMLInputElement | null>(null);

  const normalizeEmail = (value: string) => value.trim().toLowerCase();

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const validatePassword = (value: string) => {
    if (!value) return "Please create a password.";
    if (value.length < 6) return "Password must be at least 6 characters.";
    return null;
  };

  const validateNickname = (value: string) => {
    if (!value.trim()) return "Nickname is required.";
    if (value.trim().length < 3) return "Nickname must be at least 3 characters.";
    return null;
  };

  const checkNicknameAvailability = async (value: string) => {
    const baseError = validateNickname(value);
    if (baseError) {
      setNicknameError(baseError);
      return false;
    }
    setIsCheckingNickname(true);
    setNicknameError(null);
    try {
      const exists = await nicknameExists(value);
      if (exists) {
        setNicknameError("Nickname already taken. Choose another.");
        return false;
      }
      return true;
    } catch (error) {
      console.error(error);
      setNicknameError("Unable to verify nickname. Try again.");
      return false;
    } finally {
      setIsCheckingNickname(false);
    }
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const toggleIntent = (intent: IntentType) => {
    setSelectedIntents((prev) =>
      prev.includes(intent)
        ? prev.filter((i) => i !== intent)
        : [...prev, intent],
    );
  };

  const openSelfieCamera = () => {
    if (!selfieInputRef.current) return;
    selfieInputRef.current.value = "";
    selfieInputRef.current.click();
  };

  const handleSelfieSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file.");
      return;
    }

    setErrorMessage(null);
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    setIsUploading(true);

    try {
      const uploadedUrl = await uploadToCloudinary(file);
      setCapturedPhoto(uploadedUrl);
      setPhotoPreview(null);
    } catch (error) {
      console.error(error);
      setErrorMessage("Selfie upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const finish = async () => {
    const trimmedEmail = normalizeEmail(email);
    if (!trimmedEmail || !password) {
      setErrorMessage("Email and password are required to register.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }
    if (!capturedPhoto) {
      setErrorMessage("Please take a live selfie before finishing.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    let authUser: User | null = null;
    try {
      authUser = await registerWithEmail(trimmedEmail, password);
      const nicknameTaken = await nicknameExists(nickname, authUser.uid);
      if (nicknameTaken) {
        setNicknameError("Nickname already taken. Choose another.");
        setErrorMessage("Nickname already taken. Choose another.");
        setStep(2);
        try {
          await deleteUser(authUser);
        } catch (deleteError) {
          console.error(deleteError);
        }
        try {
          await clearSession();
        } catch (signOutError) {
          console.error(signOutError);
        }
        return;
      }
      const newUser = buildUserProfile(authUser.uid);
      await createUserProfile(newUser);
      await sendVerificationEmail(authUser);
      setPendingProfile(newUser);
      setVerificationUser(authUser);
      setResendCooldown(30);
      setToastMessage("Verification email sent.");
    } catch (error: any) {
      console.error(error);
      const message = String(error?.message ?? "");
      if (message.includes("nickname-taken")) {
        setNicknameError("Nickname already taken. Choose another.");
        setErrorMessage("Nickname already taken. Choose another.");
        setStep(2);
        if (authUser) {
          try {
            await deleteUser(authUser);
          } catch (deleteError) {
            console.error(deleteError);
          }
          try {
            await clearSession();
          } catch (signOutError) {
            console.error(signOutError);
          }
        }
        return;
      }
      setErrorMessage(getFriendlyAuthError(error));
    } finally {
      setIsSaving(false);
    }
  };

  const buildUserProfile = (userId: string): UserProfile => ({
    id: userId,
    realName,
    nickname: nickname.trim(),
    nicknameLower: nickname.trim().toLowerCase(),
    email: normalizeEmail(email),
    emailVerified: false,
    isPremium: false,
    premiumExpiresAt: null,
    ageRange,
    area,
    intents: selectedIntents,
    photoUrl: capturedPhoto ?? "",
    bio: bio || "Ready for the plot.",
    isAnonymous: true,
    isOnline: true,
  });

  const handleVerificationCheck = async () => {
    if (!verificationUser) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await refreshUser(verificationUser);
      if (!verificationUser.emailVerified) {
        setErrorMessage("Email not verified yet. Please check your inbox.");
        return;
      }
      const baseProfile =
        pendingProfile ?? buildUserProfile(verificationUser.uid);
      const readyProfile: UserProfile = {
        ...baseProfile,
        email: normalizeEmail(verificationUser.email ?? baseProfile.email),
        emailVerified: true,
      };
      await updateUserEmailVerification(
        verificationUser.uid,
        true,
        normalizeEmail(verificationUser.email ?? baseProfile.email),
      );
      const accepted =
        localStorage.getItem("hushly_age_gate_main") === "1";
      if (accepted) {
        onComplete(readyProfile);
        return;
      }
      setAgeGateProfile(readyProfile);
      setAgeGateChecked(false);
      setShowAgeGate(true);
    } catch (error: any) {
      console.error(error);
      setErrorMessage("We couldn't verify your email. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationUser) return;
    if (resendCooldown > 0) return;
    setIsResending(true);
    setErrorMessage(null);
    try {
      await sendVerificationEmail(verificationUser);
      setResendCooldown(30);
      setToastMessage("Verification email sent.");
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to resend verification email.");
    } finally {
      setIsResending(false);
    }
  };

  if (verificationUser && !verificationUser.emailVerified) {
    return (
      <div className="min-h-screen bg-kipepeo-dark text-white p-6 flex flex-col items-center justify-center font-sans">
        <div className="max-w-md w-full text-center space-y-6 glass rounded-3xl p-8">
          <h2 className="text-3xl font-black">Verify Your Email</h2>
          <p className="text-gray-400 text-sm">
            We sent a verification link to{" "}
            <span className="text-white font-bold">
              {verificationUser.email ?? "your email"}
            </span>
            . Please verify to continue.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleVerificationCheck}
              disabled={isSaving}
              className="w-full py-3 bg-white text-black font-black rounded-xl text-xs uppercase tracking-widest disabled:opacity-60"
            >
              {isSaving ? "Checking..." : "I Have Verified"}
            </button>
            <button
              onClick={handleResendVerification}
              disabled={isResending || resendCooldown > 0}
              className="w-full py-3 glass text-white font-bold rounded-xl text-xs uppercase tracking-widest disabled:opacity-60"
            >
              {isResending
                ? "Resending..."
                : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend Email"}
            </button>
          </div>
          {toastMessage && (
            <p className="text-[10px] text-kipepeo-pink">{toastMessage}</p>
          )}
          {errorMessage && (
            <p className="text-[10px] text-red-400">{errorMessage}</p>
          )}
        </div>
      </div>
    );
  }

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
          <form
            className="animate-in fade-in slide-in-from-bottom-4"
            onSubmit={(event) => event.preventDefault()}
            noValidate
          >
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
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-1 focus:border-kipepeo-pink outline-none"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setPassword(nextValue);
                    if (passwordError) {
                      const nextError = validatePassword(nextValue);
                      setPasswordError(nextError);
                    }
                  }}
                  onBlur={() => {
                    const nextError = validatePassword(password);
                    setPasswordError(nextError);
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-1 focus:border-kipepeo-pink outline-none"
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                />
                {passwordError && (
                  <p className="text-[10px] text-red-400 mt-2">
                    {passwordError}
                  </p>
                )}
              </div>
              <p className="text-[10px] text-gray-600">
                By continuing, you confirm you are 18+.
              </p>
            </div>
          </form>
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
                  onChange={(e) => {
                    const value = e.target.value;
                    setNickname(value);
                    if (nicknameError) {
                      const nextError = validateNickname(value);
                      setNicknameError(nextError);
                    }
                  }}
                  onBlur={() => {
                    void checkNicknameAvailability(nickname);
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-1 focus:border-kipepeo-pink outline-none"
                  placeholder="e.g. Midnight_Rider"
                />
                {nicknameError && (
                  <p className="text-[10px] text-red-400 mt-2">
                    {nicknameError}
                  </p>
                )}
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
              Strictly live selfie. No avatars allowed for safety.
            </p>

            <div className="w-64 h-64 mx-auto bg-white/5 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center overflow-hidden relative group">
              {photoPreview || capturedPhoto ? (
                <AppImage
                  src={photoPreview ?? capturedPhoto ?? ""}
                  className="w-full h-full object-cover"
                  alt="Selfie"
                  loading="eager"
                  fetchPriority="high"
                />
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-4xl mb-2">📸</span>
                  <span className="text-[10px] font-bold text-gray-500">
                    CAMERA ONLY
                  </span>
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-kipepeo-pink border-t-transparent animate-spin rounded-full"></div>
                </div>
              )}
            </div>

            <input
              ref={selfieInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleSelfieSelected}
              className="hidden"
            />

            <button
              onClick={openSelfieCamera}
              disabled={isUploading || isSaving}
              className="mt-10 px-8 py-3 bg-white text-black font-black rounded-full text-xs uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-60"
            >
              {isUploading
                ? "Uploading..."
                : capturedPhoto
                  ? "Retake Selfie"
                  : "Take Live Selfie"}
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
          onClick={async () => {
            if (step === 1) {
              if (!realName.trim()) {
                setErrorMessage("Please enter your real name.");
                return;
              }
              if (!email.trim()) {
                setErrorMessage("Please enter your email.");
                return;
              }
              if (!email.includes("@")) {
                setErrorMessage("Please enter a valid email address.");
                return;
              }
              if (!password) {
                const nextError = validatePassword(password);
                setPasswordError(nextError);
                setErrorMessage(nextError ?? "Please create a password.");
                return;
              }
              if (password.length < 6) {
                const nextError = validatePassword(password);
                setPasswordError(nextError);
                setErrorMessage(nextError ?? "Password must be at least 6 characters.");
                return;
              }
              if (passwordError) {
                setErrorMessage(passwordError);
                return;
              }
            }
            if (step === 2) {
              const ok = await checkNicknameAvailability(nickname);
              if (!ok) {
                return;
              }
            }
            if (step === 4) {
              if (isUploading) {
                return alert("Uploading selfie. Please wait a moment.");
              }
              if (!capturedPhoto) {
                return alert("Live photo is mandatory for trust!");
              }
            }
            setErrorMessage(null);
            step < 5 ? setStep(step + 1) : void finish();
          }}
          disabled={isUploading || isSaving || isCheckingNickname}
          className="w-full py-5 bg-white text-black font-black rounded-[2rem] text-sm uppercase tracking-widest animate-pulse-glow disabled:opacity-60"
        >
          {step === 5 ? (isSaving ? "Saving..." : "Vibe Check (Finish)") : "Continue"}
        </button>
        {errorMessage && (
          <p className="mt-3 text-[10px] text-red-400 text-center">{errorMessage}</p>
        )}
      </div>

      {showAgeGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6">
          <div className="w-full max-w-md glass rounded-3xl border border-white/10 p-6 space-y-4 text-center">
            <h3 className="text-xl font-black uppercase tracking-widest">
              Age Gate
            </h3>
            <p className="text-sm text-gray-300">
              You must be 18+ to continue.
            </p>
            <label className="flex items-center gap-3 text-sm text-gray-300 justify-center">
              <input
                type="checkbox"
                checked={ageGateChecked}
                onChange={(e) => setAgeGateChecked(e.target.checked)}
                className="w-4 h-4 accent-kipepeo-pink"
              />
              I confirm I am at least 18 years old.
            </label>
            <p className="text-[10px] text-gray-500">
              By continuing, you agree that you are of legal age in your
              jurisdiction and understand this app contains adult content.
            </p>
            <button
              onClick={() => {
                if (!ageGateChecked || !ageGateProfile) return;
                localStorage.setItem("hushly_age_gate_main", "1");
                setShowAgeGate(false);
                onComplete(ageGateProfile);
              }}
              disabled={!ageGateChecked}
              className="w-full py-3 bg-white text-black font-black rounded-xl text-xs uppercase tracking-widest disabled:opacity-60"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingPage;
