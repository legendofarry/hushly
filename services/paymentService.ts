/// <reference types="vite/client" />

import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { PaymentRequest } from "../types";
import { createNotification } from "./notificationService";
import { updateUserProfile } from "./userService";

export const PREMIUM_PRICE_KES = Number(import.meta.env.VITE_PREMIUM_PRICE_KES);
export const PREMIUM_DURATION_DAYS = 30;
export const OWNER_EMAIL =
  import.meta.env.VITE_OWNER_EMAIL || "legendofarrie@gmail.com";
export const MPESA_TILL_NUMBER = import.meta.env.VITE_MPESA_TILL_NUMBER;
export const WHATSAPP_OWNER = import.meta.env.VITE_MPESA_WHATSAPP;

const PAYMENT_COLLECTION = "payment_requests";
const paymentRef = collection(db, PAYMENT_COLLECTION);

const mapPaymentRequest = (id: string, data: any): PaymentRequest => {
  const createdAt =
    data?.createdAt?.toMillis?.() ?? data?.createdAt ?? Date.now();
  const decisionAt = data?.decisionAt?.toMillis?.() ?? data?.decisionAt ?? null;
  return {
    id,
    userId: data.userId,
    email: data.email,
    nickname: data.nickname,
    mpesaMessageProof: data.mpesa_message_proof ?? data.mpesaMessageProof ?? "",
    status: data.status,
    createdAt,
    decisionAt,
    decisionBy: data.decisionBy,
  };
};

export const getPendingPaymentRequest = async (userId: string) => {
  const q = query(
    paymentRef,
    where("userId", "==", userId),
    where("status", "==", "pending"),
    limit(1),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return mapPaymentRequest(docSnap.id, docSnap.data());
};

export const createPaymentRequest = async (payload: {
  userId: string;
  email: string;
  nickname?: string;
  mpesaMessageProof: string;
}) => {
  const existing = await getPendingPaymentRequest(payload.userId);
  if (existing) return existing;

  const docRef = await addDoc(paymentRef, {
    userId: payload.userId,
    email: payload.email,
    nickname: payload.nickname,
    mpesa_message_proof: payload.mpesaMessageProof,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return {
    id: docRef.id,
    ...payload,
    status: "pending",
    createdAt: Date.now(),
  } as PaymentRequest;
};

export const listenToUserPaymentRequests = (
  userId: string,
  onChange: (requests: PaymentRequest[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = query(
    paymentRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(
        snapshot.docs.map((docSnap) =>
          mapPaymentRequest(docSnap.id, docSnap.data()),
        ),
      );
    },
    (error) => {
      console.error(error);
      onError?.(error as Error);
    },
  );
};

export const listenToPendingPaymentRequests = (
  onChange: (requests: PaymentRequest[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = query(
    paymentRef,
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(
        snapshot.docs.map((docSnap) =>
          mapPaymentRequest(docSnap.id, docSnap.data()),
        ),
      );
    },
    (error) => {
      console.error(error);
      onError?.(error as Error);
    },
  );
};

export const updatePaymentStatus = async (
  requestId: string,
  status: "approved" | "rejected",
  decisionBy: string,
) => {
  const requestDoc = doc(paymentRef, requestId);
  await updateDoc(requestDoc, {
    status,
    decisionBy,
    decisionAt: serverTimestamp(),
  });
};

export const approvePayment = async (payload: {
  request: PaymentRequest;
  ownerEmail: string;
}) => {
  const { request, ownerEmail } = payload;
  const expiresAt = Date.now() + PREMIUM_DURATION_DAYS * 24 * 60 * 60 * 1000;
  await updatePaymentStatus(request.id, "approved", ownerEmail);
  await updateUserProfile(request.userId, {
    isPremium: true,
    premiumExpiresAt: expiresAt,
  });
  await createNotification({
    toUserId: request.userId,
    type: "system",
    body: `Payment approved. Premium active until ${new Date(
      expiresAt,
    ).toLocaleDateString()}.`,
  });
};

export const rejectPayment = async (payload: {
  request: PaymentRequest;
  ownerEmail: string;
}) => {
  const { request, ownerEmail } = payload;
  await updatePaymentStatus(request.id, "rejected", ownerEmail);
  await createNotification({
    toUserId: request.userId,
    type: "system",
    body: "Payment rejected. Please contact support or try again.",
  });
};
