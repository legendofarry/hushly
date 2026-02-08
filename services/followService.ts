import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile } from "../types";

const FOLLOWS_COLLECTION = "follows";
const followsRef = collection(db, FOLLOWS_COLLECTION);

export const getFollowId = (followerId: string, followingId: string) =>
  `${followerId}_${followingId}`;

export const listenToFollowStatus = (
  followerId: string,
  followingId: string,
  onChange: (isFollowing: boolean) => void,
) => {
  const followRef = doc(followsRef, getFollowId(followerId, followingId));
  return onSnapshot(followRef, (snapshot) => {
    onChange(snapshot.exists());
  });
};

export const followUser = async (payload: {
  follower: UserProfile;
  target: { id: string; nickname: string };
}) => {
  const { follower, target } = payload;
  if (follower.id === target.id) return;
  const followRef = doc(followsRef, getFollowId(follower.id, target.id));
  const targetRef = doc(db, "user", target.id);

  await runTransaction(db, async (tx) => {
    const followSnap = await tx.get(followRef);
    const targetSnap = await tx.get(targetRef);
    if (!targetSnap.exists()) {
      throw new Error("target-not-found");
    }
    if (followSnap.exists()) return;
    const currentCount = (targetSnap.data()?.followerCount ?? 0) as number;
    tx.set(
      followRef,
      {
        followerId: follower.id,
        followingId: target.id,
        followerNickname: follower.nickname,
        followingNickname: target.nickname,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
    tx.update(targetRef, {
      followerCount: currentCount + 1,
    });
  });
};

export const unfollowUser = async (payload: {
  follower: UserProfile;
  target: { id: string; nickname: string };
}) => {
  const { follower, target } = payload;
  if (follower.id === target.id) return;
  const followRef = doc(followsRef, getFollowId(follower.id, target.id));
  const targetRef = doc(db, "user", target.id);

  await runTransaction(db, async (tx) => {
    const followSnap = await tx.get(followRef);
    const targetSnap = await tx.get(targetRef);
    if (!targetSnap.exists()) {
      throw new Error("target-not-found");
    }
    if (!followSnap.exists()) return;
    const currentCount = (targetSnap.data()?.followerCount ?? 0) as number;
    tx.delete(followRef);
    tx.update(targetRef, {
      followerCount: Math.max(currentCount - 1, 0),
    });
  });
};

export const getFollowerCount = async (userId: string) => {
  const userSnap = await getDoc(doc(db, "user", userId));
  if (!userSnap.exists()) return 0;
  return (userSnap.data()?.followerCount ?? 0) as number;
};
