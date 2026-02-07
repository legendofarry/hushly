import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { AppNotification, NotificationType } from "../types";

const NOTIFICATIONS_COLLECTION = "notifications";
const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);

const mapNotification = (id: string, data: any): AppNotification => {
  const createdAt =
    data?.createdAt?.toMillis?.() ?? data?.createdAt ?? Date.now();
  return {
    id,
    toUserId: data.toUserId,
    fromUserId: data.fromUserId,
    fromNickname: data.fromNickname,
    type: data.type as NotificationType,
    body: data.body,
    conversationId: data.conversationId,
    read: Boolean(data.read),
    createdAt,
  };
};

export const listenToNotifications = (
  userId: string,
  onChange: (notifications: AppNotification[]) => void,
) => {
  const q = query(
    notificationsRef,
    where("toUserId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((docSnap) =>
      mapNotification(docSnap.id, docSnap.data()),
    );
    onChange(notifications);
  });
};

export const markNotificationsRead = async (ids: string[]) => {
  if (!ids.length) return;
  const batch = writeBatch(db);
  ids.forEach((id) => {
    batch.update(doc(notificationsRef, id), { read: true });
  });
  await batch.commit();
};

export const setNotificationRead = async (
  notificationId: string,
  read: boolean,
) => {
  await updateDoc(doc(notificationsRef, notificationId), { read });
};

export const deleteNotification = async (notificationId: string) => {
  await deleteDoc(doc(notificationsRef, notificationId));
};

export const clearNotificationsForUser = async (userId: string) => {
  const q = query(notificationsRef, where("toUserId", "==", userId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();
};

export const markNotificationsReadByConversation = async (
  userId: string,
  conversationId: string,
) => {
  const q = query(
    notificationsRef,
    where("toUserId", "==", userId),
    where("conversationId", "==", conversationId),
    where("read", "==", false),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => {
    batch.update(doc(notificationsRef, docSnap.id), { read: true });
  });
  await batch.commit();
};

export const createNotification = async (payload: {
  toUserId: string;
  fromUserId?: string;
  fromNickname?: string;
  type: NotificationType;
  body: string;
  conversationId?: string;
}) => {
  await addDoc(notificationsRef, {
    ...payload,
    read: false,
    createdAt: serverTimestamp(),
  });
};

export const createMessageNotification = async (payload: {
  toUserId: string;
  fromUserId: string;
  fromNickname: string;
  conversationId: string;
}) => {
  await createNotification({
    ...payload,
    type: "message",
    body: `New message from ${payload.fromNickname ?? "someone"}.`,
  });
};

export const createLikeNotification = async (payload: {
  toUserId: string;
  fromUserId: string;
  fromNickname: string;
}) => {
  await createNotification({
    ...payload,
    type: "like",
    body: `${payload.fromNickname ?? "Someone"} liked your profile.`,
  });
};
