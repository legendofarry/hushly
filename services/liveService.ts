import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  LiveGuest,
  LiveJoinRequest,
  LiveMessage,
  LiveRoom,
  UserProfile,
} from "../types";

const LIVE_ROOMS_COLLECTION = "live_rooms";
const liveRoomsRef = collection(db, LIVE_ROOMS_COLLECTION);

const mapRoom = (id: string, data: any): LiveRoom => {
  const createdAt = data?.createdAt?.toMillis?.() ?? data?.createdAt ?? Date.now();
  const startedAt = data?.startedAt?.toMillis?.() ?? data?.startedAt ?? null;
  const endedAt = data?.endedAt?.toMillis?.() ?? data?.endedAt ?? null;
  return {
    id,
    hostId: data.hostId,
    hostNickname: data.hostNickname,
    hostPhotoUrl: data.hostPhotoUrl,
    title: data.title,
    type: data.type,
    allowGuests: data.allowGuests,
    chatAccess: data.chatAccess,
    joinAccess: data.joinAccess,
    moderation: data.moderation ?? { filterBadWords: true, muteNewUsers: false },
    privacy: data.privacy,
    tags: data.tags ?? [],
    viewerCount: data.viewerCount ?? 0,
    likeCount: data.likeCount ?? 0,
    maxGuests: data.maxGuests ?? 4,
    status: data.status ?? "live",
    createdAt,
    startedAt,
    endedAt,
  };
};

const mapMessage = (id: string, data: any): LiveMessage => ({
  id,
  senderId: data.senderId,
  senderNickname: data.senderNickname,
  type: data.type,
  text: data.text,
  createdAt: data?.createdAt?.toMillis?.() ?? data?.createdAt ?? Date.now(),
});

const mapGuest = (id: string, data: any): LiveGuest => ({
  id,
  userId: data.userId,
  nickname: data.nickname,
  photoUrl: data.photoUrl,
  joinedAt: data?.joinedAt?.toMillis?.() ?? data?.joinedAt ?? Date.now(),
});

const mapJoinRequest = (id: string, data: any): LiveJoinRequest => ({
  id,
  requesterId: data.requesterId,
  nickname: data.nickname,
  photoUrl: data.photoUrl,
  status: data.status ?? "pending",
  createdAt: data?.createdAt?.toMillis?.() ?? data?.createdAt ?? Date.now(),
});

export const listenToLiveRooms = (
  onChange: (rooms: LiveRoom[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = query(
    liveRoomsRef,
    where("status", "==", "live"),
    orderBy("startedAt", "desc"),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(snapshot.docs.map((docSnap) => mapRoom(docSnap.id, docSnap.data())));
    },
    (error) => {
      console.error(error);
      onError?.(error as Error);
    },
  );
};

export const listenToLiveRoom = (
  roomId: string,
  onChange: (room: LiveRoom | null) => void,
) => {
  const roomRef = doc(liveRoomsRef, roomId);
  return onSnapshot(roomRef, (snapshot) => {
    if (!snapshot.exists()) {
      onChange(null);
      return;
    }
    onChange(mapRoom(snapshot.id, snapshot.data()));
  });
};

export const createLiveRoom = async (payload: {
  host: UserProfile;
  title: string;
  type: "solo" | "group";
  allowGuests: boolean;
  chatAccess: "everyone" | "followers" | "noone";
  joinAccess: "everyone" | "followers" | "invite";
  moderation: { filterBadWords: boolean; muteNewUsers: boolean };
  privacy: "public" | "friends" | "private";
  tags: string[];
  maxGuests: number;
}) => {
  const roomRef = doc(liveRoomsRef);
  await setDoc(roomRef, {
    hostId: payload.host.id,
    hostNickname: payload.host.nickname,
    hostPhotoUrl: payload.host.photoUrl,
    title: payload.title,
    type: payload.type,
    allowGuests: payload.allowGuests,
    chatAccess: payload.chatAccess,
    joinAccess: payload.joinAccess,
    moderation: payload.moderation,
    privacy: payload.privacy,
    tags: payload.tags,
    viewerCount: 0,
    likeCount: 0,
    maxGuests: payload.maxGuests,
    status: "live",
    createdAt: serverTimestamp(),
    startedAt: serverTimestamp(),
  });
  return roomRef.id;
};

export const updateLiveRoom = async (roomId: string, data: Record<string, any>) => {
  const roomRef = doc(liveRoomsRef, roomId);
  await updateDoc(roomRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const endLiveRoom = async (roomId: string) => {
  const roomRef = doc(liveRoomsRef, roomId);
  await updateDoc(roomRef, {
    status: "ended",
    endedAt: serverTimestamp(),
  });
};

export const addViewer = async (roomId: string, viewer: UserProfile) => {
  const roomRef = doc(liveRoomsRef, roomId);
  const viewerRef = doc(roomRef, "viewers", viewer.id);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(viewerRef);
    if (snap.exists()) return;
    transaction.set(viewerRef, {
      userId: viewer.id,
      nickname: viewer.nickname,
      photoUrl: viewer.photoUrl,
      joinedAt: serverTimestamp(),
    });
    transaction.update(roomRef, {
      viewerCount: increment(1),
    });
  });
};

export const removeViewer = async (roomId: string, userId: string) => {
  const roomRef = doc(liveRoomsRef, roomId);
  const viewerRef = doc(roomRef, "viewers", userId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(viewerRef);
    if (!snap.exists()) return;
    transaction.delete(viewerRef);
    transaction.update(roomRef, {
      viewerCount: increment(-1),
    });
  });
};

