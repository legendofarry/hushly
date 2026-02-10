import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { DEFAULT_USER_SETTINGS, UserProfile, UserSettings } from "../types";
import { clampBio } from "./bioUtils";

const USERS_COLLECTION = "user";
const SETTINGS_COLLECTION = "user_settings";
const PUBLIC_NICKNAMES_COLLECTION = "public_nicknames";
const usersCollectionRef = collection(db, USERS_COLLECTION);
const settingsCollectionRef = collection(db, SETTINGS_COLLECTION);

const normalizeNickname = (value: string) => value.trim().toLowerCase();

const snapshotHasOtherUser = (
  snapshot: Awaited<ReturnType<typeof getDocs>>,
  excludeUserId?: string,
) => snapshot.docs.some((docSnap) => !excludeUserId || docSnap.id !== excludeUserId);

const publicNicknameDocRef = (nicknameLower: string) =>
  doc(db, PUBLIC_NICKNAMES_COLLECTION, nicknameLower);

const buildPublicNicknamePayload = (
  userId: string,
  nickname: string,
  nicknameLower: string,
  isNew: boolean,
) => ({
  userId,
  nickname,
  nicknameLower,
  ...(isNew ? { createdAt: serverTimestamp() } : {}),
  updatedAt: serverTimestamp(),
});

const isPlainObject = (value: unknown) =>
  Boolean(value) &&
  typeof value === "object" &&
  Object.getPrototypeOf(value) === Object.prototype;

const stripUndefined = (value: any): any => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value.map(stripUndefined).filter((item) => item !== undefined);
  }
  if (isPlainObject(value)) {
    const cleaned: Record<string, any> = {};
    Object.entries(value).forEach(([key, val]) => {
      const nextVal = stripUndefined(val);
      if (nextVal !== undefined) {
        cleaned[key] = nextVal;
      }
    });
    return cleaned;
  }
  return value;
};

export const createUserProfile = async (user: UserProfile) => {
  const userRef = doc(db, USERS_COLLECTION, user.id);
  const sanitizedUser = {
    ...user,
    bio: typeof user.bio === "string" ? clampBio(user.bio) : user.bio,
  };
  const nicknameLower = user.nicknameLower ?? normalizeNickname(user.nickname);
  const nicknameRef = publicNicknameDocRef(nicknameLower);
  await runTransaction(db, async (tx) => {
    const nicknameSnap = await tx.get(nicknameRef);
    if (nicknameSnap.exists()) {
      const existing = nicknameSnap.data() as { userId?: string };
      if (existing.userId && existing.userId !== user.id) {
        throw new Error("nickname-taken");
      }
    }
    tx.set(
      nicknameRef,
      buildPublicNicknamePayload(
        user.id,
        user.nickname,
        nicknameLower,
        !nicknameSnap.exists(),
      ),
      { merge: true },
    );
    tx.set(
      userRef,
      stripUndefined({
        ...sanitizedUser,
        nicknameLower,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      { merge: true },
    );
  });
};

export const getUserProfile = async (userId: string) => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.data() as UserProfile;
};

export const listenToUserProfile = (
  userId: string,
  onChange: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void,
) => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  return onSnapshot(
    userRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      onChange(snapshot.data() as UserProfile);
    },
    (error) => {
      console.error(error);
      onError?.(error as Error);
    },
  );
};

