export enum IntentType {
  FRIENDS = "Friends",
  CHILL = "Chill Buddies",
  CASUAL = "Casual Meetups",
  RELATIONSHIP = "Relationships",
  MUTUAL = "Mutual / Sugar",
  HIRING = "Companionship (Hire)",
  PLANS = "Plans & Hangouts",
}

export type Gender = "female" | "male" | "nonbinary" | "other";
export type GenderPreference = Gender | "everyone";

export const GENDER_PREFERENCE_OPTIONS: {
  value: GenderPreference;
  label: string;
}[] = [
  { value: "female", label: "Women" },
  { value: "male", label: "Men" },
  { value: "nonbinary", label: "Non-binary" },
  { value: "other", label: "Other" },
  { value: "everyone", label: "Everyone" },
];


export interface UserProfile {
  id: string;
  realName: string; // Private
  nickname: string; // Public
  nicknameLower?: string;
  email: string;
  emailVerified: boolean;
  isPremium?: boolean;
  premiumExpiresAt?: number | null;
  followerCount?: number;
  occupation?: string;
  occupationVisibility?: "public" | "private";
  gender?: Gender;
  interestedIn?: GenderPreference[];
  voiceIntroUrl?: string;
  voiceIntroDuration?: number;
  voiceIntroUpdatedAt?: number;
  ageRange: string; // e.g. "20-25"
  bio: string;
  area: string; // Area/City only
  locationLat?: number | null;
  locationLng?: number | null;
  intents: IntentType[];
  familyPlans?: string[];
  lifestyle?: {
    drink?: string[];
    smoke?: string[];
    workout?: string[];
    pets?: string[];
  };
  personality?: {
    communicationStyle?: string[];
    loveLanguage?: string[];
  };
  photoUrl: string; // Live selfie
  isAnonymous: boolean;
  ratePerDay?: string;
  isOnline: boolean;
}

export type LocationPrecision = "city" | "neighborhood";

export interface UserSettings {
  discoverable: boolean;
  showOnlineStatus: boolean;
  allowMessageRequests: boolean;
  readReceipts: boolean;
  locationPrecision: LocationPrecision;
  dataSharing: boolean;
  loginAlerts: boolean;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  discoverable: true,
  showOnlineStatus: true,
  allowMessageRequests: true,
  readReceipts: true,
  locationPrecision: "city",
  dataSharing: false,
  loginAlerts: true,
};

export interface WeekendPlan {
  id: string;
  creatorId: string;
  creatorNickname: string;
  title: string;
  description: string;
  location: string;
  time: string;
  category: string;
  timestamp: number;
  rsvpCount?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  timestamp: number;
}

export type NotificationType = "message" | "system" | "like";

export interface AppNotification {
  id: string;
  toUserId: string;
  fromUserId?: string;
  fromNickname?: string;
  type: NotificationType;
  body: string;
  conversationId?: string;
  read: boolean;
  createdAt: number;
}

export interface LikeRecord {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromNickname?: string;
  toNickname?: string;
  createdAt: number;
}

export interface DislikeRecord {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromNickname?: string;
  toNickname?: string;
  createdAt: number;
}

export type LiveType = "solo" | "group";
export type LiveChatAccess = "everyone" | "followers" | "noone";
export type LiveJoinAccess = "everyone" | "followers" | "invite";
export type LivePrivacy = "public" | "friends" | "private";
export type LiveMessageType = "message" | "reaction" | "system";

export interface LiveRoom {
  id: string;
  hostId: string;
  hostNickname: string;
  hostPhotoUrl?: string;
  title: string;
  type: LiveType;
  allowGuests: boolean;
  chatAccess: LiveChatAccess;
  joinAccess: LiveJoinAccess;
  moderation: {
    filterBadWords: boolean;
    muteNewUsers: boolean;
  };
  privacy: LivePrivacy;
  tags: string[];
  viewerCount: number;
  likeCount: number;
  maxGuests: number;
  status: "live" | "ended";
  chatPaused?: boolean;
  isPaused?: boolean;
  moderatorIds?: string[];
  bannedUserIds?: string[];
  pinnedMessage?: {
    id: string;
    senderId: string;
    senderNickname: string;
    text: string;
    createdAt: number;
  } | null;
  createdAt: number;
  startedAt?: number | null;
  endedAt?: number | null;
}

export interface LiveMessage {
  id: string;
  senderId: string;
  senderNickname: string;
  type: LiveMessageType;
  text: string;
  createdAt: number;
}

