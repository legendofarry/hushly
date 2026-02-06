import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  EscortListing,
  EscortSocialLink,
  UserProfile,
  VerificationStatus,
  VideoCallVisibility,
} from "../types";
import { createNotification } from "../services/notificationService";
import {
  deactivateEscortListing,
  deleteEscortListing,
  listenToEscortListings,
  listenToUserEscortListing,
  saveEscortListing,
} from "../services/escortListingService";
import { uploadToCloudinary } from "../services/cloudinaryService";
import { OWNER_EMAIL } from "../services/paymentService";
import AppImage from "../components/AppImage";
import LottiePlayer from "../components/LottiePlayer";

interface Props {
  user: UserProfile;
}

type ListingDraft = {
  displayName: string;
  age: string;
  gender: string;
  bio: string;
  languages: string[];
  offers: string[];
  offerNotes: string;
  servicePricing: Record<string, string>;
  mainService: string;
  availability: string;
  phone: string;
  contactNote: string;
  publicPhotos: string[];
  xPhotos: string[];
  primaryLocation: string;
  extraLocations: string[];
  travelOk: boolean;
  locationLat: number | null;
  locationLng: number | null;
  videoCallEnabled: boolean;
  videoCallVisibility: VideoCallVisibility;
  socials: EscortSocialLink[];
  verificationStatus: VerificationStatus;
};

const createId = () => Math.random().toString(36).slice(2, 10);

const buildListingDraft = (profile: UserProfile): ListingDraft => ({
  displayName: profile.nickname,
  age: "",
  gender: "",
  bio: profile.bio || "",
  languages: [],
  offers: [],
  offerNotes: "",
  servicePricing: {},
  mainService: "",
  availability: "",
  phone: "",
  contactNote: "",
  publicPhotos: [],
  xPhotos: [],
  primaryLocation: profile.area || "",
  extraLocations: [],
  travelOk: false,
  locationLat: null,
  locationLng: null,
  videoCallEnabled: false,
  videoCallVisibility: "private",
  socials: [],
  verificationStatus: "none",
});

const buildListingDraftFromListing = (
  listing: EscortListing,
  profile: UserProfile,
): ListingDraft => {
  const offers = listing.offers ?? [];
  const servicePricing = { ...(listing.servicePricing ?? {}) };
  offers.forEach((offer) => {
    if (!servicePricing[offer]) {
      servicePricing[offer] = "";
    }
  });

  return {
    displayName: listing.displayName || profile.nickname,
    age: listing.age || "",
    gender: listing.gender || "",
    bio: listing.bio || profile.bio || "",
    languages: listing.languages ?? [],
    offers,
    offerNotes: listing.offerNotes ?? "",
    servicePricing,
    mainService: listing.mainService || offers[0] || "",
    availability: listing.availability ?? "",
    phone: listing.phone ?? "",
    contactNote: listing.contactNote ?? "",
    publicPhotos: listing.publicPhotos ?? [],
    xPhotos: listing.xPhotos ?? [],
    primaryLocation: listing.primaryLocation ?? profile.area ?? "",
    extraLocations: listing.extraLocations ?? [],
    travelOk: Boolean(listing.travelOk),
    locationLat: listing.locationLat ?? null,
    locationLng: listing.locationLng ?? null,
    videoCallEnabled: Boolean(listing.videoCallEnabled),
    videoCallVisibility: listing.videoCallVisibility ?? "private",
    socials: listing.socials ?? [],
    verificationStatus: listing.verificationStatus ?? "none",
  };
};

const GENDER_OPTIONS = [
  { value: "Female", label: "Female", hint: "She / Her" },
  { value: "Male", label: "Male", hint: "He / Him" },
  { value: "Non-binary", label: "Non-binary", hint: "They / Them" },
  { value: "Trans", label: "Trans", hint: "Trans identity" },
  { value: "Other", label: "Other", hint: "Self-described" },
];

const LANGUAGE_OPTIONS = [
  "English",
  "Swahili",
  "Sheng",
  "French",
  "Arabic",
  "Somali",
  "Kikuyu",
  "Luo",
  "Luhya",
  "Kamba",
  "Kisii",
  "Meru",
  "Maasai",
  "Taita",
  "Turkana",
  "Oromo",
];

const SERVICE_OPTIONS = [
  "Blow job",
  "Handjob",
  "A / A-Levels (Anal sex)",
  "Active only (Male escort who only penetrates)",
  "At discretion (Services based on escort's comfort)",
  "BDSM (Bondage, Discipline, Dominance, Submission, Sadomasochism)",
  "Being filmed (Face covered or face visible)",
  "BFE / Boyfriend Experience",
  "Bi-sexual",
  "CBT (Cock and Ball Torture)",
  "CIF / Facial (Come In Face)",
  "CIM (Come In Mouth / Oral to completion)",
  "COB (Cum On Body)",
  "Couples (Service for a client and their partner)",
  "Cross Dressing (Including Transvestite roleplay)",
  "DATY (Dine At the Y / Female oral sex)",
  "DFK (Deep French Kissing)",
  "Dirty talk",
  "Domination and submission (D/S)",
  "Dominatrix / Mistress",
  "Double penetration (DP)",
  "DT (Deep Throat)",
  "Duo / Threesome (With girls or boys)",
  "Escort (Companionship)",
  "Fetishes (Including Bondage, Feet, Hair, Rubber, and Sadomasochism)",
  "Fist / PM (Fisting or Prostate Massage)",
];

const normalizeEmail = (value?: string | null) =>
  (value ?? "").trim().toLowerCase();

