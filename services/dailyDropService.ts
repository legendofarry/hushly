import {
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { DailyDrop } from "../types";

const DAILY_DROPS_COLLECTION = "daily_drops";

const dailyDropRef = (userId: string) =>
  doc(db, DAILY_DROPS_COLLECTION, userId);

const mapDailyDrop = (userId: string, data: any): DailyDrop => {
  const createdAt =
    data?.createdAt?.toMillis?.() ?? data?.createdAt ?? undefined;
  const updatedAt =
    data?.updatedAt?.toMillis?.() ?? data?.updatedAt ?? undefined;
  return {
    userId,
    lastDropAt: Number(data?.lastDropAt ?? 0),
    profileIds: Array.isArray(data?.profileIds) ? data.profileIds : [],
    actionedIds: Array.isArray(data?.actionedIds) ? data.actionedIds : [],
    dropSize: Number(data?.dropSize ?? data?.profileIds?.length ?? 0),
    createdAt,
    updatedAt,
  };
};

export const getDailyDrop = async (userId: string) => {
  const snapshot = await getDoc(dailyDropRef(userId));
  if (!snapshot.exists()) {
    return null;
  }
  return mapDailyDrop(userId, snapshot.data());
};

export const listenToDailyDrop = (
  userId: string,
  onChange: (drop: DailyDrop | null) => void,
  onError?: (error: Error) => void,
) =>
  onSnapshot(
    dailyDropRef(userId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      onChange(mapDailyDrop(userId, snapshot.data()));
    },
    (error) => {
      console.error(error);
      onError?.(error as Error);
    },
  );

export const createDailyDrop = async (payload: {
  userId: string;
  profileIds: string[];
  dropSize: number;
  filters?: Record<string, unknown>;
}) => {
  const now = Date.now();
  await setDoc(
    dailyDropRef(payload.userId),
    {
      userId: payload.userId,
      lastDropAt: now,
      profileIds: payload.profileIds,
      actionedIds: [],
      dropSize: payload.dropSize,
      filters: payload.filters ?? null,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
};

export const markDailyDropAction = async (
  userId: string,
  profileId: string,
) => {
  await updateDoc(dailyDropRef(userId), {
    actionedIds: arrayUnion(profileId),
    updatedAt: Date.now(),
  });
};