export const incrementLiveLike = async (roomId: string) => {
  const roomRef = doc(liveRoomsRef, roomId);
  await updateDoc(roomRef, {
    likeCount: increment(1),
  });
};

export const listenToLiveViewers = (
  roomId: string,
  onChange: (viewers: any[]) => void,
) => {
  const viewersRef = collection(db, LIVE_ROOMS_COLLECTION, roomId, "viewers");
  return onSnapshot(viewersRef, (snapshot) => {
    onChange(
      snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })),
    );
  });
};

export const listenToLiveGuests = (
  roomId: string,
  onChange: (guests: LiveGuest[]) => void,
) => {
  const guestsRef = collection(db, LIVE_ROOMS_COLLECTION, roomId, "guests");
  const q = query(guestsRef, orderBy("joinedAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((docSnap) => mapGuest(docSnap.id, docSnap.data())));
  });
};

export const addGuest = async (roomId: string, user: UserProfile) => {
  const guestRef = doc(db, LIVE_ROOMS_COLLECTION, roomId, "guests", user.id);
  await setDoc(guestRef, {
    userId: user.id,
    nickname: user.nickname,
    photoUrl: user.photoUrl,
    joinedAt: serverTimestamp(),
  });
};

export const removeGuest = async (roomId: string, userId: string) => {
  const guestRef = doc(db, LIVE_ROOMS_COLLECTION, roomId, "guests", userId);
  await deleteDoc(guestRef);
};

export const requestToJoinLive = async (
  roomId: string,
  requester: UserProfile,
) => {
  const requestRef = doc(
    db,
    LIVE_ROOMS_COLLECTION,
    roomId,
    "join_requests",
    requester.id,
  );
  await setDoc(
    requestRef,
    {
      requesterId: requester.id,
      nickname: requester.nickname,
      photoUrl: requester.photoUrl,
      status: "pending",
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const updateJoinRequestStatus = async (
  roomId: string,
  requesterId: string,
  status: "approved" | "declined",
) => {
  const requestRef = doc(
    db,
    LIVE_ROOMS_COLLECTION,
    roomId,
    "join_requests",
    requesterId,
  );
  await updateDoc(requestRef, {
    status,
    updatedAt: serverTimestamp(),
  });
};

export const listenToJoinRequests = (
  roomId: string,
  onChange: (requests: LiveJoinRequest[]) => void,
) => {
  const requestsRef = collection(
    db,
    LIVE_ROOMS_COLLECTION,
    roomId,
    "join_requests",
  );
  const q = query(requestsRef, orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    onChange(
      snapshot.docs.map((docSnap) => mapJoinRequest(docSnap.id, docSnap.data())),
    );
  });
};

export const listenToLiveMessages = (
  roomId: string,
  onChange: (messages: LiveMessage[]) => void,
) => {
  const messagesRef = collection(
    db,
    LIVE_ROOMS_COLLECTION,
    roomId,
    "messages",
  );
  const q = query(messagesRef, orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((docSnap) => mapMessage(docSnap.id, docSnap.data())));
  });
};

