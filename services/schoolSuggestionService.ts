import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const SCHOOL_SUGGESTIONS_COLLECTION = "school_suggestions";
const suggestionsRef = collection(db, SCHOOL_SUGGESTIONS_COLLECTION);

export const submitSchoolSuggestion = async (payload: {
  schoolName: string;
  userId: string;
  email?: string;
  source?: "onboarding" | "profile" | "filter";
}) => {
  const trimmed = payload.schoolName.trim();
  if (!trimmed) return;
  await addDoc(suggestionsRef, {
    name: trimmed,
    nameLower: trimmed.toLowerCase(),
    userId: payload.userId,
    email: payload.email?.trim().toLowerCase() ?? null,
    source: payload.source ?? "onboarding",
    createdAt: serverTimestamp(),
  });
};
