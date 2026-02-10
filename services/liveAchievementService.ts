import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { LiveAchievement } from "../types";

const LIVE_ACHIEVEMENTS_COLLECTION = "live_achievements";
const liveAchievementsRef = collection(db, LIVE_ACHIEVEMENTS_COLLECTION);

const mapLiveAchievement = (id: string, data: any): LiveAchievement => ({
  id,
  roomId: data.roomId ?? "",
  hostId: data.hostId,
  hostNickname: data.hostNickname,
  type: data.type,
  key: data.key,
  label: data.label,
  metric: data.metric ?? "likes",
  likeCount: data.likeCount,
  threshold: data.threshold,
  durationMinutes: data.durationMinutes,
  liveTitle: data.liveTitle ?? "",
  createdAt: data?.createdAt?.toMillis?.() ?? data?.createdAt ?? Date.now(),
});

export const buildLiveAchievementId = (roomId: string, key: string) =>
  `${roomId}_${key}`;

export const buildHostLiveAchievementId = (hostId: string, key: string) =>
  `host_${hostId}_${key}`;

export const listenToHostLiveAchievements = (
  hostId: string,
  onChange: (achievements: LiveAchievement[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = query(
    liveAchievementsRef,
    where("hostId", "==", hostId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(snapshot.docs.map((docSnap) => mapLiveAchievement(docSnap.id, docSnap.data())));
    },
    (error) => {
      console.error(error);
      onError?.(error as Error);
    },
  );
};

export const createLiveLikeAchievement = async (payload: {
  roomId: string;
  hostId: string;
  hostNickname: string;
  liveTitle: string;
  likeCount: number;
  threshold: number;
}) => {
  const key = `likes_${payload.threshold}`;
  const achievementRef = doc(
    db,
    LIVE_ACHIEVEMENTS_COLLECTION,
    buildLiveAchievementId(payload.roomId, key),
  );
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(achievementRef);
    if (snap.exists()) return;
    transaction.set(achievementRef, {
      roomId: payload.roomId,
      hostId: payload.hostId,
      hostNickname: payload.hostNickname,
      type: "likes_milestone",
      key,
      label: `${payload.threshold} Likes`,
      metric: "likes",
      likeCount: payload.likeCount,
      threshold: payload.threshold,
      liveTitle: payload.liveTitle,
      createdAt: serverTimestamp(),
    });
  });
  return achievementRef.id;
};

export const createLiveFirstDurationAchievement = async (payload: {
  roomId: string;
  hostId: string;
  hostNickname: string;
  liveTitle: string;
  durationMinutes: number;
}) => {
  const key = `first_${payload.durationMinutes}m_live`;
  const achievementRef = doc(
    db,
    LIVE_ACHIEVEMENTS_COLLECTION,
    buildHostLiveAchievementId(payload.hostId, key),
  );
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(achievementRef);
    if (snap.exists()) return;
    transaction.set(achievementRef, {
      roomId: payload.roomId,
      hostId: payload.hostId,
      hostNickname: payload.hostNickname,
      type: "duration_milestone",
      key,
      label: `First ${payload.durationMinutes} Minutes Live`,
      metric: "duration",
      durationMinutes: payload.durationMinutes,
      liveTitle: payload.liveTitle,
      createdAt: serverTimestamp(),
    });
  });
  return achievementRef.id;
};

export const createLiveFirstLikesAchievement = async (payload: {
  roomId: string;
  hostId: string;
  hostNickname: string;
  liveTitle: string;
  likeCount: number;
  threshold: number;
}) => {
  const key = `first_${payload.threshold}_likes`;
  const achievementRef = doc(
    db,
    LIVE_ACHIEVEMENTS_COLLECTION,
    buildHostLiveAchievementId(payload.hostId, key),
  );
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(achievementRef);
    if (snap.exists()) return;
    transaction.set(achievementRef, {
      roomId: payload.roomId,
      hostId: payload.hostId,
      hostNickname: payload.hostNickname,
      type: "likes_first",
      key,
      label: `First ${payload.threshold} Likes`,
      metric: "likes",
      likeCount: payload.likeCount,
      threshold: payload.threshold,
      liveTitle: payload.liveTitle,
      createdAt: serverTimestamp(),
    });
  });
  return achievementRef.id;
};
