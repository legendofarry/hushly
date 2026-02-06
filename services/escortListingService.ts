import {
  collection,
  deleteDoc,
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
import { EscortListing, UserProfile } from "../types";

const COLLECTION = "escort_listings";
const listingsRef = collection(db, COLLECTION);

const mapListing = (id: string, data: any): EscortListing => {
  const createdAt =
    data?.createdAt?.toMillis?.() ?? data?.createdAt ?? Date.now();
  const updatedAt =
    data?.updatedAt?.toMillis?.() ?? data?.updatedAt ?? createdAt;

  return {
    id,
    ownerId: data?.ownerId ?? id,
    ownerNickname: data?.ownerNickname ?? "",
    ownerPhotoUrl: data?.ownerPhotoUrl ?? "",
    ownerArea: data?.ownerArea ?? "",
    displayName: data?.displayName ?? data?.ownerNickname ?? "",
    age: data?.age ?? "",
    gender: data?.gender ?? "",
    bio: data?.bio ?? "",
    languages: data?.languages ?? [],
    offers: data?.offers ?? [],
    offerNotes: data?.offerNotes ?? "",
    servicePricing: data?.servicePricing ?? {},
    mainService: data?.mainService ?? data?.offers?.[0] ?? "",
    availability: data?.availability ?? "",
    phone: data?.phone ?? "",
    contactNote: data?.contactNote ?? "",
    publicPhotos: data?.publicPhotos ?? [],
    xPhotos: data?.xPhotos ?? [],
    primaryLocation: data?.primaryLocation ?? "",
    extraLocations: data?.extraLocations ?? [],
    travelOk: Boolean(data?.travelOk),
    locationLat: data?.locationLat ?? null,
    locationLng: data?.locationLng ?? null,
    videoCallEnabled: Boolean(data?.videoCallEnabled),
    videoCallVisibility: data?.videoCallVisibility ?? "private",
    socials: data?.socials ?? [],
    verificationStatus: data?.verificationStatus ?? "none",
    isActive: data?.isActive ?? true,
    createdAt,
    updatedAt,
  };
};

export const listenToEscortListings = (
  onChange: (listings: EscortListing[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = query(
    listingsRef,
    where("isActive", "==", true),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(snapshot.docs.map((docSnap) => mapListing(docSnap.id, docSnap.data())));
    },
    (error) => {
      console.error(error);
      onError?.(error as Error);
    },
  );
};

export const listenToUserEscortListing = (
  userId: string,
  onChange: (listing: EscortListing | null) => void,
  onError?: (error: Error) => void,
) => {
  if (!userId) return () => undefined;
  const listingRef = doc(db, COLLECTION, userId);
  return onSnapshot(
    listingRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      onChange(mapListing(snapshot.id, snapshot.data()));
    },
    (error) => {
      console.error(error);
      onError?.(error as Error);
    },
  );
};

export const saveEscortListing = async (
  user: UserProfile,
  listing: Omit<
    EscortListing,
    "id" | "ownerId" | "ownerNickname" | "ownerPhotoUrl" | "ownerArea" | "createdAt" | "updatedAt" | "isActive"
  >,
) => {
  const listingRef = doc(db, COLLECTION, user.id);
  await setDoc(
    listingRef,
    {
      ownerId: user.id,
      ownerNickname: user.nickname,
      ownerPhotoUrl: user.photoUrl,
      ownerArea: user.area,
      ...listing,
      isActive: true,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const deactivateEscortListing = async (userId: string) => {
  const listingRef = doc(db, COLLECTION, userId);
  await updateDoc(listingRef, {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
};

export const deleteEscortListing = async (userId: string) => {
  const listingRef = doc(db, COLLECTION, userId);
  await deleteDoc(listingRef);
};
