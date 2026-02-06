import React, { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  clearSession,
  checkEmailExists,
  loginWithEmail,
  refreshUser,
  sendVerificationEmail,
  sendPasswordReset,
} from "../services/authService";
import { auth } from "../firebase";
import {
  getUserProfile,
  updateUserEmailVerification,
} from "../services/userService";
import { getFriendlyAuthError } from "../firebaseErrors";
import { UserProfile } from "../types";
import {
  biometricLogin,
  clearBiometricData,
  dismissBiometricPrompt,
  enableBiometricLogin,
  isBiometricEnabled,
  isBiometricSupported,
  wasBiometricPromptDismissed,
} from "../services/biometricService";

interface Props {
  onLogin: (user: UserProfile) => void;
}

const LandingPage: React.FC<Props> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [loginStep, setLoginStep] = useState<"email" | "password" | "verify">(
    "email",
  );
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [biometricPromptError, setBiometricPromptError] = useState<
    string | null
  >(null);
  const [pendingBiometricProfile, setPendingBiometricProfile] =
    useState<UserProfile | null>(null);
  const [pendingBiometricPassword, setPendingBiometricPassword] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetModalEmail, setResetModalEmail] = useState("");

  // Create an array for the hearts
  const hearts = Array.from({ length: 200 });

  const normalizeEmail = (value?: string | null) =>
    (value ?? "").trim().toLowerCase();

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    let active = true;
    isBiometricSupported()
      .then((supported) => {
        if (!active) return;
        setBiometricSupported(supported);
      })
      .catch((error) => {
        console.error(error);
        if (active) {
          setBiometricSupported(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser || currentUser.emailVerified) {
        return;
      }
      setPendingUser(currentUser);
      setLoginEmail(currentUser.email ?? "");
      setLoginStep("verify");
      setShowLogin(true);
      setLoginError("Your email is not verified. Please verify to continue.");
    });

    return () => unsubscribe();
  }, []);

  const resetLogin = () => {
    setLoginStep("email");
    setLoginPassword("");
    setLoginError(null);
    setLoginNotice(null);
    setBiometricError(null);
    setBiometricPromptError(null);
    setShowBiometricPrompt(false);
    setPendingBiometricProfile(null);
    setPendingBiometricPassword("");
    setResetModalOpen(false);
    setResetModalEmail("");
    setPendingUser(null);
    setResendCooldown(0);
    setToastMessage(null);
  };

  const finalizeLogin = async (
    authUser: User,
    options?: { password?: string; skipBiometricPrompt?: boolean },
  ) => {
    if (!authUser.emailVerified) {
      setPendingUser(authUser);
      setLoginStep("verify");
      setLoginError("Your email is not verified. Please verify to continue.");
      try {
        await sendVerificationEmail(authUser);
        setResendCooldown(30);
        setToastMessage("Verification email sent.");
      } catch (sendError) {
        console.error(sendError);
      }
      return;
    }

    const profile = await getUserProfile(authUser.uid);
    if (!profile) {
      await clearSession();
      setLoginError("Profile not found. Please register instead.");
      return;
    }
    if (!profile.emailVerified || !profile.email) {
      await updateUserEmailVerification(
        authUser.uid,
        true,
        normalizeEmail(authUser.email ?? profile.email),
      );
      profile.emailVerified = true;
      const normalized = normalizeEmail(authUser.email ?? profile.email);
      if (normalized) {
        profile.email = normalized;
      }
    }

    const supported = biometricSupported || (await isBiometricSupported());
    const canPromptBiometric =
      !options?.skipBiometricPrompt &&
      supported &&
      !isBiometricEnabled() &&
      !wasBiometricPromptDismissed() &&
      Boolean(options?.password);

    if (canPromptBiometric) {
      setPendingBiometricProfile(profile);
      setPendingBiometricPassword(options?.password ?? "");
      setShowBiometricPrompt(true);
      return;
    }

    onLogin(profile);
    resetLogin();
  };

  const handleCheckEmail = async () => {
    const trimmedEmail = loginEmail.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setLoginError("Please enter a valid email address.");
      return;
    }

    setIsChecking(true);
    setLoginError(null);
    setLoginNotice(null);
    setBiometricError(null);
    try {
      const exists = await checkEmailExists(trimmedEmail);
      if (!exists) {
        setLoginNotice(
          "We couldn't confirm this email yet. If you already have an account, continue with your password.",
        );
        setLoginStep("password");
        return;
      }
      setLoginStep("password");
    } catch (error) {
      console.error(error);
      setLoginError("We couldn't verify your email. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogin = async () => {
    if (!loginPassword) {
      setLoginError("Please enter your password.");
      return;
    }
    setIsLoggingIn(true);
    setLoginError(null);
    setLoginNotice(null);
    setBiometricError(null);
    try {
      const authUser = await loginWithEmail(
        loginEmail.trim().toLowerCase(),
        loginPassword,
      );
      await finalizeLogin(authUser, { password: loginPassword });
    } catch (error: any) {
      console.error(error);
      setLoginError(getFriendlyAuthError(error));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleVerificationCheck = async () => {
    if (!pendingUser) return;
    setIsLoggingIn(true);
    setLoginError(null);
    setLoginNotice(null);
    setBiometricError(null);
    try {
      await refreshUser(pendingUser);
      await finalizeLogin(pendingUser, { password: loginPassword });
    } catch (error) {
      console.error(error);
      setLoginError("We couldn't verify your email. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingUser) return;
    if (resendCooldown > 0) return;
    setIsResending(true);
    setLoginError(null);
    try {
      await sendVerificationEmail(pendingUser);
      setResendCooldown(30);
      setToastMessage("Verification email sent.");
    } catch (error) {
      console.error(error);
      setLoginError("Failed to resend verification email.");
    } finally {
      setIsResending(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = loginEmail.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setLoginError("Please enter a valid email address first.");
      return;
    }
    setIsResetting(true);
    setLoginError(null);
    setLoginNotice(null);
    try {
      await sendPasswordReset(trimmedEmail);
      setResetModalEmail(trimmedEmail);
      setResetModalOpen(true);
    } catch (error: any) {
      console.error(error);
      setLoginError(getFriendlyAuthError(error));
    } finally {
      setIsResetting(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricError(null);
    setLoginError(null);
    setLoginNotice(null);

    if (!biometricSupported) {
      setBiometricError("Biometric login is unavailable on this device.");
      return;
    }
    if (!isBiometricEnabled()) {
      setBiometricError(
        "Biometric login is not set up on this device. Please log in using email and password.",
      );
      return;
    }

    setBiometricBusy(true);
    try {
      const { email, password } = await biometricLogin();
      setLoginEmail(email);
      setLoginPassword(password);
      const authUser = await loginWithEmail(
        email.trim().toLowerCase(),
        password,
      );
      await finalizeLogin(authUser, { skipBiometricPrompt: true });
    } catch (error: any) {
      console.error(error);
      const message = String(error?.message ?? "");
      if (message.includes("biometric-not-enabled")) {
        setBiometricError(
          "Biometric login is not set up on this device. Please log in using email and password.",
        );
      } else if (message.includes("biometric-cancelled")) {
        setBiometricError(
          "Biometric authentication was cancelled. Try again or use email/password.",
        );
      } else if (
        error?.code === "auth/wrong-password" ||
        error?.code === "auth/user-not-found"
      ) {
        clearBiometricData();
        setBiometricError(
          "Biometric login needs to be set up again. Please log in with email and password.",
        );
      } else {
        setBiometricError(
          "Biometric login failed. Try again or use email/password.",
        );
      }
    } finally {
      setBiometricBusy(false);
    }
  };

  const handleEnableBiometrics = async () => {
    if (!pendingBiometricProfile) return;
    setBiometricPromptError(null);
    setBiometricBusy(true);
    try {
      await enableBiometricLogin({
        userId: pendingBiometricProfile.id,
        email: pendingBiometricProfile.email,
        displayName: pendingBiometricProfile.nickname,
        password: pendingBiometricPassword,
      });
      setShowBiometricPrompt(false);
      onLogin(pendingBiometricProfile);
      resetLogin();
    } catch (error) {
      console.error(error);
      setBiometricPromptError(
        "Unable to enable biometrics right now. You can try again later.",
      );
      setShowBiometricPrompt(false);
      onLogin(pendingBiometricProfile);
      resetLogin();
    } finally {
      setBiometricBusy(false);
    }
  };

  const handleDeclineBiometrics = () => {
    dismissBiometricPrompt();
    setShowBiometricPrompt(false);
    if (pendingBiometricProfile) {
      onLogin(pendingBiometricProfile);
      resetLogin();
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-kipepeo-dark flex flex-col items-center justify-center p-6 text-center font-sans">
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(100vh) scale(0.5); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(-70vh) scale(1.2); opacity: 0; }
        }
      `}</style>

      {/* Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/assets/images/mtKilimanjaro.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.3,
          mixBlendMode: "luminosity",
        }}
      ></div>

      {/* Floating Hearts */}
      <div className="hearts absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {hearts.map((_, i) => (
          <div
            key={i}
            className="absolute text-kipepeo-red/90"
            style={{
              content: '"❤"',
              left: `${Math.random() * 100}%`,
              bottom: "-50px",
              fontSize: `${Math.random() * 20 + 10}px`,
              animation: `floatUp ${Math.random() * 10 + 10}s linear infinite`,
              animationDelay: `-${Math.random() * 10}s`,
            }}
          >
            ❤
          </div>
        ))}
      </div>

      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-kipepeo-pink/10 rounded-full blur-[120px] z-0"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-kipepeo-purple/10 rounded-full blur-[120px] z-0"></div>

      <div className="z-10 animate-float mb-8 relative">
        <h1 className="text-7xl font-black mb-2 text-gradient tracking-tighter neon-text">
          HUSHLY
        </h1>
        <p className="text-gray-500 font-black tracking-[0.5em] text-[10px] uppercase">
          After Hours • Anonymous
        </p>
      </div>

      <div className="z-10 max-w-sm w-full relative">
        {!showLogin && (
          <h2 className="text-4xl font-extrabold mb-6 leading-none">
            Weekend iko sorted.
          </h2>
        )}

        <div className="space-y-4">
          {/* Register Button - kept prominent */}
          {!showLogin && (
            <button
              onClick={() => navigate("/onboarding")}
              className="w-full py-5 px-8 bg-white text-black font-black rounded-2xl shadow-2xl transform transition-all active:scale-95 text-sm uppercase tracking-widest hover:shadow-white/20"
            >
              Register
            </button>
          )}

          {/* Login Toggle Button */}
          <button
            onClick={() => {
              setShowLogin((prev) => !prev);
              resetLogin();
            }}
            className={`w-full py-5 px-8 glass text-white font-bold rounded-2xl text-xs uppercase tracking-widest transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-95 ${showLogin ? "border-kipepeo-pink/50 bg-white/5" : ""}`}
          >
            {showLogin ? "Close Login" : "Log In with Email"}
          </button>
        </div>

        {/* --- REDESIGNED BIOMETRIC SCANNER --- */}
        {/* 
         Moved outside the main button stack for prominence.
         Visual: A glowing, pulsing circular button that mimics a fingerprint scanner.
      */}
        {biometricSupported && !showLogin && (
          <div className="z-10 relative mb-8 mt-8 flex flex-col items-center">
            <button
              onClick={handleBiometricLogin}
              disabled={biometricBusy}
              className="group relative flex items-center justify-center outline-none"
            >
              {/* Pulsing Glow Background */}
              <div className="absolute inset-0 rounded-full bg-kipepeo-pink/40 blur-xl transition-all duration-700 group-hover:blur-2xl group-hover:bg-kipepeo-pink/60 animate-pulse"></div>

              {/* The Scanner Button */}
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:border-kipepeo-pink/50 group-active:scale-95">
                {biometricBusy ? (
                  // Spinner when busy
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-kipepeo-pink border-t-transparent"></div>
                ) : (
                  // Fingerprint Icon
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-10 w-10 text-white/80 transition-colors group-hover:text-kipepeo-pink"
                  >
                    <path d="M12 10a2 2 0 0 0-2 2c0 1.07.93 2 2 2s2-.93 2-2-2-2-2-2" />
                    <path d="M9.43 5.51a5 5 0 0 1 5.14 0" />
                    <path d="M16.46 16.46a5 5 0 0 1-5.14 0" />
                    <path d="M19 12a7 7 0 0 1-1.37 4" />
                    <path d="M6.37 16a7 7 0 0 1-1.37-4" />
                    <path d="M18.3 7.3a7.5 7.5 0 0 0-12.6 0" />
                    <path d="M7 12a5 5 0 0 1 10 0" />
                  </svg>
                )}
              </div>
            </button>

            {/* Label under scanner */}
            <div className="mt-3 flex flex-col items-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 transition-colors group-hover:text-white">
                {biometricBusy ? "Scanning..." : "Touch to Unlock"}
              </span>
              {biometricError && (
                <span className="max-w-[200px] text-[9px] text-red-400 leading-tight">
                  {biometricError}
                </span>
              )}
            </div>
          </div>
        )}
        {/* --- END BIOMETRIC SCANNER --- */}

        {showLogin && (
          <div className="mt-6 glass rounded-2xl p-5 text-left space-y-4 animate-fadeIn">
            {loginStep === "email" && (
              <>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Email
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      if (loginError) setLoginError(null);
                      if (loginNotice) setLoginNotice(null);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-1 focus:border-kipepeo-pink outline-none text-sm transition-all"
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  onClick={handleCheckEmail}
                  disabled={isChecking}
                  className="w-full py-3 bg-white text-black font-black rounded-xl text-xs uppercase tracking-widest disabled:opacity-60 hover:bg-gray-100 transition-colors"
                >
                  {isChecking ? "Checking..." : "Continue"}
                </button>
              </>
            )}

            {loginStep === "password" && (
              <>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Confirm Email
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    disabled
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-1 text-sm opacity-70"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (loginError) setLoginError(null);
                      if (loginNotice) setLoginNotice(null);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-1 focus:border-kipepeo-pink outline-none text-sm transition-all"
                    placeholder="Enter your password"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-gray-400">
                  <button
                    onClick={handleForgotPassword}
                    disabled={isResetting}
                    className="text-white/70 disabled:opacity-60 hover:text-white transition-colors"
                  >
                    {isResetting ? "Sending..." : "Forgot Password?"}
                  </button>
                </div>
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="w-full py-3 bg-white text-black font-black rounded-xl text-xs uppercase tracking-widest disabled:opacity-60 hover:bg-gray-100 transition-colors"
                >
                  {isLoggingIn ? "Logging In..." : "Log In"}
                </button>
              </>
            )}

            {loginStep === "verify" && (
              <>
                <div className="text-sm text-gray-300">
                  We sent a verification link to{" "}
                  <span className="text-white font-bold">
                    {pendingUser?.email ?? loginEmail}
                  </span>
                  . Please verify to continue.
                </div>
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-gray-400">
                  <button
                    onClick={() => setLoginStep("email")}
                    className="text-kipepeo-pink hover:text-white transition-colors"
                  >
                    Change Email
                  </button>
                </div>
                <button
                  onClick={handleVerificationCheck}
                  disabled={isLoggingIn}
                  className="w-full py-3 bg-white text-black font-black rounded-xl text-xs uppercase tracking-widest disabled:opacity-60 hover:bg-gray-100 transition-colors"
                >
                  {isLoggingIn ? "Checking..." : "I Have Verified"}
                </button>
                <button
                  onClick={handleResendVerification}
                  disabled={isResending || resendCooldown > 0}
                  className="w-full py-3 glass text-white font-bold rounded-xl text-xs uppercase tracking-widest disabled:opacity-60 hover:bg-white/10 transition-colors"
                >
                  {isResending
                    ? "Resending..."
                    : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend Email"}
                </button>
              </>
            )}

            {loginError && (
              <div className="text-[10px] text-red-400">
                {loginError}{" "}
                {loginError.toLowerCase().includes("register") && (
                  <button
                    onClick={() => navigate("/onboarding")}
                    className="text-kipepeo-pink underline ml-1"
                  >
                    Register
                  </button>
                )}
              </div>
            )}

            {loginNotice && (
              <div className="text-[10px] text-gray-400">{loginNotice}</div>
            )}

            {toastMessage && (
              <div className="text-[10px] text-kipepeo-pink">
                {toastMessage}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="absolute bottom-8 flex flex-col items-center space-y-2 z-10">
        <div className="flex space-x-4 grayscale opacity-40">
          <span className="text-xs font-bold">PRIVATE</span>
          <span className="text-xs font-bold">REAL-TIME</span>
          <span className="text-xs font-bold">KENYA</span>
        </div>
        <p className="text-[8px] text-gray-700 uppercase font-black">
          18+ Only • Strictly Weekend Vibes
        </p>
      </div>
      {showBiometricPrompt && pendingBiometricProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6 backdrop-blur-sm">
          <div className="w-full max-w-md glass rounded-3xl border border-white/10 p-6 space-y-4 text-center">
            <h3 className="text-xl font-black uppercase tracking-widest">
              Enable Biometrics?
            </h3>
            <p className="text-sm text-gray-300">
              Enable biometric login for faster access next time?
            </p>
            {biometricPromptError && (
              <p className="text-[10px] text-red-400">{biometricPromptError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDeclineBiometrics}
                className="flex-1 py-3 glass text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-white/10 transition-colors"
              >
                Not now
              </button>
              <button
                onClick={handleEnableBiometrics}
                disabled={biometricBusy}
                className="flex-1 py-3 bg-white text-black font-black rounded-xl text-xs uppercase tracking-widest disabled:opacity-60 hover:bg-gray-100 transition-colors"
              >
                {biometricBusy ? "Enabling..." : "Enable"}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md transition-all duration-300">
          {/* Animation Wrapper */}
          <div className="relative w-full max-w-sm scale-100 transform transition-all">
            {/* Glow Effect behind the card */}
            <div className="absolute inset-0 -z-10 mx-auto h-full w-3/4 rounded-full bg-kipepeo-pink/20 blur-[60px]"></div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#121212]/90 p-8 text-center shadow-2xl backdrop-blur-xl">
              {/* Decorative Top Line */}
              <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-kipepeo-pink via-purple-500 to-kipepeo-pink opacity-70"></div>

              {/* Animated Icon */}
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 shadow-[0_0_40px_-10px_rgba(236,72,153,0.3)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="h-9 w-9 text-kipepeo-pink animate-bounce"
                  style={{ animationDuration: "2s" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>

              {/* Main Headings */}
              <h3 className="mb-2 text-2xl font-black tracking-tight text-white">
                Check Your Inbox
              </h3>

              <p className="mb-6 text-sm leading-relaxed text-gray-400">
                We've sent a secure reset link to:
                <br />
                <span className="mt-1 block bg-gradient-to-r from-kipepeo-pink to-purple-400 bg-clip-text font-bold text-transparent">
                  {resetModalEmail}
                </span>
              </p>

              {/* Helpful Tip Box */}
              <div className="mb-6 rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="flex items-start gap-3 text-left">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="mt-0.5 h-4 w-4 shrink-0 text-gray-500"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                    Can't find it? Check your{" "}
                    <span className="text-white">Spam</span> or{" "}
                    <span className="text-white">Junk</span> folder.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setResetModalOpen(false)}
                className="group relative w-full overflow-hidden rounded-xl bg-white py-3.5 text-xs font-black uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.02] active:scale-95"
              >
                <span className="relative z-10">Got It</span>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-50 transition-transform duration-700 group-hover:translate-x-full"></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
