
export enum IntentType {
  FRIENDS = 'Friends',
  CHILL = 'Chill Buddies',
  CASUAL = 'Casual Meetups',
  RELATIONSHIP = 'Relationships',
  MUTUAL = 'Mutual / Sugar',
  HIRING = 'Companionship (Hire)',
  PLANS = 'Plans & Hangouts'
}

export interface UserProfile {
  id: string;
  realName: string; // Private
  nickname: string; // Public
  email: string;
  emailVerified: boolean;
  ageRange: string; // e.g. "20-25"
  bio: string;
  area: string; // Area/City only
  intents: IntentType[];
  photoUrl: string; // Live selfie
  isAnonymous: boolean;
  ratePerDay?: string;
  isOnline: boolean;
}

export interface WeekendPlan {
  id: string;
  creatorId: string;
  creatorNickname: string;
  title: string;
  description: string;
  category: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

export const KENYAN_AREAS = [
  "Nairobi - Kilimani", "Nairobi - Westlands", "Nairobi - CBD", "Mombasa - Nyali", "Kisumu - Milimani", "Nakuru - Section 58", "Kiambu - Ruiru"
];

export const AGE_RANGES = ["18-22", "23-27", "28-35", "36-45", "46+"];
