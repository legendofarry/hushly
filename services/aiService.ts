import {
  EscortListingDraft,
  IntentType,
  LikeRecord,
  UserProfile,
} from "../types";
import type { AiSignals } from "./aiSignals";

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "you",
  "your",
  "are",
  "was",
  "were",
  "have",
  "has",
  "had",
  "she",
  "him",
  "her",
  "his",
  "our",
  "their",
  "them",
  "a",
  "an",
  "of",
  "in",
  "on",
  "to",
  "is",
  "it",
  "be",
  "we",
  "me",
  "my",
  "at",
  "from",
  "by",
  "or",
]);

const KEYWORD_INTENTS: Array<{ intent: IntentType; keywords: string[] }> = [
  {
    intent: IntentType.RELATIONSHIP,
    keywords: ["relationship", "serious", "long term", "commitment"],
  },
  {
    intent: IntentType.FRIENDS,
    keywords: ["friends", "friendship", "hangout", "hang out"],
  },
  {
    intent: IntentType.CHILL,
    keywords: ["chill", "low key", "relaxed", "vibe"],
  },
  {
    intent: IntentType.CASUAL,
    keywords: ["casual", "no pressure", "light", "fun"],
  },
  {
    intent: IntentType.PLANS,
    keywords: ["plans", "events", "weekend", "adventure"],
  },
  {
    intent: IntentType.MUTUAL,
    keywords: ["sugar", "mutual", "support", "premium"],
  },
  {
    intent: IntentType.HIRING,
    keywords: ["escort", "companionship", "hire", "private"],
  },
];

const TONE_TEMPLATES: Record<
  string,
  { opening: string; vibe: string; closing: string }
> = {
  playful: {
    opening: "Playful energy, good vibes only.",
    vibe: "I love spontaneous plans, smooth conversations, and a little chaos.",
    closing: "If the vibe clicks, let's make it a story.",
  },
  mysterious: {
    opening: "Quiet confidence, selective energy.",
    vibe: "I move low-key but intentional, and I value good chemistry.",
    closing: "If you get the vibe, say less.",
  },
  romantic: {
    opening: "Soft heart, clear intentions.",
    vibe: "I appreciate thoughtful moments, warm energy, and honest connection.",
    closing: "If you're gentle with the vibe, I'm all in.",
  },
  direct: {
    opening: "Straightforward and no games.",
    vibe: "I like clarity, consistency, and easy communication.",
    closing: "If that matches you, let's talk.",
  },
  confident: {
    opening: "High standards, calm confidence.",
    vibe: "I know what I want and I keep the energy clean.",
    closing: "Bring good energy and we'll be solid.",
  },
};

const normalize = (value: string) => value.toLowerCase().trim();

const tokenize = (value: string) =>
  normalize(value)
    .split(/[^a-z0-9]+/g)
    .filter((token) => token && !STOPWORDS.has(token));

const expandTokens = (tokens: string[]) => {
  const synonyms: Record<string, string[]> = {
    chill: ["relaxed", "lowkey", "low"],
    weekend: ["saturday", "sunday"],
    vibe: ["energy", "mood"],
    hangout: ["link", "meet"],
    dinner: ["food", "brunch"],
  };
  const expanded = [...tokens];
  tokens.forEach((token) => {
    const extra = synonyms[token];
    if (extra) expanded.push(...extra);
  });
  return expanded;
};

const vectorize = (tokens: string[]) => {
  const counts: Record<string, number> = {};
  tokens.forEach((token) => {
    counts[token] = (counts[token] || 0) + 1;
  });
  return counts;
};

const cosineSimilarity = (
  a: Record<string, number>,
  b: Record<string, number>,
) => {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  Object.keys(a).forEach((key) => {
    const val = a[key];
    normA += val * val;
    if (b[key]) dot += val * b[key];
  });
  Object.values(b).forEach((val) => {
    normB += val * val;
  });
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const stableHash = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 1000) / 1000;
};

