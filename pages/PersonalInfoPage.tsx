import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { uploadToCloudinary } from "../services/cloudinaryService";
import { nicknameExists, updateUserProfile } from "../services/userService";
import { AGE_RANGES, IntentType, KENYAN_AREAS, UserProfile } from "../types";

interface Props {
  user: UserProfile;
  onUserUpdated: (user: UserProfile) => void;
}

const PersonalInfoPage: React.FC<Props> = ({ user, onUserUpdated }) => {
  const [realName, setRealName] = useState(user.realName);
  const [nickname, setNickname] = useState(user.nickname);
  const [ageRange, setAgeRange] = useState(user.ageRange);
  const [area, setArea] = useState(user.area);
  const [bio, setBio] = useState(user.bio);
  const [intents, setIntents] = useState<IntentType[]>(user.intents);
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const toggleIntent = (intent: IntentType) => {
    setIntents((prev) =>
      prev.includes(intent)
        ? prev.filter((i) => i !== intent)
        : [...prev, intent],
    );
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
    if (value.trim().toLowerCase() === user.nickname.trim().toLowerCase()) {
      setNicknameError(null);
      return true;
    }
    setIsCheckingNickname(true);
    setNicknameError(null);
    try {
      const exists = await nicknameExists(value, user.id);
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

  const handleSelectPhoto = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const handlePhotoSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image.");
      return;
    }
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
    setIsUploading(true);
    setErrorMessage(null);
    try {
      const uploadedUrl = await uploadToCloudinary(file);
      setPhotoUrl(uploadedUrl);
      setPhotoPreview(null);
      setMessage("Selfie updated. Save to apply changes.");
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to upload selfie.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    const nicknameOk = await checkNicknameAvailability(nickname);
    if (!nicknameOk) {
      setErrorMessage(nicknameError ?? "Nickname is required.");
      return;
    }
    if (intents.length === 0) {
      setErrorMessage("Please select at least one intent.");
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const updates = {
        realName: realName.trim(),
        nickname: nickname.trim(),
        ageRange,
        area,
        bio: bio.trim(),
        intents,
        photoUrl,
      };
      await updateUserProfile(user.id, updates);
      const updatedUser = { ...user, ...updates };
      onUserUpdated(updatedUser);
      setMessage("Profile updated.");
    } catch (error) {
      console.error(error);
      setErrorMessage("Could not update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-kipepeo-dark text-white font-sans flex flex-col">
      <header className="p-6 flex justify-between items-center border-b border-white/5 bg-kipepeo-dark sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <Link to="/profile" className="text-2xl active:scale-90 transition-transform">
            â†
          </Link>
          <h1 className="text-xl font-black uppercase tracking-widest">
            Personal Information
          </h1>
        </div>
      </header>

      <div className="p-6 flex-1 overflow-y-auto no-scrollbar space-y-6">
        <section className="flex flex-col items-center text-center space-y-4">
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-kipepeo-pink shadow-[0_0_30px_rgba(255,0,128,0.2)]">
            <img
              src={photoPreview ?? photoUrl}
              className="w-full h-full object-cover"
              alt="Selfie"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-kipepeo-pink border-t-transparent animate-spin rounded-full"></div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handlePhotoSelected}
            className="hidden"
          />
          <button
            onClick={handleSelectPhoto}
            disabled={isUploading}
            className="px-6 py-2 bg-white text-black font-black rounded-full text-[10px] uppercase tracking-widest disabled:opacity-60"
          >
            {isUploading ? "Uploading..." : "Update Selfie"}
          </button>
        </section>

        <section className="glass rounded-[2rem] p-6 border border-white/5 space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
            Identity
          </h2>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">
              Real Name
            </label>
            <input
              type="text"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-1 focus:border-kipepeo-pink outline-none text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">
              Nickname
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                const value = e.target.value;
                setNickname(value);
                if (nicknameError) {
                  setNicknameError(validateNickname(value));
                }
              }}
              onBlur={() => {
                void checkNicknameAvailability(nickname);
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-1 focus:border-kipepeo-pink outline-none text-sm"
            />
            {nicknameError && (
              <p className="text-[10px] text-red-400 mt-2">{nicknameError}</p>
            )}
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-1 text-sm opacity-70"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Status: {user.emailVerified ? "Verified" : "Not verified"}
            </p>
          </div>
        </section>

        <section className="glass rounded-[2rem] p-6 border border-white/5 space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
            Profile Details
          </h2>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">
              Age Range
            </label>
            <select
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-1 focus:border-kipepeo-pink outline-none text-sm"
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
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-1 focus:border-kipepeo-pink outline-none text-sm"
            >
              {KENYAN_AREAS.map((a) => (
                <option key={a} value={a} className="bg-kipepeo-dark">
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full h-28 bg-white/5 border border-white/10 rounded-xl p-3 mt-1 focus:border-kipepeo-pink outline-none text-sm"
            />
          </div>
        </section>

        <section className="glass rounded-[2rem] p-6 border border-white/5 space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
            Intents
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {Object.values(IntentType).map((intent) => (
              <button
                key={intent}
                onClick={() => toggleIntent(intent)}
                className={`p-4 rounded-xl border text-left flex justify-between items-center transition-all ${
                  intents.includes(intent)
                    ? "bg-kipepeo-pink/20 border-kipepeo-pink"
                    : "bg-white/5 border-white/10 opacity-60"
                }`}
              >
                <span className="font-bold text-xs uppercase tracking-tighter">
                  {intent}
                </span>
                {intents.includes(intent) && (
                  <span className="text-kipepeo-pink">âœ”</span>
                )}
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={handleSave}
          disabled={isSaving || isUploading || isCheckingNickname}
          className="w-full py-4 bg-white text-black font-black rounded-[2rem] text-xs uppercase tracking-widest disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>

        {(message || errorMessage) && (
          <div
            className={`text-[10px] ${
              errorMessage ? "text-red-400" : "text-kipepeo-pink"
            }`}
          >
            {errorMessage ?? message}
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalInfoPage;
