import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile } from "../types";

const USERS_COLLECTION = "user";
const usersCollectionRef = collection(db, USERS_COLLECTION);

export const createUserProfile = async (user: UserProfile) => {
  const userRef = doc(db, USERS_COLLECTION, user.id);
  await setDoc(
    userRef,
    {
      ...user,
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
