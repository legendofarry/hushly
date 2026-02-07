import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { DislikeRecord } from "../types";

const DISLIKES_COLLECTION = "dislikes";
const dislikesRef = collection(db, DISLIKES_COLLECTION);

export const getDislikeId = (fromUserId: string, toUserId: string) =>
  `${fromUserId}_${toUserId}`;

const mapDislike = (id: string, data: any): DislikeRecord => {
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

export const createDislike = async (payload: {
  fromUserId: string;
  toUserId: string;
  fromNickname?: string;
  toNickname?: string;
}) => {
  const dislikeRef = doc(
    dislikesRef,
    getDislikeId(payload.fromUserId, payload.toUserId),
  );
  await setDoc(
    dislikeRef,
    {
      ...payload,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const deleteDislike = async (fromUserId: string, toUserId: string) => {
  const dislikeRef = doc(dislikesRef, getDislikeId(fromUserId, toUserId));
  await deleteDoc(dislikeRef);
};

export const listenToDislikesSent = (
  userId: string,
  onChange: (dislikes: DislikeRecord[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = query(
    dislikesRef,
    where("fromUserId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(snapshot.docs.map((docSnap) => mapDislike(docSnap.id, docSnap.data())));
    },
    (error) => {
      console.error(error);
      onError?.(error as Error);
    },
  );
};