const EscortHomePage: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<EscortListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [detailsListing, setDetailsListing] = useState<EscortListing | null>(
    null,
  );
  const [requestTarget, setRequestTarget] =
    useState<EscortListing | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestContact, setRequestContact] = useState(user.email || "");
  const [requestSending, setRequestSending] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [exitLoading, setExitLoading] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [ageGateChecked, setAgeGateChecked] = useState(false);
  const [showListingModal, setShowListingModal] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [listingStep, setListingStep] = useState(1);
  const [listingDraft, setListingDraft] = useState<ListingDraft>(() =>
    buildListingDraft(user),
  );
  const [userListing, setUserListing] = useState<EscortListing | null>(null);
  const [listingNotice, setListingNotice] = useState<string | null>(null);
  const [listingPreviewOpen, setListingPreviewOpen] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [uploadingPublic, setUploadingPublic] = useState(false);
  const [uploadingX, setUploadingX] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pinningLocation, setPinningLocation] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [listingSubmitting, setListingSubmitting] = useState(false);
  const hearts = useMemo(
    () =>
      Array.from({ length: 40 }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        size: Math.random() * 18 + 10,
        duration: Math.random() * 10 + 10,
        delay: Math.random() * 10,
      })),
    [],
  );

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToEscortListings(
      (data) => {
        setListings(data.filter((listing) => listing.ownerId !== user.id));
        setLoading(false);
      },
      () => {
        setError("Unable to load escort listings right now.");
        setLoading(false);
      },
    );

    return () => {
      unsubscribe?.();
    };
  }, [user.id]);

  useEffect(() => {
    const unsubscribe = listenToUserEscortListing(
      user.id,
      (listing) => {
        setUserListing(listing);
      },
      () => {
        setListingNotice("Unable to load your listing right now.");
      },
    );

    return () => {
      unsubscribe?.();
    };
  }, [user.id]);

  useEffect(() => {
    const accepted =
      sessionStorage.getItem("hushly_age_gate_escort") === "1";
    if (!accepted) {
      setShowAgeGate(true);
      setAgeGateChecked(false);
    }
  }, []);

  useEffect(() => {
    if (userListing) {
      setListingDraft(buildListingDraftFromListing(userListing, user));
    } else {
      setListingDraft(buildListingDraft(user));
    }
  }, [user.id, userListing]);

  const categories = [
    "All",
    "Verified",
    "Travel",
    "Video Call",
  ];

  const filteredListings = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return listings.filter((listing) => {
      const matchesQuery =
        !normalized ||
        listing.displayName.toLowerCase().includes(normalized) ||
        listing.primaryLocation.toLowerCase().includes(normalized) ||
        listing.mainService.toLowerCase().includes(normalized) ||
        listing.offers.some((offer) =>
          offer.toLowerCase().includes(normalized),
        );
      const matchesCategory =
        category === "All" ||
        (category === "Verified" &&
          listing.verificationStatus === "verified") ||
        (category === "Travel" && listing.travelOk) ||
        (category === "Video Call" && listing.videoCallEnabled);
      return matchesQuery && matchesCategory;
    });
  }, [listings, query, category]);

  const isPremiumUser = useMemo(() => {
    const isOwner =
      normalizeEmail(user.email) === normalizeEmail(OWNER_EMAIL);
    if (isOwner) return true;
    if (!user.isPremium) return false;
    if (!user.premiumExpiresAt) return true;
    return user.premiumExpiresAt > Date.now();
  }, [user.email, user.isPremium, user.premiumExpiresAt]);
  const activeListing = userListing?.isActive ? userListing : null;
  const listingStepTitles = [
    "Basic Info",
    "What She Offers",
    "Rates & Availability",
    "Contact",
    "Gallery",
    "Location",
    "Video Call",
    "Social Links",
  ];

  const listingStepValid = useMemo(() => {
    const hasServicePricing =
      listingDraft.offers.length > 0 &&
      listingDraft.offers.every(
        (offer) => listingDraft.servicePricing[offer]?.trim().length > 0,
      );
    const hasMainService =
      listingDraft.mainService.length > 0 &&
      listingDraft.offers.includes(listingDraft.mainService);
    switch (listingStep) {
      case 1:
        return (
          listingDraft.age.trim().length > 0 &&
          listingDraft.gender.trim().length > 0 &&
          listingDraft.bio.trim().length > 0 &&
          listingDraft.languages.length > 0
        );
      case 2:
        return listingDraft.offers.length > 0;
      case 3:
        return (
          hasServicePricing &&
          hasMainService &&
          listingDraft.availability.trim().length > 0
        );
      case 4:
        return listingDraft.phone.trim().length > 0;
      case 5:
        return listingDraft.publicPhotos.length > 0 && !uploadingPublic;
      case 6:
        return (
          listingDraft.primaryLocation.trim().length > 0 &&
          listingDraft.locationLat !== null &&
          listingDraft.locationLng !== null
        );
      default:
        return true;
    }
  }, [listingDraft, listingStep, uploadingPublic]);

  useEffect(() => {
    if (!listingNotice) return;
    const timer = setTimeout(() => setListingNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [listingNotice]);

  useEffect(() => {
    if (!copyNotice) return;
    const timer = setTimeout(() => setCopyNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [copyNotice]);

  const handleOpenListing = () => {
    if (!isPremiumUser) {
      setShowUpgradePrompt(true);
      return;
    }
    if (activeListing) {
      setListingDraft(buildListingDraftFromListing(activeListing, user));
    } else {
      setListingDraft(buildListingDraft(user));
    }
    setListingStep(1);
    setShowListingModal(true);
  };

  const handleListingPublish = async () => {
    if (!isPremiumUser) {
      setShowUpgradePrompt(true);
      return;
    }
    const mainService =
      listingDraft.mainService || listingDraft.offers[0] || "";
    const servicePricing = listingDraft.offers.reduce<Record<string, string>>(
      (acc, offer) => {
        acc[offer] = listingDraft.servicePricing[offer] ?? "";
        return acc;
      },
      {},
    );
    setListingSubmitting(true);
    setListingNotice(null);
    try {
      await saveEscortListing(user, {
        displayName: listingDraft.displayName,
        age: listingDraft.age,
        gender: listingDraft.gender,
        bio: listingDraft.bio,
        languages: listingDraft.languages,
        offers: listingDraft.offers,
        offerNotes: listingDraft.offerNotes,
        servicePricing,
        mainService,
        availability: listingDraft.availability,
        phone: listingDraft.phone,
        contactNote: listingDraft.contactNote,
        publicPhotos: listingDraft.publicPhotos,
        xPhotos: listingDraft.xPhotos,
        primaryLocation: listingDraft.primaryLocation,
        extraLocations: listingDraft.extraLocations,
        travelOk: listingDraft.travelOk,
        locationLat: listingDraft.locationLat,
        locationLng: listingDraft.locationLng,
        videoCallEnabled: listingDraft.videoCallEnabled,
        videoCallVisibility: listingDraft.videoCallVisibility,
        socials: listingDraft.socials,
        verificationStatus: listingDraft.verificationStatus,
      });
      setListingNotice(
        activeListing
          ? "Listing updated and visible to all users."
          : "Listing saved and now visible to all users.",
      );
      setShowListingModal(false);
      setListingStep(1);
    } catch (err) {
      console.error(err);
      setListingNotice("Unable to save listing. Please try again.");
    } finally {
      setListingSubmitting(false);
    }
  };

  const handleToggleLanguage = (language: string) => {
    setListingDraft((prev) => {
      const exists = prev.languages.includes(language);
      return {
        ...prev,
        languages: exists
          ? prev.languages.filter((item) => item !== language)
          : [...prev.languages, language],
      };
    });
  };

  const handleToggleOffer = (offer: string) => {
    setListingDraft((prev) => {
      const exists = prev.offers.includes(offer);
      const offers = exists
        ? prev.offers.filter((item) => item !== offer)
        : [...prev.offers, offer];
      const servicePricing = { ...prev.servicePricing };
      if (exists) {
        delete servicePricing[offer];
      } else if (!servicePricing[offer]) {
        servicePricing[offer] = "";
      }
      const mainService = offers.includes(prev.mainService)
        ? prev.mainService
        : offers[0] ?? "";
      return {
        ...prev,
        offers,
        servicePricing,
        mainService,
      };
    });
  };

  const handleServicePriceChange = (offer: string, price: string) => {
    setListingDraft((prev) => ({
      ...prev,
      servicePricing: { ...prev.servicePricing, [offer]: price },
    }));
  };

  const handleSetMainService = (offer: string) => {
    setListingDraft((prev) => ({
      ...prev,
      mainService: offer,
    }));
  };

  const handleAddLocation = () => {
    const value = locationInput.trim();
    if (!value) return;
    setListingDraft((prev) => ({
      ...prev,
      extraLocations: Array.from(new Set([...prev.extraLocations, value])),
    }));
    setLocationInput("");
  };

  const handlePinLocation = () => {
    if (!navigator.geolocation) {
      setPinError("Location services are not supported on this device.");
      return;
    }
    setPinError(null);
    setPinningLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setListingDraft((prev) => ({
          ...prev,
          locationLat: position.coords.latitude,
          locationLng: position.coords.longitude,
        }));
        setPinningLocation(false);
      },
      (err) => {
        console.error(err);
        setPinError("Unable to access your location. Enable GPS and try again.");
        setPinningLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handlePhotoUpload = async (
    files: FileList | null,
    type: "public" | "x",
  ) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    if (type === "public") {
      setUploadingPublic(true);
    } else {
      setUploadingX(true);
    }
    try {
      for (const file of Array.from(files)) {
        const url = await uploadToCloudinary(file);
        setListingDraft((prev) => ({
          ...prev,
          publicPhotos:
            type === "public"
              ? Array.from(new Set([...prev.publicPhotos, url]))
              : prev.publicPhotos,
          xPhotos:
            type === "x"
              ? Array.from(new Set([...prev.xPhotos, url]))
              : prev.xPhotos,
        }));
      }
    } catch (err) {
      console.error(err);
      setUploadError("Unable to upload image. Please try again.");
    } finally {
      if (type === "public") {
        setUploadingPublic(false);
      } else {
        setUploadingX(false);
      }
    }
  };

  const handleSocialChange = (
    id: string,
    field: keyof EscortSocialLink,
    value: string | boolean,
  ) => {
    setListingDraft((prev) => ({
      ...prev,
      socials: prev.socials.map((social) =>
        social.id === id ? { ...social, [field]: value } : social,
      ),
    }));
  };

  const handleAddSocial = () => {
    setListingDraft((prev) => ({
      ...prev,
      socials: [
        ...prev.socials,
        { id: createId(), platform: "", handle: "", isPublic: true },
      ],
    }));
  };

  const handleRemoveSocial = (id: string) => {
    setListingDraft((prev) => ({
      ...prev,
      socials: prev.socials.filter((social) => social.id !== id),
    }));
  };

  const handleCopyValue = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyNotice("Copied to clipboard.");
    } catch (err) {
      console.error(err);
      setCopyNotice("Copy not supported. Please copy manually.");
    }
  };

  const handleDeactivateListing = async () => {
    if (!userListing?.isActive) return;
    if (!window.confirm("Deactivate your listing?")) return;
    try {
      await deactivateEscortListing(user.id);
      setListingNotice("Listing deactivated. You can create a new one now.");
    } catch (err) {
      console.error(err);
      setListingNotice("Unable to deactivate listing right now.");
    }
  };

  const handleDeleteListing = async () => {
    if (!userListing) return;
    if (!window.confirm("Delete your listing permanently?")) return;
    try {
      await deleteEscortListing(user.id);
      setListingNotice("Listing deleted.");
    } catch (err) {
      console.error(err);
      setListingNotice("Unable to delete listing right now.");
    }
  };

  const handleRequestOpen = (target: EscortListing) => {
    setRequestFeedback(null);
    setRequestError(null);
    setRequestTarget(target);
    setRequestMessage("");
    setRequestContact(user.email || "");
  };

  const handleRequestSend = async () => {
    if (!requestTarget) return;
    if (!requestMessage.trim() || !requestContact.trim()) {
      setRequestError("Please add your contact and a short request message.");
      return;
    }
    setRequestSending(true);
    setRequestError(null);
    try {
      await createNotification({
        toUserId: requestTarget.ownerId,
        fromUserId: user.id,
        fromNickname: user.nickname,
        type: "system",
        body: `New escort request for ${requestTarget.displayName} from ${user.nickname}. Contact: ${requestContact}. Message: ${requestMessage}`,
      });
      setRequestFeedback("Request sent. The escort will reach out soon.");
      setRequestTarget(null);
      setRequestMessage("");
    } catch (err) {
      console.error(err);
      setRequestError("Unable to send request right now.");
    } finally {
      setRequestSending(false);
    }
  };

  const handleExitConfirm = () => {
    setShowExitConfirm(false);
    setExitLoading(true);
    setTimeout(() => {
      navigate("/discover");
    }, 1400);
  };

  const previewListing = useMemo(() => {
    if (activeListing) {
      return buildListingDraftFromListing(activeListing, user);
    }
    return listingDraft;
  }, [activeListing, listingDraft, user]);

  return (
    <div className="min-h-screen bg-[#0b0508] text-white font-sans relative overflow-hidden">
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(100vh) scale(0.6); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(-70vh) scale(1.2); opacity: 0; }
        }
      `}</style>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,0,120,0.25),_transparent_55%)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(255,90,0,0.18),_transparent_55%)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {hearts.map((heart) => (
          <div
            key={heart.id}
            className="absolute text-rose-300/70"
            style={{
              left: `${heart.left}%`,
              bottom: "-50px",
              fontSize: `${heart.size}px`,
              animation: `floatUp ${heart.duration}s linear infinite`,
              animationDelay: `-${heart.delay}s`,
            }}
          >
            {"\u2764"}
          </div>
        ))}
      </div>

      <header className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-white/5 sticky top-0 z-20 backdrop-blur-sm bg-[#0b0508]/80">
        <div>
          <p className="text-[10px] text-rose-200 uppercase tracking-[0.5em]">
            Confidential
          </p>
          <h1 className="text-2xl font-black uppercase tracking-widest text-red-100">
            Velvet Escort Lounge
          </h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em]">
            Verified private companions
          </p>
        </div>
        <button
          onClick={() => setShowExitConfirm(true)}
          className="px-4 py-2 rounded-full border border-red-500/30 text-red-100 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 active:scale-95 transition-transform"
        >
          Exit Escort Portal
        </button>
      </header>

      <div className="px-6 py-6 space-y-6 relative z-10">
        {requestFeedback && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {requestFeedback}
          </div>
        )}

        {listingNotice && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {listingNotice}
          </div>
        )}

        {copyNotice && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-gray-300">
            {copyNotice}
          </div>
        )}

        <section className="rounded-3xl border border-red-500/25 bg-[#14070c]/90 p-5 space-y-4 shadow-[0_0_30px_rgba(255,0,90,0.08)]">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-[10px] text-rose-200 uppercase tracking-[0.5em]">
                Premium Listings
              </p>
              <h2 className="text-lg font-black uppercase tracking-widest text-red-100">
                Create Your Listing
              </h2>
              <p className="text-sm text-gray-400 max-w-lg">
                Only premium members can create listings. Everyone can browse
                listings. X Photos are visible only to premium viewers.
              </p>
            </div>
            {!activeListing ? (
              <button
                onClick={handleOpenListing}
                className="px-5 py-3 rounded-full bg-red-500/90 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
              >
                Create Listing
              </button>
            ) : (
              <button
                onClick={handleOpenListing}
                className="px-5 py-3 rounded-full bg-red-500/80 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
              >
                Edit Listing
              </button>
            )}
          </div>

          {!isPremiumUser && (
            <div className="rounded-2xl border border-red-500/30 bg-black/30 p-4 text-sm text-gray-300">
              Premium is required to publish a listing. You can still browse
              listings below, and upgrade from the main app when you are ready.
            </div>
          )}

          {activeListing ? (
            <div className="rounded-2xl border border-red-500/20 bg-black/40 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                    Your Listing
                  </p>
                  <p className="text-lg font-black text-white">
                    {activeListing.displayName}
                  </p>
                </div>
                {activeListing.verificationStatus === "verified" && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                    Verified
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-300 line-clamp-2">
                {activeListing.bio || "Complete your bio to stand out."}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-gray-500">
                Main service:{" "}
                {activeListing.mainService || "Not set"} -{" "}
                {activeListing.mainService
                  ? activeListing.servicePricing[activeListing.mainService] ||
                    "Ask"
                  : "Ask"}
              </p>
              <div className="flex flex-wrap gap-2">
                {activeListing.languages.map((language) => (
                  <span
                    key={language}
                    className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-500/30 text-red-200"
                  >
                    {language}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setListingPreviewOpen(true)}
                  className="px-4 py-2 rounded-full bg-white/10 text-gray-200 text-[10px] font-black uppercase tracking-widest border border-white/10 active:scale-95 transition-transform"
                >
                  Preview Listing
                </button>
                <button
                  onClick={handleOpenListing}
                  className="px-4 py-2 rounded-full bg-red-500/80 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform"
                >
                  Edit Listing
                </button>
                <button
                  onClick={handleDeactivateListing}
                  className="px-4 py-2 rounded-full bg-black/50 text-gray-300 text-[10px] font-black uppercase tracking-widest border border-white/10"
                >
                  Deactivate
                </button>
                <button
                  onClick={handleDeleteListing}
                  className="px-4 py-2 rounded-full bg-white/5 text-gray-300 text-[10px] font-black uppercase tracking-widest border border-white/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-red-500/20 bg-black/40 p-4 text-sm text-gray-400">
              No listing yet. Click "Create Listing" to build your premium
              profile with rates, gallery, contact details, and more.
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-red-500/20 bg-[#14070c]/80 p-5 space-y-4 shadow-[0_0_30px_rgba(255,0,90,0.08)]">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">
              Browse Listings
            </h2>
            <span className="text-[10px] text-gray-500 uppercase tracking-[0.3em]">
              {filteredListings.length} available
            </span>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, service, or location"
            className="w-full rounded-2xl bg-black/40 border border-red-500/20 px-4 py-3 text-sm text-red-100 placeholder:text-gray-500 focus:outline-none focus:border-red-400/40"
          />
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  category === item
                    ? "bg-red-500/80 text-white border-red-400/60"
                    : "bg-black/40 text-gray-400 border-red-500/20"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="text-center py-20 text-gray-500 text-sm">
            Loading escort listings...
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-400 text-sm">{error}</div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            No listings available right now. Check back later.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredListings.map((listing) => {
              const heroImage = listing.publicPhotos[0];
              const mainPrice =
                listing.servicePricing[listing.mainService] || "Ask";
              return (
              <div
                key={listing.id}
                className="rounded-3xl border border-red-500/20 bg-[#14070c]/90 overflow-hidden shadow-[0_0_30px_rgba(255,0,90,0.08)]"
              >
                <div className="relative h-72">
                  {heroImage ? (
                    <AppImage
                      src={heroImage}
                      alt={listing.displayName}
                      className="w-full h-full object-cover"
                      fetchPriority="high"
                    />
                  ) : (
                    <div className="w-full h-full bg-black/50 flex items-center justify-center text-xs uppercase tracking-widest text-gray-500">
                      No Photo
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                  <div className="absolute bottom-4 left-4">
                    <p className="text-xl font-black">
                      {listing.displayName}
                    </p>
                    <p className="text-xs text-gray-300 uppercase tracking-widest">
                      {listing.primaryLocation}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-rose-200">
                      {listing.mainService || "Service"} - {mainPrice}
                    </p>
                  </div>
                  {listing.verificationStatus === "verified" && (
                    <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] uppercase tracking-widest text-emerald-200">
                      Verified
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {listing.bio}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {listing.offers.slice(0, 3).map((offer) => (
                      <span
                        key={`${listing.id}-${offer}`}
                        className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 text-gray-300"
                      >
                        {offer}
                      </span>
                    ))}
                    {listing.offers.length > 3 && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 text-gray-400">
                        +{listing.offers.length - 3} more
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRequestOpen(listing)}
                      className="flex-1 py-2 rounded-full bg-red-500/90 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
                    >
                      Request
                    </button>
                    <button
                      onClick={() => setDetailsListing(listing)}
                      className="flex-1 py-2 rounded-full bg-black/40 text-gray-300 text-xs font-black uppercase tracking-widest border border-red-500/20 text-center"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}

        <section className="rounded-3xl border border-red-500/20 bg-[#14070c]/80 p-5 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-red-200">
            Safety First
          </h3>
          <p className="text-sm text-gray-400">
            Meet in public places, share your location with a trusted friend,
            and trust your instincts. We verify profiles but your safety comes
            first.
          </p>
        </section>

        {showUpgradePrompt && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-6">
            <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#14070c] p-6 space-y-4 text-center">
              <h3 className="text-base font-black uppercase tracking-widest text-red-100">
                Premium Required
              </h3>
              <p className="text-sm text-gray-400">
                Only premium members can create listings. You can still browse
                the listings here, and upgrade from the main app whenever you
                are ready.
              </p>
              <button
                onClick={() => setShowUpgradePrompt(false)}
                className="w-full py-3 rounded-full bg-red-500/90 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {showListingModal && (
          <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/90 px-6 py-10 overflow-y-auto">
            <div className="w-full max-w-2xl rounded-3xl border border-red-500/30 bg-[#14070c] p-6 space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.5em] text-rose-200">
                    Step {listingStep} of {listingStepTitles.length}
                  </p>
                  <h3 className="text-lg font-black uppercase tracking-widest text-red-100">
                    {listingStepTitles[listingStep - 1]}
                  </h3>
                </div>
                <button
                  onClick={() => setShowListingModal(false)}
                  className="text-xs uppercase tracking-widest text-gray-400"
                >
                  Close
                </button>
              </div>

              {listingStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500">
                      Display name (locked)
                    </label>
                    <input
                      value={listingDraft.displayName}
                      disabled
                      className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-gray-400 cursor-not-allowed"
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-gray-500">
                        Exact age
                      </label>
                      <input
                        value={listingDraft.age}
                        onChange={(e) =>
                          setListingDraft((prev) => ({
                            ...prev,
                            age: e.target.value,
                          }))
                        }
                        placeholder="e.g. 24"
                        className="w-full rounded-2xl bg-black/40 border border-red-500/20 px-4 py-3 text-sm text-red-100 placeholder:text-gray-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500">
                      Gender
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {GENDER_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() =>
                            setListingDraft((prev) => ({
                              ...prev,
                              gender: option.value,
                            }))
                          }
                          className={`rounded-2xl border px-4 py-3 text-left transition-transform active:scale-[0.98] ${
                            listingDraft.gender === option.value
                              ? "bg-red-500/90 border-red-400/60 text-white shadow-[0_0_20px_rgba(255,0,90,0.2)]"
                              : "bg-black/40 border-red-500/20 text-gray-300"
                          }`}
                        >
                          <p className="text-sm font-black uppercase tracking-widest">
                            {option.label}
                          </p>
                          <p className="text-[10px] uppercase tracking-widest text-gray-400">
                            {option.hint}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500">
                      Bio / About
                    </label>
                    <textarea
                      rows={4}
                      value={listingDraft.bio}
                      onChange={(e) =>
                        setListingDraft((prev) => ({
                          ...prev,
                          bio: e.target.value,
                        }))
                      }
                      placeholder="Describe your vibe, experience, and what makes you unique."
                      className="w-full rounded-2xl bg-black/40 border border-red-500/20 p-3 text-sm text-red-100 placeholder:text-gray-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500">
                      Languages spoken
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGE_OPTIONS.map((language) => (
                        <button
                          key={language}
                          onClick={() =>
                            handleToggleLanguage(language)
                          }
                          className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            listingDraft.languages.includes(language)
                              ? "bg-red-500/80 text-white border-red-400/60"
                              : "bg-black/40 text-gray-400 border-red-500/20"
                          }`}
                        >
                          {language}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                      Tap to select one or more languages.
                    </p>
                  </div>
                </div>
              )}

              {listingStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500">
                      What you offer
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SERVICE_OPTIONS.map((offer) => (
                        <button
                          key={offer}
                          onClick={() => handleToggleOffer(offer)}
                          className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            listingDraft.offers.includes(offer)
                              ? "bg-red-500/80 text-white border-red-400/60"
                              : "bg-black/40 text-gray-400 border-red-500/20"
                          }`}
                        >
                          {offer}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                      Select one or more services.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500">
                      Additional details (optional)
                    </label>
                    <textarea
                      rows={4}
                      value={listingDraft.offerNotes}
                      onChange={(e) =>
                        setListingDraft((prev) => ({
                          ...prev,
                          offerNotes: e.target.value,
                        }))
                      }
                      placeholder="Describe your offers in your own words."
                      className="w-full rounded-2xl bg-black/40 border border-red-500/20 p-3 text-sm text-red-100 placeholder:text-gray-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {listingStep === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500">
                      Service pricing (set a price for each service)
                    </label>
                    {listingDraft.offers.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        Select services in Step 2 to set pricing.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {listingDraft.offers.map((offer) => (
                          <div
                            key={offer}
                            className="flex flex-wrap items-center gap-2 rounded-2xl border border-red-500/20 bg-black/40 px-3 py-3"
                          >
                            <span className="flex-1 text-xs uppercase tracking-widest text-gray-200">
                              {offer}
                            </span>
                            <input
                              value={listingDraft.servicePricing[offer] || ""}
                              onChange={(e) =>
                                handleServicePriceChange(
                                  offer,
                                  e.target.value,
                                )
                              }
                              placeholder="KES"
                              className="w-28 rounded-2xl bg-black/50 border border-red-500/20 px-3 py-2 text-sm text-red-100 placeholder:text-gray-500 focus:outline-none"
                            />
                            <button
                              onClick={() => handleSetMainService(offer)}
                              className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                listingDraft.mainService === offer
                                  ? "bg-red-500/80 text-white border-red-400/60"
                                  : "bg-white/5 text-gray-300 border-white/10"
                              }`}
                            >
                              {listingDraft.mainService === offer
                                ? "Main Service"
                                : "Set Main"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {listingDraft.offers.length > 0 && (
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                        Choose a main service to feature on your listing card.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500">
                      Availability
                    </label>
                    <textarea
                      rows={3}
                      value={listingDraft.availability}
                      onChange={(e) =>
                        setListingDraft((prev) => ({
                          ...prev,
                          availability: e.target.value,
                        }))
                      }
                      placeholder="When are you available?"
                      className="w-full rounded-2xl bg-black/40 border border-red-500/20 p-3 text-sm text-red-100 placeholder:text-gray-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {listingStep === 4 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500">
                      Phone number (public)
                    </label>
                    <input
                      value={listingDraft.phone}
                      onChange={(e) =>
                        setListingDraft((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      placeholder="+254..."
                      className="w-full rounded-2xl bg-black/40 border border-red-500/20 px-4 py-3 text-sm text-red-100 placeholder:text-gray-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500">
                      Contact note (optional)
                    </label>
                    <textarea
                      rows={3}
                      value={listingDraft.contactNote}
                      onChange={(e) =>
                        setListingDraft((prev) => ({
                          ...prev,
                          contactNote: e.target.value,
                        }))
                      }
                      placeholder="Add any contact preferences."
                      className="w-full rounded-2xl bg-black/40 border border-red-500/20 p-3 text-sm text-red-100 placeholder:text-gray-500 focus:outline-none"
                    />
                  </div>
                  <div className="rounded-2xl border border-red-500/20 bg-black/40 p-4 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-gray-400">
                      Call + In-app chat buttons will appear on your listing.
                    </span>
                  </div>
                </div>
              )}

              {listingStep === 5 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-widest text-gray-500">
                        Public photos
                      </label>
                      <span className="text-[10px] uppercase tracking-widest text-gray-500">
                        Visible to all
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="px-4 py-3 rounded-full bg-red-500/80 text-white text-xs font-black uppercase tracking-widest cursor-pointer">
                        Upload Photos
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(event) => {
                            handlePhotoUpload(event.target.files, "public");
                            event.currentTarget.value = "";
                          }}
                          className="hidden"
                        />
                      </label>
                      {uploadingPublic && (
                        <span className="text-[10px] uppercase tracking-widest text-gray-500">
                          Uploading...
                        </span>
                      )}
                    </div>
                    {uploadError && (
                      <p className="text-xs text-red-300">{uploadError}</p>
                    )}
                    {listingDraft.publicPhotos.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        Add at least one public photo (required).
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {listingDraft.publicPhotos.map((photo) => (
                          <div
                            key={photo}
                            className="relative rounded-2xl overflow-hidden border border-red-500/20"
                          >
                            <AppImage
                              src={photo}
                              alt="Public"
                              className="w-full h-24 object-cover"
                            />
                            <button
                              onClick={() =>
                                setListingDraft((prev) => ({
                                  ...prev,
                                  publicPhotos: prev.publicPhotos.filter(
                                    (item) => item !== photo,
                                  ),
                                }))
                              }
                              className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/70 text-[10px] uppercase tracking-widest text-white"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-widest text-gray-500">
                        X Photos
                      </label>
                      <span className="text-[10px] uppercase tracking-widest text-red-300">
                        Premium-only
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="px-4 py-3 rounded-full bg-white/10 text-gray-200 text-xs font-black uppercase tracking-widest border border-white/10 cursor-pointer">
                        Upload X Photos
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(event) => {
                            handlePhotoUpload(event.target.files, "x");
                            event.currentTarget.value = "";
                          }}
                          className="hidden"
                        />
                      </label>
                      {uploadingX && (
                        <span className="text-[10px] uppercase tracking-widest text-gray-500">
                          Uploading...
                        </span>
                      )}
                    </div>
                    {listingDraft.xPhotos.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        Optional: add premium-only photos.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {listingDraft.xPhotos.map((photo) => (
                          <div
                            key={photo}
                            className="relative rounded-2xl overflow-hidden border border-white/10"
                          >
                            <AppImage
                              src={photo}
                              alt="X Photo"
                              className="w-full h-24 object-cover"
                            />
                            <button
                              onClick={() =>
                                setListingDraft((prev) => ({
                                  ...prev,
                                  xPhotos: prev.xPhotos.filter(
                                    (item) => item !== photo,
                                  ),
                                }))
                              }
                              className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/70 text-[10px] uppercase tracking-widest text-white"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {listingStep === 6 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500">
                      Primary location
                    </label>
                    <input
                      value={listingDraft.primaryLocation}
                      onChange={(e) =>
                        setListingDraft((prev) => ({
                          ...prev,
                          primaryLocation: e.target.value,
                        }))
                      }
                      placeholder="City or area"
                      className="w-full rounded-2xl bg-black/40 border border-red-500/20 px-4 py-3 text-sm text-red-100 placeholder:text-gray-500 focus:outline-none"
                    />
                  </div>
                  <div className="rounded-2xl border border-red-500/20 bg-black/40 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-gray-500">
                          Pin exact location (mandatory)
                        </p>
                        <p className="text-xs text-gray-400">
                          Location pin helps clients see your exact area.
                        </p>
                      </div>
                      <button
                        onClick={handlePinLocation}
                        className="px-4 py-2 rounded-full bg-red-500/80 text-white text-[10px] font-black uppercase tracking-widest"
                      >
                        {pinningLocation
                          ? "Pinning..."
                          : listingDraft.locationLat !== null
                            ? "Pinned"
                            : "Pin Location"}
                      </button>
                    </div>
                    {listingDraft.locationLat !== null &&
                      listingDraft.locationLng !== null && (
                        <p className="text-[10px] uppercase tracking-widest text-gray-500">
                          Lat {listingDraft.locationLat.toFixed(5)} - Lng{" "}
                          {listingDraft.locationLng.toFixed(5)}
                        </p>
                      )}
                    {pinError && (
                      <p className="text-xs text-red-300">{pinError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500">
                      Additional locations (optional)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        placeholder="Add location"
                        className="flex-1 min-w-[150px] rounded-2xl bg-black/40 border border-red-500/20 px-4 py-3 text-sm text-red-100 placeholder:text-gray-500 focus:outline-none"
                      />
                      <button
                        onClick={handleAddLocation}
                        className="px-4 py-3 rounded-full bg-white/10 text-gray-200 text-xs font-black uppercase tracking-widest border border-white/10"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {listingDraft.extraLocations.map((location) => (
                        <button
                          key={location}
                          onClick={() =>
                            setListingDraft((prev) => ({
                              ...prev,
                              extraLocations: prev.extraLocations.filter(
                                (item) => item !== location,
                              ),
                            }))
                          }
                          className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 text-gray-300"
                        >
                          {location} x
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-3 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={listingDraft.travelOk}
                      onChange={(e) =>
                        setListingDraft((prev) => ({
                          ...prev,
                          travelOk: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 accent-red-500"
                    />
                    Available to travel
                  </label>
                </div>
              )}

              {listingStep === 7 && (
                <div className="space-y-4">
                  <label className="flex items-center gap-3 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={listingDraft.videoCallEnabled}
                      onChange={(e) =>
                        setListingDraft((prev) => ({
                          ...prev,
                          videoCallEnabled: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 accent-red-500"
                    />
                    Allow video calls
                  </label>
                  {listingDraft.videoCallEnabled && (
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-gray-500">
                        Visibility
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(["public", "premium", "private"] as VideoCallVisibility[]).map(
                          (visibility) => (
                            <button
                              key={visibility}
                              onClick={() =>
                                setListingDraft((prev) => ({
                                  ...prev,
                                  videoCallVisibility: visibility,
                                }))
                              }
                              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                listingDraft.videoCallVisibility === visibility
                                  ? "bg-red-500/80 text-white border-red-400/60"
                                  : "bg-black/40 text-gray-400 border-red-500/20"
                              }`}
                            >
                              {visibility === "public"
                                ? "Public"
                                : visibility === "premium"
                                  ? "Premium-only"
                                  : "Private"}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {listingStep === 8 && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-widest text-gray-500">
                        Social links
                      </label>
                      <button
                        onClick={handleAddSocial}
                        className="px-4 py-2 rounded-full bg-white/10 text-gray-200 text-[10px] font-black uppercase tracking-widest border border-white/10"
                      >
                        Add Social
                      </button>
                    </div>
                    {listingDraft.socials.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        Add your social handles and set visibility.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {listingDraft.socials.map((social) => (
                          <div
                            key={social.id}
                            className="flex flex-wrap gap-2 items-center"
                          >
                            <input
                              value={social.platform}
                              onChange={(e) =>
                                handleSocialChange(
                                  social.id,
                                  "platform",
                                  e.target.value,
                                )
                              }
                              placeholder="Platform"
                              className="flex-1 min-w-[120px] rounded-2xl bg-black/40 border border-red-500/20 px-4 py-2 text-sm text-red-100 placeholder:text-gray-500 focus:outline-none"
                            />
                            <input
                              value={social.handle}
                              onChange={(e) =>
                                handleSocialChange(
                                  social.id,
                                  "handle",
                                  e.target.value,
                                )
                              }
                              placeholder="@handle"
                              className="flex-1 min-w-[140px] rounded-2xl bg-black/40 border border-red-500/20 px-4 py-2 text-sm text-red-100 placeholder:text-gray-500 focus:outline-none"
                            />
                            <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400">
                              <input
                                type="checkbox"
                                checked={social.isPublic}
                                onChange={(e) =>
                                  handleSocialChange(
                                    social.id,
                                    "isPublic",
                                    e.target.checked,
                                  )
                                }
                                className="w-4 h-4 accent-red-500"
                              />
                              Public
                            </label>
                            <button
                              onClick={() => handleRemoveSocial(social.id)}
                              className="px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 text-gray-300"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-red-500/20 bg-black/40 p-4 space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-red-200">
                      Verification badge
                    </h4>
                    <p className="text-sm text-gray-300">
                      Status:{" "}
                      {listingDraft.verificationStatus === "verified"
                        ? "Verified"
                        : listingDraft.verificationStatus === "pending"
                          ? "Pending review"
                          : "Not verified"}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      One badge per profile. Badge applies to your entire
                      listing.
                    </p>
                    {listingDraft.verificationStatus !== "verified" && (
                      <button
                        onClick={() =>
                          setListingDraft((prev) => ({
                            ...prev,
                            verificationStatus:
                              prev.verificationStatus === "pending"
                                ? "none"
                                : "pending",
                          }))
                        }
                        className="px-4 py-2 rounded-full bg-red-500/80 text-white text-[10px] font-black uppercase tracking-widest"
                      >
                        {listingDraft.verificationStatus === "pending"
                          ? "Cancel Request"
                          : "Request Badge"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() =>
                    setListingStep((prev) => Math.max(1, prev - 1))
                  }
                  disabled={listingStep === 1}
                  className="px-4 py-2 rounded-full bg-white/10 text-gray-200 text-[10px] font-black uppercase tracking-widest border border-white/10 disabled:opacity-40"
                >
                  Back
                </button>
                <span className="text-[10px] uppercase tracking-[0.3em] text-gray-500">
                  Step {listingStep} / {listingStepTitles.length}
                </span>
                {listingStep < listingStepTitles.length ? (
                  <button
                    onClick={() =>
                      setListingStep((prev) =>
                        Math.min(listingStepTitles.length, prev + 1),
                      )
                    }
                    disabled={!listingStepValid || listingSubmitting}
                    className="px-4 py-2 rounded-full bg-red-500/90 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={handleListingPublish}
                    disabled={!listingStepValid || listingSubmitting}
                    className="px-4 py-2 rounded-full bg-red-500/90 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                  >
                    {listingSubmitting ? "Publishing..." : "Publish Listing"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {listingPreviewOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 px-6">
            <div className="w-full max-w-lg rounded-3xl border border-red-500/30 bg-[#14070c] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.5em] text-rose-200">
                    Listing Preview
                  </p>
                  <h3 className="text-lg font-black uppercase tracking-widest text-red-100">
                    {previewListing.displayName}
                  </h3>
                </div>
                <button
                  onClick={() => setListingPreviewOpen(false)}
                  className="text-xs uppercase tracking-widest text-gray-400"
                >
                  Close
                </button>
              </div>
              {previewListing.verificationStatus === "verified" && (
                <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                  Verified
                </span>
              )}
              <div className="text-sm text-gray-300">{previewListing.bio}</div>
              <div className="grid grid-cols-2 gap-3 text-[11px] text-gray-400">
                <div>
                  <p className="uppercase tracking-widest text-gray-500">
                    Exact age
                  </p>
                  <p className="text-gray-200">{previewListing.age || "-"}</p>
                </div>
                <div>
                  <p className="uppercase tracking-widest text-gray-500">
                    Gender
                  </p>
                  <p className="text-gray-200">
                    {previewListing.gender || "-"}
                  </p>
                </div>
                <div>
                  <p className="uppercase tracking-widest text-gray-500">
                    Location
                  </p>
                  <p className="text-gray-200">
                    {previewListing.primaryLocation || "-"}
                  </p>
                </div>
                <div>
                  <p className="uppercase tracking-widest text-gray-500">
                    Video call
                  </p>
                  <p className="text-gray-200">
                    {previewListing.videoCallEnabled
                      ? previewListing.videoCallVisibility
                      : "Not available"}
                  </p>
                </div>
                <div>
                  <p className="uppercase tracking-widest text-gray-500">
                    Main service
                  </p>
                  <p className="text-gray-200">
                    {previewListing.mainService || "-"}
                  </p>
                </div>
                <div>
                  <p className="uppercase tracking-widest text-gray-500">
                    Main price
                  </p>
                  <p className="text-gray-200">
                    {previewListing.mainService
                      ? previewListing.servicePricing[previewListing.mainService] ||
                        "-"
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {previewListing.languages.map((language) => (
                  <span
                    key={language}
                    className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-500/30 text-red-200"
                  >
                    {language}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {previewListing.offers.map((offer) => (
                  <span
                    key={offer}
                    className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 text-gray-300"
                  >
                    {offer}
                  </span>
                ))}
              </div>
              {previewListing.offerNotes && (
                <p className="text-[11px] text-gray-400">
                  {previewListing.offerNotes}
                </p>
              )}

              <div className="rounded-2xl border border-red-500/20 bg-black/40 p-4 space-y-2">
                <h4 className="text-xs font-black uppercase tracking-widest text-red-200">
                  Rates & Availability
                </h4>
                <div className="space-y-1 text-[11px] text-gray-300">
                  {previewListing.offers.map((offer) => (
                    <div
                      key={offer}
                      className="flex items-center justify-between"
                    >
                      <span>{offer}</span>
                      <span>{previewListing.servicePricing[offer] || "-"}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400">
                  {previewListing.availability || "Availability not set."}
                </p>
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-black/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest text-red-200">
                    Gallery
                  </h4>
                  <span className="text-[10px] uppercase tracking-widest text-red-300">
                    X Photos premium-only
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {previewListing.publicPhotos.map((photo) => (
                    <div
                      key={photo}
                      className="rounded-2xl overflow-hidden border border-red-500/20"
                    >
                      <AppImage
                        src={photo}
                        alt="Public"
                        className="w-full h-20 object-cover"
                      />
                    </div>
                  ))}
                </div>
                {previewListing.xPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {previewListing.xPhotos.map((photo) => (
                      <div
                        key={photo}
                        className="rounded-2xl overflow-hidden border border-white/10"
                      >
                        <AppImage
                          src={photo}
                          alt="X"
                          className="w-full h-20 object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-black/40 p-4 space-y-2">
                <h4 className="text-xs font-black uppercase tracking-widest text-red-200">
                  Contact
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCopyValue(previewListing.phone)}
                    className="flex-1 py-2 rounded-full bg-red-500/90 text-white text-[10px] font-black uppercase tracking-widest"
                  >
                    Call
                  </button>
                  <button
                    disabled
                    className="flex-1 py-2 rounded-full bg-white/10 text-gray-500 text-[10px] font-black uppercase tracking-widest border border-white/10 cursor-not-allowed"
                  >
                    In-App Chat
                  </button>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500">
                  Tap Call to copy your public number.
                </p>
                {previewListing.contactNote && (
                  <p className="text-[11px] text-gray-400">
                    {previewListing.contactNote}
                  </p>
                )}
              </div>

              {previewListing.socials.length > 0 && (
                <div className="rounded-2xl border border-red-500/20 bg-black/40 p-4 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-red-200">
                    Social Links
                  </h4>
                  <div className="space-y-2 text-[11px] text-gray-300">
                    {previewListing.socials.map((social) => (
                      <div
                        key={social.id}
                        className="flex items-center justify-between"
                      >
                        <span>
                          {social.platform || "Social"}: {social.handle || "-"}
                        </span>
                        <span className="text-[10px] uppercase tracking-widest text-gray-500">
                          {social.isPublic ? "Public" : "Hidden"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {detailsListing &&
          (() => {
            const mainPrice =
              detailsListing.servicePricing[detailsListing.mainService] ||
              "Ask";
            const heroPhoto = detailsListing.publicPhotos[0];
            return (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-6">
                <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-[#14070c] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black uppercase tracking-widest">
                        {detailsListing.displayName}
                      </h3>
                      <p className="text-xs text-gray-500 uppercase tracking-[0.3em]">
                        {detailsListing.primaryLocation}
                      </p>
                    </div>
                    <button
                      onClick={() => setDetailsListing(null)}
                      className="text-xs uppercase tracking-widest text-gray-400"
                    >
                      Close
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border border-red-500/30">
                      {heroPhoto ? (
                        <AppImage
                          src={heroPhoto}
                          alt={detailsListing.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-black/50 flex items-center justify-center text-[10px] uppercase tracking-widest text-gray-500">
                          No Photo
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-widest text-gray-400">
                        Exact Age: {detailsListing.age || "-"}
                      </p>
                      <p className="text-xs uppercase tracking-widest text-gray-400">
                        Gender: {detailsListing.gender || "-"}
                      </p>
                      <p className="text-xs uppercase tracking-widest text-gray-400">
                        Main Service: {detailsListing.mainService || "-"} -{" "}
                        {mainPrice}
                      </p>
                    </div>
                  </div>

                  {detailsListing.verificationStatus === "verified" && (
                    <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                      Verified
                    </span>
                  )}

                  <p className="text-sm text-gray-300">{detailsListing.bio}</p>

                  <div className="flex flex-wrap gap-2">
                    {detailsListing.languages.map((language) => (
                      <span
                        key={language}
                        className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-500/30 text-red-200"
                      >
                        {language}
                      </span>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-red-500/20 bg-black/40 p-4 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-red-200">
                      Services & Pricing
                    </h4>
                    <div className="space-y-2 text-[11px] text-gray-300">
                      {detailsListing.offers.map((offer) => (
                        <div
                          key={`${detailsListing.id}-${offer}`}
                          className="flex items-center justify-between"
                        >
                          <span>{offer}</span>
                          <span>
                            {detailsListing.servicePricing[offer] || "Ask"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-red-500/20 bg-black/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-widest text-red-200">
                        Gallery
                      </h4>
                      {!isPremiumUser && (
                        <span className="text-[10px] uppercase tracking-widest text-red-300">
                          X Photos locked
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {detailsListing.publicPhotos.slice(0, 2).map((photo) => (
                        <div
                          key={photo}
                          className="rounded-2xl overflow-hidden border border-red-500/20"
                        >
                          <AppImage
                            src={photo}
                            alt="Public"
                            className="w-full h-28 object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    {isPremiumUser ? (
                      detailsListing.xPhotos.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {detailsListing.xPhotos.slice(0, 2).map((photo) => (
                            <div
                              key={photo}
                              className="rounded-2xl overflow-hidden border border-white/10"
                            >
                              <AppImage
                                src={photo}
                                alt="X"
                                className="w-full h-28 object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-[10px] uppercase tracking-widest text-gray-500 text-center">
                          No X Photos shared yet.
                        </div>
                      )
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-[10px] uppercase tracking-widest text-gray-500 text-center">
                        Upgrade to view X Photos.
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-red-500/20 bg-black/40 p-4 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-red-200">
                      Contact
                    </h4>
                    <div className="text-[11px] text-gray-400">
                      Phone number is public on premium listings. Contact
                      details are available after you send a request.
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyValue(detailsListing.phone)}
                        className="flex-1 py-2 rounded-full bg-red-500/90 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform"
                      >
                        Call
                      </button>
                      <button
                        onClick={() => {
                          setDetailsListing(null);
                          handleRequestOpen(detailsListing);
                        }}
                        className="flex-1 py-2 rounded-full bg-black/40 text-gray-300 text-[10px] font-black uppercase tracking-widest border border-red-500/20 text-center"
                      >
                        In-App Chat
                      </button>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500">
                      Tap Call to copy the public number.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

        {requestTarget && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-6">
            <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-[#14070c] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black uppercase tracking-widest">
                    Request {requestTarget.displayName}
                  </h3>
                  <p className="text-xs text-gray-500 uppercase tracking-[0.3em]">
                    Share how to reach you
                  </p>
                </div>
                <button
                  onClick={() => setRequestTarget(null)}
                  className="text-xs uppercase tracking-widest text-gray-400"
                >
                  Close
                </button>
              </div>
              <input
                value={requestContact}
                onChange={(e) => setRequestContact(e.target.value)}
                placeholder="WhatsApp or phone"
                className="w-full rounded-2xl bg-black/40 border border-red-500/20 px-4 py-3 text-sm text-red-100 placeholder:text-gray-500 focus:outline-none"
              />
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={3}
                placeholder="Short request message"
                className="w-full rounded-2xl bg-black/40 border border-red-500/20 p-3 text-sm text-red-100 placeholder:text-gray-500 focus:outline-none"
              />
              {requestError && (
                <p className="text-xs text-red-300">{requestError}</p>
              )}
              <button
                onClick={handleRequestSend}
                disabled={requestSending}
                className="w-full py-3 rounded-full bg-red-500/90 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-60"
              >
                {requestSending ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        )}

        {showExitConfirm && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-6">
            <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#14070c] p-6 space-y-4 text-center">
              <h3 className="text-base font-black uppercase tracking-widest text-red-100">
                Leave Escort Portal?
              </h3>
              <p className="text-sm text-gray-400">
                You will return to the main app. Are you sure?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-3 rounded-full bg-white/5 text-gray-300 text-xs font-black uppercase tracking-widest border border-red-500/20 active:scale-95 transition-transform"
                >
                  Stay
                </button>
                <button
                  onClick={handleExitConfirm}
                  className="flex-1 py-3 rounded-full bg-red-500/90 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}

        {exitLoading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 px-6">
            <LottiePlayer
              path="/assets/lottie/loading.json"
              className="w-40 h-40"
            />
            <p className="mt-4 text-xs uppercase tracking-[0.3em] text-red-200">
              Exiting portal...
            </p>
          </div>
        )}

        {showAgeGate && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 px-6">
            <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#14070c] p-6 space-y-4 text-center">
              <h3 className="text-xl font-black uppercase tracking-widest text-red-100">
                Age Gate
              </h3>
              <p className="text-sm text-gray-300">
                You must be 18+ to continue.
              </p>
              <label className="flex items-center justify-center gap-3 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={ageGateChecked}
                  onChange={(e) => setAgeGateChecked(e.target.checked)}
                  className="w-4 h-4 accent-red-500"
                />
                I confirm I am at least 18 years old.
              </label>
              <p className="text-[10px] text-gray-500">
                By continuing, you agree you are of legal age in your
                jurisdiction and understand this area contains adult content.
              </p>
              <button
                onClick={() => {
                  if (!ageGateChecked) return;
                  sessionStorage.setItem("hushly_age_gate_escort", "1");
                  setShowAgeGate(false);
                }}
                disabled={!ageGateChecked}
                className="w-full py-3 rounded-full bg-red-500/90 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-60"
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EscortHomePage;
