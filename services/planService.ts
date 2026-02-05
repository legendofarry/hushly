import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile, WeekendPlan } from "../types";

const PLANS_COLLECTION = "weekend_plans";
const plansRef = collection(db, PLANS_COLLECTION);

const mapPlan = (id: string, data: any): WeekendPlan => {
  const timestamp =
    data?.createdAt?.toMillis?.() ?? data?.createdAt ?? Date.now();
  return {
    id,
    creatorId: data.creatorId,
    creatorNickname: data.creatorNickname,
    title: data.title,
    description: data.description,
    location: data.location ?? "",
    time: data.time ?? "",
    category: data.category,
    timestamp,
    rsvpCount: data.rsvpCount ?? 0,
  };
};

export const listenToWeekendPlans = (
  onChange: (plans: WeekendPlan[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = query(plansRef, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(snapshot.docs.map((docSnap) => mapPlan(docSnap.id, docSnap.data())));
    },
    (error) => {
      console.error(error);
      onError?.(error as Error);
    },
  );
};

export const createWeekendPlan = async (payload: {
  creator: UserProfile;
  title: string;
  description: string;
  location: string;
  time: string;
  category: string;
}) => {
  await addDoc(plansRef, {
    creatorId: payload.creator.id,
    creatorNickname: payload.creator.nickname,
    title: payload.title,
    description: payload.description,
    location: payload.location,
    time: payload.time,
    category: payload.category,
    rsvpCount: 0,
    createdAt: serverTimestamp(),
  });
};

export const rsvpToPlan = async (payload: {
  planId: string;
  user: UserProfile;
  answers: {
    name: string;
    contact: string;
    availability: string;
    groupSize: string;
    note: string;
  };
}) => {
  const planRef = doc(db, PLANS_COLLECTION, payload.planId);
  const rsvpRef = doc(planRef, "rsvps", payload.user.id);
  await runTransaction(db, async (transaction) => {
    const rsvpSnap = await transaction.get(rsvpRef);
    if (rsvpSnap.exists()) return;
    transaction.set(rsvpRef, {
      userId: payload.user.id,
      nickname: payload.user.nickname,
      ...payload.answers,
      createdAt: serverTimestamp(),
    });
    transaction.update(planRef, {
      rsvpCount: increment(1),
    });
  });
};
