import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  EscortListing,
  EscortListingDraft,
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
import { buildEscortListingDraftAi, detectEscortListingRisk } from "../services/aiService";
import { BIO_MAX_WORDS, clampBio } from "../services/bioUtils";

interface Props {
  user: UserProfile;
}

const createId = () => Math.random().toString(36).slice(2, 10);

const buildListingDraft = (profile: UserProfile): EscortListingDraft => ({
  displayName: profile.nickname,
  age: "",
  gender: "",
  bio: clampBio(profile.bio || ""),
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
): EscortListingDraft => {
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
    bio: clampBio(listing.bio || profile.bio || ""),
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
  const [requestTarget, setRequestTarget] = useState<EscortListing | null>(
    null,
  );
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
  const [listingDraft, setListingDraft] = useState<EscortListingDraft>(() =>
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
  const [aiListingPrompt, setAiListingPrompt] = useState("");
  const [aiListingBusy, setAiListingBusy] = useState(false);
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
    const accepted = sessionStorage.getItem("hushly_age_gate_escort") === "1";
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

  const categories = ["All", "Verified", "Travel", "Video Call"];

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
    const isOwner = normalizeEmail(user.email) === normalizeEmail(OWNER_EMAIL);
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

  const listingRisk = useMemo(
    () =>
      detectEscortListingRisk({
        bio: listingDraft.bio,
        offers: listingDraft.offers,
        contactNote: listingDraft.contactNote,
      }),
    [listingDraft.bio, listingDraft.offers, listingDraft.contactNote],
  );

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

  const handleAiListingDraft = () => {
    setAiListingBusy(true);
    const aiDraft = buildEscortListingDraftAi({
      profile: user,
      prompt: aiListingPrompt,
    });
    setListingDraft((prev) => ({
      ...prev,
      ...aiDraft,
      languages: aiDraft.languages?.length ? aiDraft.languages : prev.languages,
      offers: aiDraft.offers?.length ? aiDraft.offers : prev.offers,
      servicePricing: {
        ...prev.servicePricing,
        ...(aiDraft.servicePricing ?? {}),
      },
      socials: prev.socials.length ? prev.socials : aiDraft.socials ?? prev.socials,
    }));
    setListingNotice("AI filled your listing. Review and adjust before publishing.");
    setAiListingBusy(false);
  };

  const handleListingPublish = async () => {
    if (!isPremiumUser) {
      setShowUpgradePrompt(true);
      return;
    }
    if (listingRisk.level === "high") {
      setListingNotice(
        "High-risk wording detected. Remove unsafe language before publishing.",
      );
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
        : (offers[0] ?? "");
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
        setPinError(
          "Unable to access your location. Enable GPS and try again.",
        );
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
          <h1 className="text-2xl font-black uppercase tracking-widest text-red-100">
            Lounge
          </h1>
        </div>
        <button
          onClick={() => setShowExitConfirm(true)}
          className="px-4 py-2 rounded-full border border-red-500/30 text-red-100 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 active:scale-95 transition-transform"
        >
          Exit Lounge
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
              <h2 className="text-lg font-black uppercase tracking-widest text-red-100">
                Create Your Listing
              </h2>
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
                Main service: {activeListing.mainService || "Not set"} -{" "}
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
              No listing yet.
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
              );
            })}
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000000]/90 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
            {/* Ambient Glow */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-kipepeo-pink/20 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="relative w-full max-w-2xl flex flex-col rounded-3xl border border-white/10 bg-[#121212]/95 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-300 max-h-[90vh]">
              {/* --- HEADER --- */}
              <div className="shrink-0 border-b border-white/5 p-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-white">
                      {listingStepTitles[listingStep - 1]}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mt-1">
                      Create your persona
                    </p>
                  </div>
                  <button
                    onClick={() => setShowListingModal(false)}
                    className="group flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-white/10 hover:text-white text-gray-400"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-kipepeo-pink to-purple-600 transition-all duration-500 ease-out"
                    style={{
                      width: `${(listingStep / listingStepTitles.length) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* --- SCROLLABLE CONTENT --- */}
              <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
                {listingRisk.level !== "low" && (
                  <div
                    className={`mb-6 rounded-2xl border p-4 ${
                      listingRisk.level === "high"
                        ? "border-red-500/30 bg-red-500/10 text-red-200"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    }`}
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      AI Safety Check
                    </p>
                    <ul className="mt-2 space-y-1 text-xs">
                      {listingRisk.issues.map((issue) => (
                        <li key={issue}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Step 1: Identity */}
                {listingStep === 1 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-gray-300">
                            AI Listing Builder
                          </p>
                          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">
                            Describe your vibe
                          </p>
                        </div>
                        <button
                          onClick={handleAiListingDraft}
                          disabled={aiListingBusy}
                          className="px-3 py-2 rounded-full bg-kipepeo-pink/20 text-kipepeo-pink text-[10px] font-black uppercase tracking-widest border border-kipepeo-pink/40 active:scale-95 disabled:opacity-60"
                        >
                          {aiListingBusy ? "Generating..." : "Generate Draft"}
                        </button>
                      </div>
                      <textarea
                        value={aiListingPrompt}
                        onChange={(e) => setAiListingPrompt(e.target.value)}
                        rows={2}
                        placeholder="Luxury companion, travel-friendly, bilingual, soft-spoken."
                        className="w-full rounded-xl bg-[#0a0a0a] border border-white/10 p-3 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none"
                      />
                      <p className="text-[10px] text-gray-500">
                        AI will prefill your listing. Review before publishing.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Display Name{" "}
                        <span className="text-gray-600">(Locked)</span>
                      </label>
                      <div className="w-full rounded-xl bg-white/5 border border-white/5 px-4 py-3.5 text-sm text-gray-400 opacity-60 cursor-not-allowed font-medium">
                        {listingDraft.displayName}
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          Exact Age
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
                          className="w-full rounded-xl bg-[#0a0a0a] border border-white/10 px-4 py-3.5 text-sm text-white placeholder:text-gray-600 focus:border-kipepeo-pink focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
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
                            className={`relative overflow-hidden rounded-xl border p-4 text-left transition-all active:scale-[0.98] ${
                              listingDraft.gender === option.value
                                ? "border-kipepeo-pink bg-gradient-to-br from-kipepeo-pink/20 to-purple-900/20 text-white"
                                : "border-white/10 bg-[#0a0a0a] text-gray-400 hover:border-white/20 hover:bg-white/5"
                            }`}
                          >
                            <p className="text-sm font-black uppercase tracking-wider relative z-10">
                              {option.label}
                            </p>
                            <p className="mt-1 text-[10px] text-gray-500 relative z-10">
                              {option.hint}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Bio / About
                      </label>
                      <textarea
                        rows={4}
                        value={listingDraft.bio}
                        onChange={(e) =>
                          setListingDraft((prev) => ({
                            ...prev,
                            bio: clampBio(e.target.value),
                          }))
                        }
                        placeholder={`Describe your vibe... (max ${BIO_MAX_WORDS} words)`}
                        className="w-full rounded-xl bg-[#0a0a0a] border border-white/10 p-4 text-sm text-white placeholder:text-gray-600 focus:border-kipepeo-pink focus:outline-none transition-colors resize-none"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Languages Spoken
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {LANGUAGE_OPTIONS.map((language) => (
                          <button
                            key={language}
                            onClick={() => handleToggleLanguage(language)}
                            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${
                              listingDraft.languages.includes(language)
                                ? "bg-white text-black border-white hover:bg-gray-200"
                                : "bg-transparent text-gray-400 border-white/10 hover:border-white/30 hover:text-white"
                            }`}
                          >
                            {language}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Offers */}
                {listingStep === 2 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Select Your Services
                      </label>
                      <div className="flex flex-wrap gap-2.5">
                        {SERVICE_OPTIONS.map((offer) => (
                          <button
                            key={offer}
                            onClick={() => handleToggleOffer(offer)}
                            className={`group px-4 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest border transition-all ${
                              listingDraft.offers.includes(offer)
                                ? "bg-kipepeo-pink border-kipepeo-pink text-white shadow-[0_0_15px_-3px_rgba(236,72,153,0.4)]"
                                : "bg-[#0a0a0a] border-white/10 text-gray-400 hover:border-white/30 hover:text-white"
                            }`}
                          >
                            {offer}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Additional Details{" "}
                        <span className="text-gray-600">(Optional)</span>
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
                        placeholder="Describe your offers in your own words..."
                        className="w-full rounded-xl bg-[#0a0a0a] border border-white/10 p-4 text-sm text-white placeholder:text-gray-600 focus:border-kipepeo-pink focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Pricing */}
                {listingStep === 3 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          Service Pricing
                        </label>
                        <span className="text-[10px] text-gray-600">
                          Set rates in KES
                        </span>
                      </div>

                      {listingDraft.offers.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
                          <p className="text-sm text-gray-500">
                            Go back to Step 2 to select services first.
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {listingDraft.offers.map((offer) => (
                            <div
                              key={offer}
                              className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0a0a0a] p-3 transition-colors hover:border-white/20"
                            >
                              <span className="flex-1 text-xs font-bold uppercase tracking-wider text-gray-200 pl-2">
                                {offer}
                              </span>

                              <div className="relative w-24 sm:w-32">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
                                  KES
                                </span>
                                <input
                                  value={
                                    listingDraft.servicePricing[offer] || ""
                                  }
                                  onChange={(e) =>
                                    handleServicePriceChange(
                                      offer,
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0"
                                  className="w-full rounded-lg bg-white/5 border border-white/5 py-2 pl-9 pr-3 text-right text-sm text-white focus:border-kipepeo-pink focus:outline-none"
                                />
                              </div>

                              <button
                                onClick={() => handleSetMainService(offer)}
                                className={`h-9 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                                  listingDraft.mainService === offer
                                    ? "bg-white text-black border-white"
                                    : "bg-transparent text-gray-500 border-white/10 hover:text-white"
                                }`}
                              >
                                {listingDraft.mainService === offer
                                  ? "Main"
                                  : "Set Main"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
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
                        placeholder="e.g. Weekdays after 6pm, Weekends all day..."
                        className="w-full rounded-xl bg-[#0a0a0a] border border-white/10 p-4 text-sm text-white placeholder:text-gray-600 focus:border-kipepeo-pink focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Step 4: Contact */}
                {listingStep === 4 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Phone Number{" "}
                        <span className="text-gray-600">(Public)</span>
                      </label>
                      <input
                        value={listingDraft.phone}
                        onChange={(e) =>
                          setListingDraft((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        placeholder="+254 7..."
                        className="w-full rounded-xl bg-[#0a0a0a] border border-white/10 px-4 py-3.5 text-sm text-white placeholder:text-gray-600 focus:border-kipepeo-pink focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Contact Preferences{" "}
                        <span className="text-gray-600">(Optional)</span>
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
                        placeholder="e.g. WhatsApp only, No calls after 10pm..."
                        className="w-full rounded-xl bg-[#0a0a0a] border border-white/10 p-4 text-sm text-white placeholder:text-gray-600 focus:border-kipepeo-pink focus:outline-none"
                      />
                    </div>

                    <div className="rounded-xl bg-kipepeo-pink/10 border border-kipepeo-pink/20 p-4 flex items-start gap-3">
                      <span className="text-lg">📱</span>
                      <p className="text-xs text-kipepeo-pink/80 leading-relaxed">
                        Your number will be visible to registered users. Call
                        and Chat buttons will be added to your profile
                        automatically.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 5: Photos */}
                {listingStep === 5 && (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    {/* Public Photos Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          Public Photos <span className="text-red-400">*</span>
                        </label>
                        <span className="text-[9px] uppercase tracking-wider text-gray-600">
                          Visible to everyone
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {/* Upload Button */}
                        <label className="aspect-[3/4] cursor-pointer flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-white/5 transition-all hover:bg-white/10 hover:border-white/40">
                          <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center mb-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-gray-400"
                            >
                              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path>
                              <line x1="16" y1="5" x2="22" y2="5"></line>
                              <line x1="19" y1="2" x2="19" y2="8"></line>
                              <circle cx="9" cy="9" r="2"></circle>
                              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                            </svg>
                          </div>
                          <span className="text-[9px] font-bold uppercase text-gray-400">
                            Add
                          </span>
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

                        {/* Previews */}
                        {listingDraft.publicPhotos.map((photo) => (
                          <div
                            key={photo}
                            className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-black"
                          >
                            <AppImage
                              src={photo}
                              alt="Public"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                              <button
                                onClick={() =>
                                  setListingDraft((prev) => ({
                                    ...prev,
                                    publicPhotos: prev.publicPhotos.filter(
                                      (item) => item !== photo,
                                    ),
                                  }))
                                }
                                className="p-2 rounded-full bg-white/10 hover:bg-red-500/80 text-white transition-colors"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {uploadingPublic && (
                        <p className="text-xs text-kipepeo-pink animate-pulse">
                          Uploading photos...
                        </p>
                      )}
                      {uploadError && (
                        <p className="text-xs text-red-400">{uploadError}</p>
                      )}
                    </div>

                    {/* X Photos Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-kipepeo-pink">
                          X Photos
                        </label>
                        <span className="rounded bg-kipepeo-pink/20 px-2 py-0.5 text-[9px] font-bold uppercase text-kipepeo-pink">
                          Premium Only
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <label className="aspect-[3/4] cursor-pointer flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-kipepeo-pink/30 bg-kipepeo-pink/5 transition-all hover:bg-kipepeo-pink/10 hover:border-kipepeo-pink/50">
                          <div className="h-8 w-8 rounded-full bg-kipepeo-pink/20 flex items-center justify-center mb-2">
                            <span className="text-kipepeo-pink text-lg">
                              🔒
                            </span>
                          </div>
                          <span className="text-[9px] font-bold uppercase text-kipepeo-pink/70">
                            Add X
                          </span>
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

                        {listingDraft.xPhotos.map((photo) => (
                          <div
                            key={photo}
                            className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-kipepeo-pink/20 bg-black"
                          >
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none">
                              <span className="text-xl">🔞</span>
                            </div>
                            <AppImage
                              src={photo}
                              alt="X Photo"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 z-20 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                              <button
                                onClick={() =>
                                  setListingDraft((prev) => ({
                                    ...prev,
                                    xPhotos: prev.xPhotos.filter(
                                      (item) => item !== photo,
                                    ),
                                  }))
                                }
                                className="p-2 rounded-full bg-white/10 hover:bg-red-500/80 text-white transition-colors"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {uploadingX && (
                        <p className="text-xs text-kipepeo-pink animate-pulse">
                          Uploading private content...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 6: Location */}
                {listingStep === 6 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Primary Location
                      </label>
                      <input
                        value={listingDraft.primaryLocation}
                        onChange={(e) =>
                          setListingDraft((prev) => ({
                            ...prev,
                            primaryLocation: e.target.value,
                          }))
                        }
                        placeholder="City, District, or Area"
                        className="w-full rounded-xl bg-[#0a0a0a] border border-white/10 px-4 py-3.5 text-sm text-white placeholder:text-gray-600 focus:border-kipepeo-pink focus:outline-none"
                      />
                    </div>

                    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] p-5 shadow-lg">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-widest text-white">
                            Pin Exact Location
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Helping clients find you nearby.
                          </p>
                        </div>
                        <button
                          onClick={handlePinLocation}
                          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-transform active:scale-95 ${
                            listingDraft.locationLat !== null
                              ? "bg-green-500/20 text-green-400 border border-green-500/50"
                              : "bg-white text-black hover:bg-gray-200"
                          }`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          {pinningLocation
                            ? "Pinning..."
                            : listingDraft.locationLat !== null
                              ? "Pinned"
                              : "Drop Pin"}
                        </button>
                      </div>
                      {pinError && (
                        <p className="mt-3 text-xs text-red-400 bg-red-400/10 p-2 rounded">
                          {pinError}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Other Locations{" "}
                        <span className="text-gray-600">(Optional)</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          value={locationInput}
                          onChange={(e) => setLocationInput(e.target.value)}
                          placeholder="Add another area..."
                          className="flex-1 rounded-xl bg-[#0a0a0a] border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30"
                        />
                        <button
                          onClick={handleAddLocation}
                          className="px-5 rounded-xl bg-white/10 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/20"
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
                            className="flex items-center gap-1 pl-3 pr-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:border-red-500/50 hover:text-red-400 transition-colors"
                          >
                            {location}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center ${listingDraft.travelOk ? "bg-kipepeo-pink border-kipepeo-pink" : "border-gray-500"}`}
                      >
                        {listingDraft.travelOk && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-white"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={listingDraft.travelOk}
                        onChange={(e) =>
                          setListingDraft((prev) => ({
                            ...prev,
                            travelOk: e.target.checked,
                          }))
                        }
                        className="hidden"
                      />
                      <span className="text-sm font-medium text-gray-200">
                        I am available to travel
                      </span>
                    </label>
                  </div>
                )}

                {/* Step 7: Video */}
                {listingStep === 7 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <label className="flex items-center gap-4 p-5 rounded-xl border border-white/5 bg-gradient-to-r from-kipepeo-purple/10 to-transparent cursor-pointer transition-colors">
                      <div
                        className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${listingDraft.videoCallEnabled ? "bg-kipepeo-pink border-kipepeo-pink" : "border-gray-500"}`}
                      >
                        {listingDraft.videoCallEnabled && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-white"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={listingDraft.videoCallEnabled}
                        onChange={(e) =>
                          setListingDraft((prev) => ({
                            ...prev,
                            videoCallEnabled: e.target.checked,
                          }))
                        }
                        className="hidden"
                      />
                      <div>
                        <span className="block text-sm font-bold text-white uppercase tracking-wide">
                          Enable Video Calls
                        </span>
                        <span className="block text-xs text-gray-500 mt-0.5">
                          Allow users to request video dates
                        </span>
                      </div>
                    </label>

                    {listingDraft.videoCallEnabled && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          Who can request calls?
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {(
                            [
                              "public",
                              "premium",
                              "private",
                            ] as VideoCallVisibility[]
                          ).map((visibility) => (
                            <button
                              key={visibility}
                              onClick={() =>
                                setListingDraft((prev) => ({
                                  ...prev,
                                  videoCallVisibility: visibility,
                                }))
                              }
                              className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                listingDraft.videoCallVisibility === visibility
                                  ? "bg-white text-black border-white shadow-lg"
                                  : "bg-[#0a0a0a] text-gray-500 border-white/10 hover:border-white/30 hover:text-white"
                              }`}
                            >
                              {visibility === "public"
                                ? "Everyone"
                                : visibility === "premium"
                                  ? "Premium Only"
                                  : "Private"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 8: Socials & Verification */}
                {listingStep === 8 && (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          Social Links
                        </label>
                        <button
                          onClick={handleAddSocial}
                          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/10"
                        >
                          + Add Link
                        </button>
                      </div>

                      {listingDraft.socials.length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-white/10 rounded-xl">
                          <p className="text-xs text-gray-500">
                            No social links added yet.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {listingDraft.socials.map((social) => (
                            <div
                              key={social.id}
                              className="flex flex-col gap-2 p-3 rounded-xl bg-[#0a0a0a] border border-white/5 sm:flex-row sm:items-center"
                            >
                              <div className="flex flex-1 gap-2">
                                <input
                                  value={social.platform}
                                  onChange={(e) =>
                                    handleSocialChange(
                                      social.id,
                                      "platform",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Platform (e.g. IG)"
                                  className="flex-1 min-w-0 rounded-lg bg-white/5 border border-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
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
                                  className="flex-[1.5] min-w-0 rounded-lg bg-white/5 border border-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                                />
                              </div>

                              <div className="flex items-center justify-between gap-3 sm:justify-end">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <div
                                    className={`w-4 h-4 rounded border flex items-center justify-center ${social.isPublic ? "bg-kipepeo-pink border-kipepeo-pink" : "border-gray-600"}`}
                                  >
                                    {social.isPublic && (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="10"
                                        height="10"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="text-white"
                                      >
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                    )}
                                  </div>
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
                                    className="hidden"
                                  />
                                  <span className="text-[10px] font-bold uppercase text-gray-400">
                                    Public
                                  </span>
                                </label>
                                <button
                                  onClick={() => handleRemoveSocial(social.id)}
                                  className="text-gray-500 hover:text-red-400 transition-colors"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-kipepeo-purple/30 bg-gradient-to-br from-kipepeo-purple/10 to-transparent p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-widest text-white">
                            Verification Badge
                          </h4>
                          <p className="text-[10px] uppercase tracking-wider text-kipepeo-purple mt-1">
                            Status:{" "}
                            {listingDraft.verificationStatus === "verified"
                              ? "Verified"
                              : listingDraft.verificationStatus === "pending"
                                ? "Pending Review"
                                : "Unverified"}
                          </p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-kipepeo-purple/20 flex items-center justify-center text-kipepeo-purple">
                          ✓
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                        Boost your credibility. Verified profiles get 3x more
                        interactions.
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
                          className="mt-4 w-full rounded-lg bg-white/10 border border-white/10 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/20 transition-colors"
                        >
                          {listingDraft.verificationStatus === "pending"
                            ? "Cancel Request"
                            : "Request Verification"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* --- FOOTER --- */}
              <div className="shrink-0 border-t border-white/5 p-6 bg-[#121212]/95 backdrop-blur-xl rounded-b-3xl">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() =>
                      setListingStep((prev) => Math.max(1, prev - 1))
                    }
                    disabled={listingStep === 1}
                    className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-400 transition-colors hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
                  >
                    Back
                  </button>

                  {listingStep < listingStepTitles.length ? (
                    <button
                      onClick={() =>
                        setListingStep((prev) =>
                          Math.min(listingStepTitles.length, prev + 1),
                        )
                      }
                      disabled={!listingStepValid || listingSubmitting}
                      className="group relative overflow-hidden rounded-xl bg-white px-8 py-3 text-xs font-black uppercase tracking-widest text-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      <span className="relative z-10">Next Step</span>
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-50 transition-transform duration-700 group-hover:translate-x-full"></div>
                    </button>
                  ) : (
                    <button
                      onClick={handleListingPublish}
                      disabled={!listingStepValid || listingSubmitting}
                      className="relative overflow-hidden rounded-xl bg-gradient-to-r from-kipepeo-pink to-purple-600 px-8 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-kipepeo-pink/25 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:shadow-none"
                    >
                      {listingSubmitting ? (
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                          Publishing...
                        </span>
                      ) : (
                        "Publish Listing"
                      )}
                    </button>
                  )}
                </div>
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
                      ? previewListing.servicePricing[
                          previewListing.mainService
                        ] || "-"
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
                Leave Lounge?
              </h3>
              <p className="text-sm text-gray-400">Are you sure?</p>
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
