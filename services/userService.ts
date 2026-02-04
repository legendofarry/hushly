import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile } from "../types";

const USERS_COLLECTION = "user";

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
