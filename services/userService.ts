import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_USER_SETTINGS, UserProfile, UserSettings } from "../types";

const USERS_COLLECTION = "user";
const SETTINGS_COLLECTION = "user_settings";
const usersCollectionRef = collection(db, USERS_COLLECTION);
const settingsCollectionRef = collection(db, SETTINGS_COLLECTION);

const normalizeNickname = (value: string) => value.trim().toLowerCase();

export const createUserProfile = async (user: UserProfile) => {
  const userRef = doc(db, USERS_COLLECTION, user.id);
  const nicknameLower = user.nicknameLower ?? normalizeNickname(user.nickname);
  await setDoc(
    userRef,
    {
      ...user,
      nicknameLower,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
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
  const sanitizedUpdates = { ...updates };
  if (typeof updates.nickname === "string") {
    sanitizedUpdates.nicknameLower = normalizeNickname(updates.nickname);
  }
  await setDoc(
    userRef,
    {
      ...sanitizedUpdates,
      updatedAt: serverTimestamp(),
    },
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

const snapshotHasOtherUser = (
  snapshot: Awaited<ReturnType<typeof getDocs>>,
  excludeUserId?: string,
) => snapshot.docs.some((docSnap) => !excludeUserId || docSnap.id !== excludeUserId);

export const nicknameExists = async (
  nickname: string,
  excludeUserId?: string,
) => {
  const normalized = normalizeNickname(nickname);
  if (!normalized) return false;

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
