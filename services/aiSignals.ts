import { IntentType, UserProfile } from "../types";

export type AiSignals = {
  likedIntents: Record<string, number>;
  skippedIntents: Record<string, number>;
  likedAreas: Record<string, number>;
  recentIntents: string[];
  recentAreas: string[];
  recentProfiles: string[];
};

const STORAGE_KEY = "hushly_ai_signals_v1";
const MAX_RECENT = 12;

const defaultSignals = (): AiSignals => ({
  likedIntents: {},
  skippedIntents: {},
  likedAreas: {},
  recentIntents: [],
  recentAreas: [],
  recentProfiles: [],
});

const canUseStorage = () =>
  typeof window !== "undefined" && typeof localStorage !== "undefined";

const clampRecent = (items: string[]) => items.slice(-MAX_RECENT);

const updateCount = (
  map: Record<string, number>,
  key?: string,
  delta = 1,
) => {
  if (!key) return;
  map[key] = (map[key] || 0) + delta;
};

const updateIntents = (signals: AiSignals, intents?: IntentType[]) => {
  if (!intents?.length) return;
  intents.forEach((intent) => {
    updateCount(signals.likedIntents, intent, 1);
    signals.recentIntents.push(intent);
  });
  signals.recentIntents = clampRecent(signals.recentIntents);
};

const updateAreas = (signals: AiSignals, area?: string) => {
  if (!area) return;
  updateCount(signals.likedAreas, area, 1);
  signals.recentAreas.push(area);
  signals.recentAreas = clampRecent(signals.recentAreas);
};

const updateRecentProfile = (signals: AiSignals, profileId?: string) => {
  if (!profileId) return;
  signals.recentProfiles.push(profileId);
  signals.recentProfiles = clampRecent(signals.recentProfiles);
};

export const loadAiSignals = (): AiSignals => {
  if (!canUseStorage()) return defaultSignals();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSignals();
    const parsed = JSON.parse(raw) as Partial<AiSignals>;
    return {
      ...defaultSignals(),
      ...parsed,
      likedIntents: parsed.likedIntents ?? {},
      skippedIntents: parsed.skippedIntents ?? {},
      likedAreas: parsed.likedAreas ?? {},
      recentIntents: parsed.recentIntents ?? [],
      recentAreas: parsed.recentAreas ?? [],
      recentProfiles: parsed.recentProfiles ?? [],
    };
  } catch (error) {
    console.error(error);
    return defaultSignals();
  }
};

const saveAiSignals = (signals: AiSignals) => {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(signals));
};

export const recordLikeSignal = (profile: UserProfile) => {
  const signals = loadAiSignals();
  updateIntents(signals, profile.intents);
  updateAreas(signals, profile.area);
  updateRecentProfile(signals, profile.id);
  saveAiSignals(signals);
  return signals;
};

export const recordSkipSignal = (profile: UserProfile) => {
  const signals = loadAiSignals();
  profile.intents?.forEach((intent) => {
    updateCount(signals.skippedIntents, intent, 1);
    signals.recentIntents.push(intent);
  });
  if (profile.area) {
    signals.recentAreas.push(profile.area);
  }
  updateRecentProfile(signals, profile.id);
  signals.recentIntents = clampRecent(signals.recentIntents);
  signals.recentAreas = clampRecent(signals.recentAreas);
  saveAiSignals(signals);
  return signals;
};

export const recordDwellSignal = (profile: UserProfile, dwellMs: number) => {
  if (dwellMs < 4000) return loadAiSignals();
  const signals = loadAiSignals();
  profile.intents?.forEach((intent) => {
    updateCount(signals.likedIntents, intent, 0.5);
    signals.recentIntents.push(intent);
  });
  if (profile.area) {
    updateCount(signals.likedAreas, profile.area, 0.3);
    signals.recentAreas.push(profile.area);
  }
  updateRecentProfile(signals, profile.id);
  signals.recentIntents = clampRecent(signals.recentIntents);
  signals.recentAreas = clampRecent(signals.recentAreas);
  saveAiSignals(signals);
  return signals;
};

export const recordChatSignal = (profile: UserProfile) => {
  const signals = loadAiSignals();
  updateIntents(signals, profile.intents);
  updateAreas(signals, profile.area);
  updateRecentProfile(signals, profile.id);
  saveAiSignals(signals);
  return signals;
};

export const resetAiSignals = () => {
  if (!canUseStorage()) return;
  localStorage.removeItem(STORAGE_KEY);
};