export const updateUserEmailVerification = async (
  userId: string,
  emailVerified: boolean,
  email?: string,
) => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  await setDoc(
    userRef,
    {
      emailVerified,
      ...(email ? { email } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>,
) => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const sanitizedUpdates: Partial<UserProfile> = { ...updates };
  const hasNicknameUpdate = typeof updates.nickname === "string";
  if (typeof updates.bio === "string") {
    sanitizedUpdates.bio = clampBio(updates.bio);
  }
  if (typeof updates.nickname === "string") {
    sanitizedUpdates.nicknameLower = normalizeNickname(updates.nickname);
  }

  if (hasNicknameUpdate) {
    const nextNickname = updates.nickname?.trim() ?? "";
    const nextNicknameLower = normalizeNickname(nextNickname);
    await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) {
        throw new Error("user-not-found");
      }
      const userData = userSnap.data() as UserProfile;
      const currentNicknameLower =
        userData.nicknameLower ?? normalizeNickname(userData.nickname ?? "");
      const nextNicknameRef = publicNicknameDocRef(nextNicknameLower);
      const nextNicknameSnap = await tx.get(nextNicknameRef);
      if (nextNicknameSnap.exists()) {
        const existing = nextNicknameSnap.data() as { userId?: string };
        if (existing.userId && existing.userId !== userId) {
          throw new Error("nickname-taken");
        }
      }
      tx.set(
        nextNicknameRef,
        buildPublicNicknamePayload(
          userId,
          nextNickname,
          nextNicknameLower,
          !nextNicknameSnap.exists(),
        ),
        { merge: true },
      );
      if (currentNicknameLower && currentNicknameLower !== nextNicknameLower) {
        const currentRef = publicNicknameDocRef(currentNicknameLower);
        const currentSnap = await tx.get(currentRef);
        if (currentSnap.exists()) {
          const currentData = currentSnap.data() as { userId?: string };
          if (currentData.userId === userId) {
            tx.delete(currentRef);
          }
        }
      }
      tx.set(
        userRef,
        stripUndefined({
          ...sanitizedUpdates,
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
    });
    return;
  }

  await setDoc(
    userRef,
    stripUndefined({
      ...sanitizedUpdates,
      updatedAt: serverTimestamp(),
    }),
    { merge: true },
  );
};

export const getUserSettings = async (userId: string) => {
  const settingsRef = doc(settingsCollectionRef, userId);
  const snapshot = await getDoc(settingsRef);
  if (!snapshot.exists()) {
    await setDoc(settingsRef, {
      ...DEFAULT_USER_SETTINGS,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { ...DEFAULT_USER_SETTINGS };
  }
  return {
    ...DEFAULT_USER_SETTINGS,
    ...(snapshot.data() as UserSettings),
  };
};

export const updateUserSettings = async (
  userId: string,
  updates: Partial<UserSettings>,
) => {
  const settingsRef = doc(settingsCollectionRef, userId);
  await setDoc(
    settingsRef,
    {
      ...updates,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const getUserProfileByEmail = async (email: string) => {
  const normalized = email.trim().toLowerCase();
  const q = query(
    usersCollectionRef,
    where("email", "==", normalized),
    limit(1),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  return snapshot.docs[0].data() as UserProfile;
};

export const userEmailExists = async (email: string) => {
  const profile = await getUserProfileByEmail(email);
  return Boolean(profile);
};

export const nicknameExists = async (
  nickname: string,
  excludeUserId?: string,
) => {
  const normalized = normalizeNickname(nickname);
  if (!normalized) return false;

  const nicknameRef = publicNicknameDocRef(normalized);
  const nicknameSnap = await getDoc(nicknameRef);
  if (nicknameSnap.exists()) {
    const data = nicknameSnap.data() as { userId?: string };
    if (!excludeUserId) {
      return true;
    }
    if (data.userId !== excludeUserId) {
      return true;
    }
    return false;
  }

  if (!auth.currentUser) {
    return false;
  }

  const lowerQuery = query(
    usersCollectionRef,
    where("nicknameLower", "==", normalized),
    limit(5),
  );
  const lowerSnap = await getDocs(lowerQuery);
  if (!lowerSnap.empty && snapshotHasOtherUser(lowerSnap, excludeUserId)) {
    return true;
  }

  const exactQuery = query(
    usersCollectionRef,
    where("nickname", "==", nickname.trim()),
    limit(5),
  );
  const exactSnap = await getDocs(exactQuery);
  if (!exactSnap.empty && snapshotHasOtherUser(exactSnap, excludeUserId)) {
    return true;
  }

  return false;
};

export const ensurePublicNickname = async (profile: UserProfile) => {
  const nicknameLower =
    profile.nicknameLower ?? normalizeNickname(profile.nickname);
  if (!nicknameLower) return;
  const nicknameRef = publicNicknameDocRef(nicknameLower);
  const nicknameSnap = await getDoc(nicknameRef);
  if (!nicknameSnap.exists()) {
    await setDoc(
      nicknameRef,
      buildPublicNicknamePayload(
        profile.id,
        profile.nickname,
        nicknameLower,
        true,
      ),
    );
    return;
  }
  const existing = nicknameSnap.data() as { userId?: string };
  if (existing.userId === profile.id) {
    await setDoc(
      nicknameRef,
      buildPublicNicknamePayload(
        profile.id,
        profile.nickname,
        nicknameLower,
        false,
      ),
      { merge: true },
    );
  }
};

export const getAllUsers = async () => {
  const snapshot = await getDocs(usersCollectionRef);
  return snapshot.docs.map((docSnap) => docSnap.data() as UserProfile);
};

export const getAllUserSettings = async () => {
  const snapshot = await getDocs(settingsCollectionRef);
  const settingsMap: Record<string, UserSettings> = {};
  snapshot.docs.forEach((docSnap) => {
    settingsMap[docSnap.id] = {
      ...DEFAULT_USER_SETTINGS,
      ...(docSnap.data() as UserSettings),
    };
  });
  return settingsMap;
};