export const suggestIntents = (payload: {
  bio: string;
  intents: IntentType[];
  ageRange: string;
  area: string;
}) => {
  const collected = new Set<IntentType>(payload.intents ?? []);
  const bio = normalize(payload.bio);
  KEYWORD_INTENTS.forEach(({ intent, keywords }) => {
    if (keywords.some((keyword) => bio.includes(keyword))) {
      collected.add(intent);
    }
  });
  if (collected.size === 0) {
    collected.add(IntentType.CHILL);
    collected.add(IntentType.FRIENDS);
  }
  return Array.from(collected).slice(0, 4);
};

export const generateBio = (payload: {
  nickname: string;
  intents: IntentType[];
  area: string;
  ageRange: string;
  tone: string;
}) => {
  const toneKey = normalize(payload.tone);
  const tone = TONE_TEMPLATES[toneKey] ?? TONE_TEMPLATES.playful;
  const intents = payload.intents.length
    ? payload.intents.join(", ")
    : "good vibes";
  const area = payload.area ? `based in ${payload.area}` : "based in the city";
  return `${tone.opening} ${payload.nickname} here, ${area}. I'm into ${intents}. ${tone.vibe} ${tone.closing}`;
};

export const rewriteBio = (payload: { bio: string; tone: string }) => {
  const base = payload.bio.trim();
  if (!base) {
    return generateBio({
      nickname: "I",
      intents: [],
      area: "",
      ageRange: "",
      tone: payload.tone,
    });
  }
  const toneKey = normalize(payload.tone);
  const tone = TONE_TEMPLATES[toneKey] ?? TONE_TEMPLATES.confident;
  return `${tone.opening} ${base} ${tone.closing}`;
};

export const semanticSearchProfiles = (query: string, profiles: UserProfile[]) => {
  const tokens = expandTokens(tokenize(query));
  const queryVector = vectorize(tokens);
  return profiles
    .map((profile) => {
      const profileText = `${profile.nickname} ${profile.bio} ${profile.area} ${
        profile.intents?.join(" ") ?? ""
      }`;
      const profileVector = vectorize(expandTokens(tokenize(profileText)));
      const score = cosineSimilarity(queryVector, profileVector);
      return { profile, score };
    })
    .filter((item) => item.score > 0.05)
    .sort((a, b) => b.score - a.score);
};

export const rankProfiles = (payload: {
  user: UserProfile;
  profiles: UserProfile[];
  signals: AiSignals;
  semanticQuery?: string;
}) => {
  const { user, profiles, signals, semanticQuery } = payload;
  const queryScores = semanticQuery
    ? new Map(
        semanticSearchProfiles(semanticQuery, profiles).map((item) => [
          item.profile.id,
          item.score,
        ]),
      )
    : new Map<string, number>();

  return profiles
    .map((profile) => {
      const sharedIntents =
        profile.intents?.filter((intent) => user.intents.includes(intent)) ?? [];
      const sharedScore = sharedIntents.length * 3;
      const areaScore = profile.area === user.area ? 2 : 0;
      const onlineScore = profile.isOnline ? 1 : 0;
      const likedIntentScore = (profile.intents ?? []).reduce(
        (sum, intent) => sum + (signals.likedIntents[intent] || 0) * 0.3,
        0,
      );
      const skippedIntentPenalty = (profile.intents ?? []).reduce(
        (sum, intent) => sum + (signals.skippedIntents[intent] || 0) * 0.25,
        0,
      );
      const likedAreaScore = signals.likedAreas[profile.area] || 0;
      const diversityPenalty =
        (signals.recentAreas.includes(profile.area) ? 0.6 : 0) +
        (profile.intents ?? []).filter((intent) =>
          signals.recentIntents.includes(intent),
        ).length *
          0.15;
      const semanticBoost = queryScores.get(profile.id) || 0;
      const jitter = stableHash(profile.id) * 0.3;
      const score =
        sharedScore +
        areaScore +
        onlineScore +
        likedIntentScore +
        likedAreaScore * 0.2 -
        skippedIntentPenalty -
        diversityPenalty +
        semanticBoost * 4 +
        jitter;
      return { profile, score, reasons: getMatchReasons(user, profile, signals) };
    })
    .sort((a, b) => b.score - a.score);
};