export interface LiveGuest {
  id: string;
  userId: string;
  nickname: string;
  photoUrl?: string;
  joinedAt: number;
}

export interface LiveJoinRequest {
  id: string;
  requesterId: string;
  nickname: string;
  photoUrl?: string;
  status: "pending" | "approved" | "declined";
  createdAt: number;
}

export type LiveAchievementType =
  | "likes_milestone"
  | "likes_first"
  | "duration_milestone";

export interface LiveAchievement {
  id: string;
  roomId: string;
  hostId: string;
  hostNickname: string;
  type: LiveAchievementType;
  key: string;
  label: string;
  metric: "likes" | "duration";
  likeCount?: number;
  threshold?: number;
  durationMinutes?: number;
  liveTitle: string;
  createdAt: number;
}

export interface DailyDrop {
  userId: string;
  lastDropAt: number;
  profileIds: string[];
  actionedIds: string[];
  compatibilityIds?: string[];
  dropSize: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface GameAnswers {
  userId: string;
  hushQuiz?: {
    answers?: Record<string, "A" | "B">;
    updatedAt?: number;
  };
  dateNight?: {
    traits?: string[];
    updatedAt?: number;
  };
  createdAt?: number;
  updatedAt?: number;
}

export type PaymentStatus = "pending" | "approved" | "rejected";

export interface PaymentRequest {
  id: string;
  userId: string;
  email: string;
  nickname?: string;
  mpesaMessageProof: string;
  status: PaymentStatus;
  createdAt: number;
  decisionAt?: number | null;
  decisionBy?: string;
}

export type VideoCallVisibility = "public" | "premium" | "private";

export type VerificationStatus = "none" | "pending" | "verified";

export interface EscortSocialLink {
  id: string;
  platform: string;
  handle: string;
  isPublic: boolean;
}

export interface EscortListing {
  id: string;
  ownerId: string;
  ownerNickname: string;
  ownerPhotoUrl: string;
  ownerArea: string;
  displayName: string;
  age: string;
  gender: string;
  bio: string;
  languages: string[];
  offers: string[];
  offerNotes?: string;
  servicePricing: Record<string, string>;
  mainService: string;
  availability: string;
  phone: string;
  contactNote?: string;
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
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface EscortListingDraft {
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
}

export interface PlanTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  timeHint: string;
  locationHint: string;
  vibeTags: string[];
}

export interface MpesaParseResult {
  amount?: string;
  transactionId?: string;
  till?: string;
  date?: string;
  time?: string;
  sender?: string;
  confidence: number;
}

export const KENYAN_AREAS = [
  // Nairobi County
  "Nairobi - CBD",
  "Nairobi - Westlands",
  "Nairobi - Kilimani",
  "Nairobi - Kileleshwa",
  "Nairobi - Lavington",
  "Nairobi - South B",
  "Nairobi - South C",
  "Nairobi - Lang’ata",
  "Nairobi - Kasarani",
  "Nairobi - Embakasi",
  "Nairobi - Ruaka",

  // Mombasa
  "Mombasa - Nyali",
  "Mombasa - Kizingo",
  "Mombasa - Bamburi",
  "Mombasa - Likoni",
  "Mombasa - Changamwe",
  "Mombasa - Tudor",

  // Kwale
  "Kwale - Ukunda",
  "Kwale - Diani",
  "Kwale - Msambweni",
  "Kwale - Kinango",

  // Kilifi
  "Kilifi - Kilifi Town",
  "Kilifi - Malindi",
  "Kilifi - Watamu",
  "Kilifi - Mariakani",
  "Kilifi - Kaloleni",

  // Tana River
  "Tana River - Hola",
  "Tana River - Garsen",
  "Tana River - Madogo",

  // Lamu
  "Lamu - Lamu Island",
  "Lamu - Mpeketoni",
  "Lamu - Witu",

  // Taita Taveta
  "Taita Taveta - Voi",
  "Taita Taveta - Taveta",
  "Taita Taveta - Wundanyi",
  "Taita Taveta - Mwatate",

  // Garissa
  "Garissa - Garissa Town",
  "Garissa - Dadaab",
  "Garissa - Balambala",

  // Wajir
  "Wajir - Wajir Town",
  "Wajir - Buna",
  "Wajir - Habaswein",

  // Mandera
  "Mandera - Mandera Town",
  "Mandera - Rhamu",
  "Mandera - El Wak",

  // Marsabit
  "Marsabit - Marsabit Town",
  "Marsabit - Moyale",
  "Marsabit - Sololo",

  // Isiolo
  "Isiolo - Isiolo Town",
  "Isiolo - Merti",
  "Isiolo - Garbatulla",

  // Meru
  "Meru - Meru Town",
  "Meru - Nkubu",
  "Meru - Maua",
  "Meru - Timau",

  // Tharaka Nithi
  "Tharaka Nithi - Chuka",
  "Tharaka Nithi - Kathwana",

  // Embu
  "Embu - Embu Town",
  "Embu - Runyenjes",
  "Embu - Siakago",

  // Kitui
  "Kitui - Kitui Town",
  "Kitui - Mwingi",
  "Kitui - Mutomo",

  // Machakos
  "Machakos - Machakos Town",
  "Machakos - Syokimau",
  "Machakos - Athi River",
  "Machakos - Mlolongo",

  // Makueni
  "Makueni - Wote",
  "Makueni - Makindu",
  "Makueni - Emali",

  // Nyandarua
  "Nyandarua - Ol Kalou",
  "Nyandarua - Engineer",
  "Nyandarua - Njabini",

  // Nyeri
  "Nyeri - Nyeri Town",
  "Nyeri - Othaya",
  "Nyeri - Karatina",

  // Kirinyaga
  "Kirinyaga - Kerugoya",
  "Kirinyaga - Kutus",
  "Kirinyaga - Kagio",

  // Murang’a
  "Murang’a - Murang’a Town",
  "Murang’a - Kenol",
  "Murang’a - Kangema",

  // Kiambu
  "Kiambu - Kiambu Town",
  "Kiambu - Ruiru",
  "Kiambu - Thika",
  "Kiambu - Kikuyu",
  "Kiambu - Limuru",

  // Turkana
  "Turkana - Lodwar",
  "Turkana - Kakuma",
  "Turkana - Lokichoggio",

  // West Pokot
  "West Pokot - Kapenguria",
  "West Pokot - Makutano",

  // Samburu
  "Samburu - Maralal",
  "Samburu - Baragoi",

  // Trans Nzoia
  "Trans Nzoia - Kitale",
  "Trans Nzoia - Endebess",

  // Uasin Gishu
  "Uasin Gishu - Eldoret",
  "Uasin Gishu - Turbo",
  "Uasin Gishu - Moiben",

  // Elgeyo Marakwet
  "Elgeyo Marakwet - Iten",
  "Elgeyo Marakwet - Kapsowar",

  // Nandi
  "Nandi - Kapsabet",
  "Nandi - Nandi Hills",

  // Baringo
  "Baringo - Kabarnet",
  "Baringo - Eldama Ravine",

  // Laikipia
  "Laikipia - Nanyuki",
  "Laikipia - Nyahururu",

  // Nakuru
  "Nakuru - Nakuru Town",
  "Nakuru - Section 58",
  "Nakuru - Naivasha",
  "Nakuru - Gilgil",

  // Narok
  "Narok - Narok Town",
  "Narok - Suswa",

  // Kajiado
  "Kajiado - Kajiado Town",
  "Kajiado - Ongata Rongai",
  "Kajiado - Kitengela",
  "Kajiado - Ngong",

  // Kericho
  "Kericho - Kericho Town",
  "Kericho - Litein",

  // Bomet
  "Bomet - Bomet Town",
  "Bomet - Sotik",

  // Kakamega
  "Kakamega - Kakamega Town",
  "Kakamega - Mumias",

  // Vihiga
  "Vihiga - Mbale",
  "Vihiga - Luanda",

  // Bungoma
  "Bungoma - Bungoma Town",
  "Bungoma - Webuye",
  "Bungoma - Kimilili",

  // Busia
  "Busia - Busia Town",
  "Busia - Nambale",

  // Siaya
  "Siaya - Siaya Town",
  "Siaya - Bondo",
  "Siaya - Ugunja",

  // Kisumu
  "Kisumu - Kisumu City",
  "Kisumu - Milimani",
  "Kisumu - Kondele",
  "Kisumu - Ahero",

  // Homa Bay
  "Homa Bay - Homa Bay Town",
  "Homa Bay - Mbita",

  // Migori
  "Migori - Migori Town",
  "Migori - Rongo",
  "Migori - Awendo",

  // Kisii
  "Kisii - Kisii Town",
  "Kisii - Suneka",

  // Nyamira
  "Nyamira - Nyamira Town",
  "Nyamira - Keroka",
];

export const AGE_RANGES = ["18-22", "23-27", "28-35", "36-45", "46+"];
