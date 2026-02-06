import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile } from "../types";
import { createMessageNotification } from "./notificationService";

const CONVERSATIONS_COLLECTION = "conversations";

const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);

export const getConversationId = (uidA: string, uidB: string) => {
  return [uidA, uidB].sort().join("_");
};

export const ensureConversation = async (
  currentUser: UserProfile,
  targetUser: UserProfile,
) => {
  const conversationId = getConversationId(currentUser.id, targetUser.id);
  const conversationRef = doc(conversationsRef, conversationId);
  const memberProfiles = {
    [currentUser.id]: {
      nickname: currentUser.nickname,
      photoUrl: currentUser.photoUrl,
    },
    [targetUser.id]: {
      nickname: targetUser.nickname,
      photoUrl: targetUser.photoUrl,
    },
  };
  await setDoc(
    conversationRef,
    {
      members: [currentUser.id, targetUser.id],
      memberProfiles,
      lastReadAt: {
        [currentUser.id]: serverTimestamp(),
      },
    },
    { merge: true },
  );
  return conversationId;
};

export const markConversationRead = async (
  conversationId: string,
  userId: string,
) => {
  const conversationRef = doc(conversationsRef, conversationId);
  await updateDoc(conversationRef, {
    [`lastReadAt.${userId}`]: serverTimestamp(),
  });
};

export const listenToConversation = (
  conversationId: string,
  onChange: (data: any | null) => void,
) => {
  const conversationRef = doc(conversationsRef, conversationId);
  return onSnapshot(conversationRef, (snapshot) => {
    if (!snapshot.exists()) {
      onChange(null);
      return;
    }
    onChange({ id: snapshot.id, ...snapshot.data() });
  });
};

export const listenToConversations = (
  userId: string,
  onChange: (conversations: any[]) => void,
) => {
  const q = query(conversationsRef, where("members", "array-contains", userId));
  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      .filter((conversation) => {
        const hasLastMessage =
          Boolean(conversation.lastMessageAt) ||
          Boolean(conversation.lastMessage);
        return hasLastMessage;
      });
    onChange(conversations);
  });
};

export const listenToMessages = (
  conversationId: string,
  onChange: (messages: any[]) => void,
) => {
  const messagesRef = collection(
    db,
    CONVERSATIONS_COLLECTION,
    conversationId,
    "messages",
  );
  const q = query(messagesRef, orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    onChange(messages);
  });
};

export const sendMessage = async (payload: {
  conversationId: string;
  sender: UserProfile;
  recipientId: string;
  text: string;
  recipientNickname?: string;
}) => {
  const { conversationId, sender, recipientId, text } = payload;
  const messagesRef = collection(
    db,
    CONVERSATIONS_COLLECTION,
    conversationId,
    "messages",
  );
  await addDoc(messagesRef, {
    senderId: sender.id,
    text,
    createdAt: serverTimestamp(),
  });

  const conversationRef = doc(conversationsRef, conversationId);
  await updateDoc(conversationRef, {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
    lastSenderId: sender.id,
  });

  await createMessageNotification({
    toUserId: recipientId,
    fromUserId: sender.id,
    fromNickname: sender.nickname,
    conversationId,
  });
};
