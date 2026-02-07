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
import { PlanTemplate, UserProfile, WeekendPlan } from "../types";

const PLANS_COLLECTION = "weekend_plans";
const plansRef = collection(db, PLANS_COLLECTION);

const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: "rooftop-friday",
    title: "Friday Rooftop Vibes",
    description:
      "Golden hour drinks, soft music, and low-key conversation. Come for the skyline, stay for the vibe.",
    category: "Hangout",
    timeHint: "Friday 7:30 PM",
    locationHint: "Rooftop lounge near town",
    vibeTags: ["chill", "city", "music"],
  },
  {
    id: "saturday-brunch",
    title: "Saturday Brunch & Stroll",
    description:
      "Brunch first, slow walk after. Casual, friendly, and easy to dip if needed.",
    category: "Dinner",
    timeHint: "Saturday 11:30 AM",
    locationHint: "Cozy cafe",
    vibeTags: ["daytime", "easy", "food"],
  },
  {
    id: "adventure-drive",
    title: "Weekend Adventure Drive",
    description:
      "A short escape with a good playlist, scenic views, and a clean reset.",
    category: "Adventure",
    timeHint: "Saturday 3:00 PM",
    locationHint: "Scenic drive",
    vibeTags: ["outdoors", "roadtrip", "fresh-air"],
  },
  {
    id: "night-market",
    title: "Night Market Link-Up",
    description:
      "Street food, laughs, and exploring stalls together. Zero pressure, all vibe.",
    category: "Party",
    timeHint: "Saturday 8:00 PM",
    locationHint: "Night market",
    vibeTags: ["food", "night", "fun"],
  },
];

export const getPlanTemplates = (category?: string) => {
  if (!category || category === "All") return PLAN_TEMPLATES;
  return PLAN_TEMPLATES.filter((template) => template.category === category);
};

export const buildPlanFromTemplate = (
  template: PlanTemplate,
  user: UserProfile,
) => {
  const locationHint = template.locationHint
    ? `${template.locationHint}${user.area ? `, ${user.area}` : ""}`
    : user.area;
  return {
    title: template.title,
    description: template.description,
    location: locationHint,
    time: template.timeHint,
    category: template.category,
  };
};

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