export const getMatchReasons = (
  user: UserProfile,
  profile: UserProfile,
  signals: AiSignals,
) => {
  if (profile.area && profile.area === user.area) {
    return [`Both in ${profile.area}`];
  }
  return [];
};

export type KenyanMatchSuggestion = {
  title: string;
  detail: string;
  tag: string;
};

export const getKenyanMatchSuggestions = (payload: {
  user: UserProfile;
  match: UserProfile;
  now?: Date;
}): KenyanMatchSuggestion[] => {
  const { user, match } = payload;
  const now = payload.now ?? new Date();
  const hour = now.getHours();
  const rushHour = hour >= 16 && hour <= 19;
  const area =
    match.area && match.area === user.area
      ? match.area
      : match.area || user.area || "town";

  return [
    {
      title: "Matatu-smart meetup",
      tag: "Matatu-aware",
      detail: rushHour
        ? `Pick a spot within a short walk of ${area} stage or mall and avoid the 4–7pm rush.`
        : `Meet near ${area} stage or mall for easy matatu access and quick exits.`,
    },
    {
      title: "Weather-ready plan",
      tag: "Weather-aware",
      detail: `Choose a covered cafe or food court in ${area}, with a quick indoor fallback if rain hits.`,
    },
  ];
};

export const getIceBreakers = (payload: { otherProfile?: UserProfile }) => {
  const other = payload.otherProfile;
  if (!other) return [];
  const intents = other.intents ?? [];
  const intentLine = intents[0] ? `I saw you're into ${intents[0]}.` : "";
  return [
    `Hey ${other.nickname}! ${intentLine} What's your perfect weekend like?`,
    "Quick vibe check: coffee, late-night drives, or rooftop sunsets?",
    "You seem like good energy. Want to trade playlists?",
  ];
};

export const getSmartReplies = (payload: {
  lastMessage: string;
  otherProfile?: UserProfile;
  tone: string;
}) => {
  const message = payload.lastMessage.toLowerCase();
  const name = payload.otherProfile?.nickname ?? "there";
  const toneKey = normalize(payload.tone);
  if (message.includes("?")) {
    return [
      `Good question, ${name}. I'm down to share more.`,
      "I'm flexible. What were you thinking?",
      "Let's do it. What time works for you?",
    ];
  }
  if (message.includes("hey") || message.includes("hi")) {
    return [
      `Hey ${name}! How's your day going?`,
      "Hi! What vibe are you on today?",
      `Hey ${name} - got any weekend plans?`,
    ];
  }
  if (toneKey === "direct") {
    return [
      "I'm into that. When are you free?",
      "Sounds good. Want to pick a spot?",
      "Let's lock a time and place.",
    ];
  }
  return [
    "That sounds nice. Tell me more.",
    "I like that energy.",
    "You're smooth. Keep going.",
  ];
};

export const summarizeConversation = (
  messages: Array<{ text: string; senderId: string }>,
) => {
  if (!messages.length) return "";
  const lastMessages = messages.slice(-6).map((m) => m.text).join(" ");
  const tokens = tokenize(lastMessages);
  const frequency: Record<string, number> = {};
  tokens.forEach((token) => {
    frequency[token] = (frequency[token] || 0) + 1;
  });
  const topTopics = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([token]) => token);
  const last = messages[messages.length - 1]?.text ?? "";
  if (!topTopics.length) return `Last message: "${last}"`;
  return `Topics: ${topTopics.join(", ")}. Last message: "${last}".`;
};

