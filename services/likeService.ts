import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { LikeRecord } from "../types";

const LIKES_COLLECTION = "likes";
const likesRef = collection(db, LIKES_COLLECTION);

export const getLikeId = (fromUserId: string, toUserId: string) =>
  `${fromUserId}_${toUserId}`;

const mapLike = (id: string, data: any): LikeRecord => {
  const createdAt =
    data?.createdAt?.toMillis?.() ?? data?.createdAt ?? Date.now();
  return {
    id,
    fromUserId: data.fromUserId,
    toUserId: data.toUserId,
    fromNickname: data.fromNickname,
    toNickname: data.toNickname,
    createdAt,
  };
};

export const createLike = async (payload: {
  fromUserId: string;
  toUserId: string;
  fromNickname?: string;
  toNickname?: string;
}) => {
  const likeRef = doc(likesRef, getLikeId(payload.fromUserId, payload.toUserId));
  await setDoc(
    likeRef,
    {
      ...payload,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const listenToLikesReceived = (
  userId: string,
  onChange: (likes: LikeRecord[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = query(
    likesRef,
    where("toUserId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(snapshot.docs.map((docSnap) => mapLike(docSnap.id, docSnap.data())));
    },
    (error) => {
      console.error(error);
      onError?.(error as Error);
    },
  );
};

export const listenToLikesSent = (
  userId: string,
  onChange: (likes: LikeRecord[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = query(
    likesRef,
    where("fromUserId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(snapshot.docs.map((docSnap) => mapLike(docSnap.id, docSnap.data())));
    },
    (error) => {
      console.error(error);
      onError?.(error as Error);
    },
  );
};
