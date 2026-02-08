import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const LIVE_ACHIEVEMENTS_COLLECTION = "live_achievements";

export const buildLiveAchievementId = (roomId: string, key: string) =>
  `${roomId}_${key}`;

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