export const getAnalyticsInsights = (payload: {
  user: UserProfile;
  receivedLikes: LikeRecord[];
  sentLikes: LikeRecord[];
}) => {
  const { user, receivedLikes, sentLikes } = payload;
  const insights: string[] = [];
  if (user.bio.trim().length < 40) {
    insights.push("Your bio is short. A fuller vibe story usually boosts replies.");
  }
  if (receivedLikes.length === 0) {
    insights.push("New profiles get more love with a crisp selfie and a clear intent.");
  } else if (receivedLikes.length > sentLikes.length * 2) {
    insights.push(
      "You're getting attention. Try initiating more chats to convert likes.",
    );
  }
  insights.push(
    "AI tip: Close-up selfies with good lighting often get better engagement.",
  );
  return insights;
};

export const detectSafetySignals = (payload: {
  nickname: string;
  bio: string;
  email: string;
}) => {
  const issues: string[] = [];
  const tips: string[] = [];
  const text = `${payload.nickname} ${payload.bio}`.toLowerCase();
  if (text.match(/\b(whatsapp|telegram|snap|ig|instagram)\b/)) {
    issues.push("Bio mentions off-platform contact.");
    tips.push("Consider keeping first contact in-app for safety.");
  }
  if (payload.bio.trim().length < 15) {
    issues.push("Bio is very short.");
    tips.push("Add a few lines to look more authentic.");
  }
  if (payload.nickname.match(/\d{4,}/)) {
    issues.push("Nickname contains long numeric strings.");
    tips.push("Shorter, human names feel more trustworthy.");
  }
  const level = issues.length >= 2 ? "medium" : "low";
  return { level, issues, tips };
};

export const detectEscortListingRisk = (payload: {
  bio: string;
  offers: string[];
  contactNote: string;
}) => {
  const text = `${payload.bio} ${payload.offers.join(" ")} ${
    payload.contactNote
  }`.toLowerCase();
  const highRisk = [
    "underage",
    "teen",
    "minor",
    "forced",
    "rape",
    "no condom",
    "raw",
    "drug",
    "cocaine",
  ];
  const mediumRisk = ["cashapp", "paypal", "crypto", "deposit only", "hidden"];
  const issues: string[] = [];
  if (highRisk.some((word) => text.includes(word))) {
    issues.push("High-risk terms detected. Remove unsafe language.");
  }
  if (mediumRisk.some((word) => text.includes(word))) {
    issues.push(
      "Payment language detected. Keep transactions safe and compliant.",
    );
  }
  const level =
    issues.length > 0 && highRisk.some((word) => text.includes(word))
      ? "high"
      : issues.length > 0
        ? "medium"
        : "low";
  return { level, issues };
};

export const buildEscortListingDraftAi = (payload: {
  profile: UserProfile;
  prompt: string;
}): Partial<EscortListingDraft> => {
  const prompt = normalize(payload.prompt);
  const wantsTravel = prompt.includes("travel") || prompt.includes("tour");
  const wantsVideo = prompt.includes("video");
  const baseOffers = [
    "Escort (Companionship)",
    "BFE / Boyfriend Experience",
    "Dirty talk",
    "At discretion (Services based on escort's comfort)",
  ];

  return {
    bio: payload.profile.bio || "Private, discreet, and easy to vibe with.",
    languages: ["English", "Swahili"],
    offers: baseOffers,
    offerNotes: "Boundaries respected. Discretion guaranteed.",
    servicePricing: {
      "Escort (Companionship)": "From KES 8,000",
      "BFE / Boyfriend Experience": "From KES 12,000",
      "Dirty talk": "From KES 6,000",
      "At discretion (Services based on escort's comfort)": "Ask",
    },
    mainService: "Escort (Companionship)",
    availability: "Mon - Sun, 7pm to late",
    contactNote: "Intro message first. Respectful vibes only.",
    primaryLocation: payload.profile.area || "Nairobi",
    travelOk: wantsTravel,
    videoCallEnabled: wantsVideo,
    videoCallVisibility: wantsVideo ? "private" : "private",
    verificationStatus: "pending",
  };
};