export const sendLiveMessage = async (payload: {
  roomId: string;
  sender: UserProfile;
  text: string;
  type?: "message" | "reaction" | "system";
}) => {
  const messagesRef = collection(
    db,
    LIVE_ROOMS_COLLECTION,
    payload.roomId,
    "messages",
  );
  await addDoc(messagesRef, {
    senderId: payload.sender.id,
    senderNickname: payload.sender.nickname,
    type: payload.type ?? "message",
    text: payload.text,
    createdAt: serverTimestamp(),
  });
};

export const sendLiveSystemMessage = async (payload: {
  roomId: string;
  text: string;
}) => {
  const messagesRef = collection(
    db,
    LIVE_ROOMS_COLLECTION,
    payload.roomId,
    "messages",
  );
  await addDoc(messagesRef, {
    senderId: "system",
    senderNickname: "System",
    type: "system",
    text: payload.text,
    createdAt: serverTimestamp(),
  });
};

export const deleteLiveMessage = async (roomId: string, messageId: string) => {
  const messageRef = doc(
    db,
    LIVE_ROOMS_COLLECTION,
    roomId,
    "messages",
    messageId,
  );
  await deleteDoc(messageRef);
};

export const getLiveConnectionId = (userA: string, userB: string) =>
  [userA, userB].sort().join("_");

export const ensureLiveConnection = async (
  roomId: string,
  userA: string,
  userB: string,
) => {
  const [offererId, answererId] = [userA, userB].sort();
  const connectionId = getLiveConnectionId(userA, userB);
  const connectionRef = doc(
    db,
    LIVE_ROOMS_COLLECTION,
    roomId,
    "connections",
    connectionId,
  );
  await setDoc(
    connectionRef,
    {
      offererId,
      answererId,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
  return { connectionId, offererId, answererId };
};

export const listenToLiveConnection = (
  roomId: string,
  connectionId: string,
  onChange: (data: any | null) => void,
) => {
  const connectionRef = doc(
    db,
    LIVE_ROOMS_COLLECTION,
    roomId,
    "connections",
    connectionId,
  );
  return onSnapshot(connectionRef, (snapshot) => {
    if (!snapshot.exists()) {
      onChange(null);
      return;
    }
    onChange({ id: snapshot.id, ...snapshot.data() });
  });
};

export const updateLiveConnection = async (
  roomId: string,
  connectionId: string,
  data: Record<string, any>,
) => {
  const connectionRef = doc(
    db,
    LIVE_ROOMS_COLLECTION,
    roomId,
    "connections",
    connectionId,
  );
  await updateDoc(connectionRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const addLiveCandidate = async (payload: {
  roomId: string;
  connectionId: string;
  role: "offer" | "answer";
  candidate: RTCIceCandidateInit;
}) => {
  const collectionName =
    payload.role === "offer" ? "offerCandidates" : "answerCandidates";
  await addDoc(
    collection(
      db,
      LIVE_ROOMS_COLLECTION,
      payload.roomId,
      "connections",
      payload.connectionId,
      collectionName,
    ),
    {
      ...payload.candidate,
      createdAt: serverTimestamp(),
    },
  );
};

export const listenToLiveCandidates = (payload: {
  roomId: string;
  connectionId: string;
  role: "offer" | "answer";
  onCandidate: (candidate: RTCIceCandidateInit) => void;
}) => {
  const collectionName =
    payload.role === "offer" ? "offerCandidates" : "answerCandidates";
  const candidatesRef = collection(
    db,
    LIVE_ROOMS_COLLECTION,
    payload.roomId,
    "connections",
    payload.connectionId,
    collectionName,
  );
  return onSnapshot(candidatesRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        payload.onCandidate(change.doc.data() as RTCIceCandidateInit);
      }
    });
  });
};

export const setLiveUserMuted = async (
  roomId: string,
  userId: string,
  muted: boolean,
) => {
  const muteRef = doc(db, LIVE_ROOMS_COLLECTION, roomId, "muted", userId);
  if (muted) {
    await setDoc(muteRef, {
      userId,
      muted: true,
      createdAt: serverTimestamp(),
    });
  } else {
    await deleteDoc(muteRef);
  }
};

export const listenToLiveMute = (
  roomId: string,
  userId: string,
  onChange: (muted: boolean) => void,
) => {
  const muteRef = doc(db, LIVE_ROOMS_COLLECTION, roomId, "muted", userId);
  return onSnapshot(muteRef, (snapshot) => {
    onChange(snapshot.exists());
  });
};
