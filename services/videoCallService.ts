import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile } from "../types";

const CALLS_COLLECTION = "video_calls";
const callsRef = collection(db, CALLS_COLLECTION);

type VideoCallStatus = "ringing" | "accepted" | "ended" | "declined" | "missed";

export type VideoCallRecord = {
  id: string;
  conversationId: string;
  callerId: string;
  callerNickname: string;
  callerPhotoUrl?: string;
  calleeId: string;
  calleeNickname: string;
  calleePhotoUrl?: string;
  status: VideoCallStatus;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  createdAt?: number;
};

const mapCall = (id: string, data: any): VideoCallRecord => ({
  id,
  conversationId: data.conversationId,
  callerId: data.callerId,
  callerNickname: data.callerNickname,
  callerPhotoUrl: data.callerPhotoUrl,
  calleeId: data.calleeId,
  calleeNickname: data.calleeNickname,
  calleePhotoUrl: data.calleePhotoUrl,
  status: data.status,
  offer: data.offer,
  answer: data.answer,
  createdAt: data?.createdAt?.toMillis?.() ?? data?.createdAt,
});

export const createVideoCall = async (payload: {
  conversationId: string;
  caller: UserProfile;
  callee: { id: string; nickname: string; photoUrl?: string };
}) => {
  const callRef = doc(callsRef);
  await setDoc(callRef, {
    conversationId: payload.conversationId,
    callerId: payload.caller.id,
    callerNickname: payload.caller.nickname,
    callerPhotoUrl: payload.caller.photoUrl,
    calleeId: payload.callee.id,
    calleeNickname: payload.callee.nickname,
    calleePhotoUrl: payload.callee.photoUrl ?? "",
    status: "ringing",
    createdAt: serverTimestamp(),
  });
  return callRef.id;
};

export const updateVideoCall = async (
  callId: string,
  data: Record<string, any>,
) => {
  const callRef = doc(callsRef, callId);
  await updateDoc(callRef, data);
};

export const listenToVideoCall = (
  callId: string,
  onChange: (call: VideoCallRecord | null) => void,
) => {
  const callRef = doc(callsRef, callId);
  return onSnapshot(callRef, (snapshot) => {
    if (!snapshot.exists()) {
      onChange(null);
      return;
    }
    onChange(mapCall(snapshot.id, snapshot.data()));
  });
};

export const listenToIncomingVideoCalls = (payload: {
  calleeId: string;
  conversationId: string;
  onChange: (calls: VideoCallRecord[]) => void;
}) => {
  const q = query(
    callsRef,
    where("calleeId", "==", payload.calleeId),
    where("conversationId", "==", payload.conversationId),
    where("status", "==", "ringing"),
  );
  return onSnapshot(q, (snapshot) => {
    payload.onChange(snapshot.docs.map((docSnap) => mapCall(docSnap.id, docSnap.data())));
  });
};

export const addVideoCallCandidate = async (payload: {
  callId: string;
  role: "caller" | "callee";
  candidate: RTCIceCandidateInit;
}) => {
  const collectionName =
    payload.role === "caller" ? "callerCandidates" : "calleeCandidates";
  await addDoc(collection(db, CALLS_COLLECTION, payload.callId, collectionName), {
    ...payload.candidate,
  });
};

export const listenToVideoCallCandidates = (payload: {
  callId: string;
  role: "caller" | "callee";
  onCandidate: (candidate: RTCIceCandidateInit) => void;
}) => {
  const collectionName =
    payload.role === "caller" ? "callerCandidates" : "calleeCandidates";
  const candidatesRef = collection(
    db,
    CALLS_COLLECTION,
    payload.callId,
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
