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

  // Create an array for the hearts
  const hearts = Array.from({ length: 50 });

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

    const supported =
      biometricSupported || (await isBiometricSupported());
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
      setToastMessage("Password reset email sent.");
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
      const authUser = await loginWithEmail(email.trim().toLowerCase(), password);
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
        setBiometricEnabled(false);
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
      {/* --- NEW ADDITION: Inline Styles for Heart Animation --- */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(100vh) scale(0.5); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(-70vh) scale(1.2); opacity: 0; }
        }
      `}</style>

      {/* --- NEW ADDITION: Background Image (Kilimanjaro/Nairobi vibe) --- */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/assets/images/mtKilimanjaro.png')", // Nairobi/Kenya scenic vibe
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.3, // Low opacity to blend with your dark theme
          mixBlendMode: "luminosity",
        }}
      ></div>

      {/* --- NEW ADDITION: Floating Hearts --- */}
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
              animationDelay: `${Math.random() * 5}s`,
            }}
          >
            ❤
          </div>
        ))}
      </div>

      {/* ORIGINAL CONTENT BELOW */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-kipepeo-pink/10 rounded-full blur-[120px] z-0"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-kipepeo-purple/10 rounded-full blur-[120px] z-0"></div>

      <div className="z-10 animate-float mb-12 relative">
        <h1 className="text-7xl font-black mb-2 text-gradient tracking-tighter neon-text">
          HUSHLY
        </h1>
        <p className="text-gray-500 font-black tracking-[0.5em] text-[10px] uppercase">
          After Hours • Anonymous
        </p>
      </div>

      <div className="z-10 max-w-sm w-full relative">
        <h2 className="text-4xl font-extrabold mb-4 leading-none">
          Find your weekend plot.
        </h2>

        <div className="space-y-4">
          <button
            onClick={() => navigate("/onboarding")}
            className="w-full py-5 px-8 bg-white text-black font-black rounded-2xl shadow-2xl transform transition-all active:scale-95 text-sm uppercase tracking-widest"
          >
            Register
          </button>
          {biometricSupported && (
            <button
              onClick={handleBiometricLogin}
              disabled={biometricBusy}
              className="w-full py-4 px-8 glass text-white font-bold rounded-2xl text-xs uppercase tracking-widest transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-95 disabled:opacity-60 flex items-center justify-center gap-3"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-kipepeo-pink"
              >
                <path d="M12 11c0-1.1.9-2 2-2" />
                <path d="M6 8c0-2.2 1.8-4 4-4" />
                <path d="M4 12c0-2.8 2.2-5 5-5" />
                <path d="M12 15c0 1.1.9 2 2 2" />
                <path d="M6 16c0 2.2 1.8 4 4 4" />
                <path d="M4 12c0 2.8 2.2 5 5 5" />
                <path d="M16 8c0-2.2 1.8-4 4-4" />
                <path d="M20 12c0-2.8-2.2-5-5-5" />
                <path d="M16 16c0 2.2 1.8 4 4 4" />
                <path d="M20 12c0 2.8-2.2 5-5 5" />
              </svg>
              <span>
                {biometricBusy ? "Checking biometrics..." : "Login with biometrics"}
              </span>
            </button>
          )}
          {biometricError && (
            <div className="text-[10px] text-red-400">{biometricError}</div>
          )}
          <button
            onClick={() => {
              setShowLogin((prev) => !prev);
              resetLogin();
            }}
            className="w-full py-5 px-8 glass text-white font-bold rounded-2xl text-xs uppercase tracking-widest transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-95"
          >
            {showLogin ? "Close Login" : "Log In"}
          </button>
        </div>

        {showLogin && (
          <div className="mt-6 glass rounded-2xl p-5 text-left space-y-4">
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
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-1 focus:border-kipepeo-pink outline-none text-sm"
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  onClick={handleCheckEmail}
                  disabled={isChecking}
                  className="w-full py-3 bg-white text-black font-black rounded-xl text-xs uppercase tracking-widest disabled:opacity-60"
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
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-1 focus:border-kipepeo-pink outline-none text-sm"
                    placeholder="Enter your password"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-gray-400">
                  <button
                    onClick={() => setLoginStep("email")}
                    className="text-kipepeo-pink"
                  >
                    Change Email
                  </button>
                  <button
                    onClick={handleForgotPassword}
                    disabled={isResetting}
                    className="text-white/70 disabled:opacity-60"
                  >
                    {isResetting ? "Sending..." : "Forgot Password?"}
                  </button>
                </div>
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="w-full py-3 bg-white text-black font-black rounded-xl text-xs uppercase tracking-widest disabled:opacity-60"
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
                    className="text-kipepeo-pink"
                  >
                    Change Email
                  </button>
                </div>
                <button
                  onClick={handleVerificationCheck}
                  disabled={isLoggingIn}
                  className="w-full py-3 bg-white text-black font-black rounded-xl text-xs uppercase tracking-widest disabled:opacity-60"
                >
                  {isLoggingIn ? "Checking..." : "I Have Verified"}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6">
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
                className="flex-1 py-3 glass text-white font-bold rounded-xl text-xs uppercase tracking-widest"
              >
                Not now
              </button>
              <button
                onClick={handleEnableBiometrics}
                disabled={biometricBusy}
                className="flex-1 py-3 bg-white text-black font-black rounded-xl text-xs uppercase tracking-widest disabled:opacity-60"
              >
                {biometricBusy ? "Enabling..." : "Enable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
