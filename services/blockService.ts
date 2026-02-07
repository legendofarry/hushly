import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const BLOCKS_COLLECTION = "blocks";
const blocksRef = collection(db, BLOCKS_COLLECTION);

export const getBlockId = (fromUserId: string, toUserId: string) =>
  `${fromUserId}_${toUserId}`;

export const createBlock = async (fromUserId: string, toUserId: string) => {
  const blockRef = doc(blocksRef, getBlockId(fromUserId, toUserId));
  await setDoc(
    blockRef,
    {
      fromUserId,
      toUserId,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const deleteBlock = async (fromUserId: string, toUserId: string) => {
  const blockRef = doc(blocksRef, getBlockId(fromUserId, toUserId));
  await deleteDoc(blockRef);
};

export const listenToBlock = (
  fromUserId: string,
  toUserId: string,
  onChange: (isBlocked: boolean) => void,
) => {
  const blockRef = doc(blocksRef, getBlockId(fromUserId, toUserId));
  return onSnapshot(blockRef, (snapshot) => {
    onChange(snapshot.exists());
  });
};
