import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { getFriendlyAuthError } from "../firebaseErrors";
import {
  changeEmail,
  changePassword,
  clearSession,
  refreshUser,
  sendPasswordReset,
  sendVerificationEmail,
} from "../services/authService";
import {
  getUserSettings,
  updateUserEmailVerification,
  updateUserProfile,
  updateUserSettings,
} from "../services/userService";
import { DEFAULT_USER_SETTINGS, UserProfile, UserSettings } from "../types";
import { detectSafetySignals } from "../services/aiService";

interface Props {
  user: UserProfile;
  onUserUpdated: (user: UserProfile) => void;
}

const SecurityPrivacyPage: React.FC<Props> = ({ user, onUserUpdated }) => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    let active = true;
    getUserSettings(user.id)
      .then((data) => {
        if (!active) return;
        setSettings(data);
      })
      .catch((error) => {
        console.error(error);
        setErrorMessage("Failed to load security settings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user.id]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const updateSettings = async (
    key: keyof UserSettings,
    value: UserSettings[keyof UserSettings],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSavingKey(key);
    setErrorMessage(null);
    try {
      await updateUserSettings(user.id, { [key]: value });
      if (key === "showOnlineStatus") {
        const nextUser = { ...user, isOnline: Boolean(value) };
        await updateUserProfile(user.id, { isOnline: Boolean(value) });
        onUserUpdated(nextUser);
      }
      setMessage("Settings updated.");
    } catch (error) {
      console.error(error);
      setErrorMessage("Could not update settings.");
    } finally {
      setSavingKey(null);
    }
  };

  const toggleAnonymous = async () => {
    const nextValue = !user.isAnonymous;
    setSavingKey("anonymous");
    setErrorMessage(null);
    try {
      await updateUserProfile(user.id, { isAnonymous: nextValue });
      onUserUpdated({ ...user, isAnonymous: nextValue });
      setMessage("Privacy updated.");
    } catch (error) {
      console.error(error);
      setErrorMessage("Could not update privacy mode.");
    } finally {
      setSavingKey(null);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("Please fill in all password fields.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords do not match.");
      return;
    }
    setIsUpdatingPassword(true);
    setErrorMessage(null);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated successfully.");
    } catch (error: any) {
      console.error(error);
      setErrorMessage(getFriendlyAuthError(error));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handlePasswordReset = async () => {
    const email = user.email.trim().toLowerCase();
    if (!email) {
      setErrorMessage("No email on file.");
      return;
    }
    setIsResetting(true);
    setErrorMessage(null);
    try {
      await sendPasswordReset(email);
      setMessage("Password reset email sent.");
    } catch (error: any) {
      console.error(error);
      setErrorMessage(getFriendlyAuthError(error));
    } finally {
      setIsResetting(false);
    }
  };

  const handleResendVerification = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || resendCooldown > 0) return;
    setIsResending(true);
    setErrorMessage(null);
    try {
      await sendVerificationEmail(currentUser);
      setResendCooldown(30);
      setMessage("Verification email sent.");
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to resend verification email.");
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setIsVerifying(true);
    setErrorMessage(null);
    try {
      await refreshUser(currentUser);
      if (!currentUser.emailVerified) {
        setErrorMessage("Email not verified yet. Please check your inbox.");
        return;
      }
      await updateUserEmailVerification(
        user.id,
        true,
        currentUser.email ?? user.email,
      );
      onUserUpdated({
        ...user,
        emailVerified: true,
        email: currentUser.email ?? user.email,
      });
      setMessage("Email verified.");
    } catch (error) {
      console.error(error);
      setErrorMessage("We couldn't confirm verification.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleEmailUpdate = async () => {
    const normalized = newEmail.trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) {
      setErrorMessage("Please enter a valid email.");
      return;
    }
    if (!emailPassword) {
      setErrorMessage("Please confirm your current password.");
      return;
    }
    setIsUpdatingEmail(true);
    setErrorMessage(null);
    try {
      await changeEmail(emailPassword, normalized);
      await updateUserEmailVerification(user.id, false, normalized);
      setMessage("Email updated. Please verify the new email.");
      await clearSession();
      navigate("/");
    } catch (error: any) {
      console.error(error);
      setErrorMessage(getFriendlyAuthError(error));
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const safetyScan = useMemo(
    () =>
      detectSafetySignals({
        nickname: user.nickname,
        bio: user.bio,
        email: user.email,
      }),
    [user.nickname, user.bio, user.email],
  );

  const ToggleRow = ({
    label,
    description,
    enabled,
    onToggle,
    disabled,
  }: {
    label: string;
    description?: string;
    enabled: boolean;
    onToggle: () => void;
    disabled?: boolean;
  }) => (
    <div className="flex items-center justify-between p-4 glass rounded-2xl border border-white/5">
      <div>
        <p className="text-xs font-black uppercase tracking-widest">
          {label}
        </p>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`w-12 h-6 rounded-full border transition-colors ${
          enabled ? "bg-kipepeo-pink/80 border-kipepeo-pink" : "bg-white/5 border-white/10"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        ></span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-kipepeo-dark text-white font-sans flex flex-col">
      <header className="p-6 flex justify-between items-center border-b border-white/5 bg-kipepeo-dark sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <Link to="/profile" className="text-2xl active:scale-90 transition-transform">
            â†
          </Link>
          <h1 className="text-xl font-black uppercase tracking-widest">
            Security & Privacy
          </h1>
        </div>
      </header>

      <div className="p-6 flex-1 overflow-y-auto no-scrollbar space-y-6">
        {loading ? (
          <div className="text-center text-gray-500 text-base">Loading...</div>
        ) : (
          <>
            <section className="glass rounded-[2rem] p-6 border border-white/5 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">
                Account Security
              </h2>
              <div className="flex items-center justify-between text-base">
                <span className="text-gray-400">Email</span>
                <span className="font-bold">{user.email}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Verification</span>
                <span
                  className={`font-bold ${
                    user.emailVerified ? "text-green-400" : "text-kipepeo-pink"
                  }`}
                >
                  {user.emailVerified ? "Verified" : "Not Verified"}
                </span>
              </div>

              {!user.emailVerified && (
                <div className="space-y-3">
                  <button
                    onClick={handleCheckVerification}
                    disabled={isVerifying}
                    className="w-full py-3 bg-white text-black font-black rounded-xl text-sm uppercase tracking-widest disabled:opacity-60"
                  >
                    {isVerifying ? "Checking..." : "I Have Verified"}
                  </button>
                  <button
                    onClick={handleResendVerification}
                    disabled={isResending || resendCooldown > 0}
                    className="w-full py-3 glass text-white font-bold rounded-xl text-sm uppercase tracking-widest disabled:opacity-60"
                  >
                    {isResending
                      ? "Resending..."
                      : resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : "Resend Email"}
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-1 focus:border-kipepeo-pink outline-none text-base"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-1 focus:border-kipepeo-pink outline-none text-base"
                    placeholder="New password"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-1 focus:border-kipepeo-pink outline-none text-base"
                    placeholder="Confirm new password"
                  />
                </div>
                <button
                  onClick={handlePasswordUpdate}
                  disabled={isUpdatingPassword}
                  className="w-full py-3 bg-white text-black font-black rounded-xl text-sm uppercase tracking-widest disabled:opacity-60"
                >
                  {isUpdatingPassword ? "Updating..." : "Update Password"}
                </button>
                <button
                  onClick={handlePasswordReset}
                  disabled={isResetting}
                  className="w-full py-3 glass text-white font-bold rounded-xl text-sm uppercase tracking-widest disabled:opacity-60"
                >
                  {isResetting ? "Sending..." : "Send Password Reset Email"}
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">
                  Change Email
                </h3>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">
                    New Email
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-1 focus:border-kipepeo-pink outline-none text-base"
                    placeholder="name@example.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-1 focus:border-kipepeo-pink outline-none text-base"
                    placeholder="Confirm password"
                  />
                </div>
                <button
                  onClick={handleEmailUpdate}
                  disabled={isUpdatingEmail}
                  className="w-full py-3 bg-white text-black font-black rounded-xl text-sm uppercase tracking-widest disabled:opacity-60"
                >
                  {isUpdatingEmail ? "Updating..." : "Update Email"}
                </button>
                <p className="text-xs text-gray-500">
                  You will be logged out and asked to verify the new email.
                </p>
              </div>
            </section>

            <section className="glass rounded-[2rem] p-6 border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">
                  AI Safety Scan
                </h2>
                <span
                  className={`text-[10px] font-black uppercase tracking-widest ${
                    safetyScan.level === "medium"
                      ? "text-amber-300"
                      : "text-emerald-300"
                  }`}
                >
                  {safetyScan.level === "medium" ? "Attention" : "Clear"}
                </span>
              </div>
              {safetyScan.issues.length === 0 ? (
                <p className="text-sm text-emerald-200">
                  No major safety signals detected. You look authentic.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-amber-200">
                    We noticed a few signals that could affect trust:
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    {safetyScan.issues.map((issue) => (
                      <li key={issue}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {safetyScan.tips.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">
                    AI Tips
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    {safetyScan.tips.map((tip) => (
                      <li key={tip}>• {tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">
                Privacy Controls
              </h2>
              <ToggleRow
                label="Anonymous Mode"
                description="Hide your real identity from matches."
                enabled={user.isAnonymous}
                onToggle={toggleAnonymous}
                disabled={savingKey === "anonymous"}
              />
              <ToggleRow
                label="Show Online Status"
                description="Let others know when you are active."
                enabled={settings.showOnlineStatus}
                onToggle={() =>
                  updateSettings("showOnlineStatus", !settings.showOnlineStatus)
                }
                disabled={savingKey === "showOnlineStatus"}
              />
              <ToggleRow
                label="Discoverable"
                description="Allow your profile to appear in discovery."
                enabled={settings.discoverable}
                onToggle={() =>
                  updateSettings("discoverable", !settings.discoverable)
                }
                disabled={savingKey === "discoverable"}
              />
              <ToggleRow
                label="Message Requests"
                description="Allow new people to message you."
                enabled={settings.allowMessageRequests}
                onToggle={() =>
                  updateSettings(
                    "allowMessageRequests",
                    !settings.allowMessageRequests,
                  )
                }
                disabled={savingKey === "allowMessageRequests"}
              />
              <ToggleRow
                label="Read Receipts"
                description="Show when you have read a message."
                enabled={settings.readReceipts}
                onToggle={() =>
                  updateSettings("readReceipts", !settings.readReceipts)
                }
                disabled={savingKey === "readReceipts"}
              />
              <div className="flex items-center justify-between p-4 glass rounded-2xl border border-white/5">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">
                    Location Precision
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Control how precise your location appears.
                  </p>
                </div>
                <select
                  value={settings.locationPrecision}
                  onChange={(event) =>
                    updateSettings(
                      "locationPrecision",
                      event.target.value as UserSettings["locationPrecision"],
                    )
                  }
                  className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs"
                >
                  <option value="city">City</option>
                  <option value="neighborhood">Neighborhood</option>
                </select>
              </div>
              <ToggleRow
                label="Data Sharing"
                description="Allow anonymized data sharing for improvements."
                enabled={settings.dataSharing}
                onToggle={() =>
                  updateSettings("dataSharing", !settings.dataSharing)
                }
                disabled={savingKey === "dataSharing"}
              />
              <ToggleRow
                label="Login Alerts"
                description="Get alerts for new logins."
                enabled={settings.loginAlerts}
                onToggle={() =>
                  updateSettings("loginAlerts", !settings.loginAlerts)
                }
                disabled={savingKey === "loginAlerts"}
              />
            </section>

            {(message || errorMessage) && (
              <div
                className={`text-xs ${
                  errorMessage ? "text-red-400" : "text-kipepeo-pink"
                }`}
              >
                {errorMessage ?? message}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SecurityPrivacyPage;

