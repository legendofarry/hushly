
import type { GenderPreference, IntentType } from "../types";

export type AppView = 'splash' | 'landing' | 'login' | 'registration' | 'reset-password' | 'dating' | 'escorts' | 'live' | 'hub' | 'profile' | 'messages' | 'notifications' | 'view-profile' | 'payment';

export interface Filters {
  gender: GenderPreference;
  ageRange: [number, number];
  location: string[];
  hasBio: boolean;
  interests: string[];
  lookingFor: IntentType | "";
  familyPlans: string;
  communicationStyle: string;
  loveStyle: string;
  pets: string;
  drinking: string;
  smoking: string;
  workout: string;
  expandAge: boolean;
  mode: 'For You' | 'Double Date';
}

export interface Notification {
  id: string;
  type: 'message' | 'like' | 'system';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  avatar?: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  nickname: string;
  gender: string;
  interests: string[];
  intents: string[];
  age: number;
  location: string;
  bio: string;
  isPaid: boolean;
  dailySwipesRemaining: number;
  lastDropAt: number;
  avatar: AvatarData;
  achievements: Achievement[];
  photos: string[];
  voiceIntro?: string;
  followingIds?: string[];
  followerCount?: number;
  lifestyle?: {
    drink?: string;
    smoke?: string;
    workout?: string;
    pets?: string[];
  };
  personality?: {
    communicationStyle?: string;
    loveLanguage?: string;
    education?: string;
    zodiac?: string;
  };
  prompts?: { question: string; answer: string }[];
}

export interface AvatarData {
  base: string;
  baseColor: string;
  outfit: string;
  outfitColor: string;
  accessory: string;
  accessoryColor: string;
  hair: string;
  hairColor: string;
}

export interface Achievement {
  id: string;
  title: string;
  icon: string;
  unlocked: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Profile {
  id: string;
  name: string;
  age: number;
  gender: string;
  location: string;
  photos: string[];
  bio: string;
  distance: string;
  services?: string[];
  phoneNumber?: string;
  isEscort: boolean;
  followerCount?: number;
}

export interface Game {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  participant: Profile;
  lastMessage?: string;
  unreadCount: number;
  timestamp: number;
}

export interface RSVP {
  userId: string;
  name: string;
  contact: string;
  timestamp: number;
}

export interface WeekendPlan {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  date: string;
  location: string;
  image: string;
  rsvps: RSVP[];
}
