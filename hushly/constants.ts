import { Achievement, Game, Profile } from "./types";

export const DAILY_SWIPE_LIMIT = 20;

export const KENYA_LOCATIONS = [
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Eldoret",
  "Thika",
  "Malindi",
  "Kitale",
];

export const LOOKING_FOR_OPTIONS = [
  "Long-term partner",
  "Long-term, open to short",
  "Short-term, open to long",
  "Short-term fun",
  "New friends",
  "Still figuring it out",
];

export const LIFESTYLE_OPTIONS = {
  drink: [
    "Not for me",
    "Sober",
    "Sober curious",
    "On special occasions",
    "Socially on weekends",
    "Most nights",
  ],
  smoke: [
    "Social smoker",
    "Smoker when drinking",
    "Non-smoker",
    "Smoker",
    "Trying to quit",
  ],
  workout: ["Everyday", "Often", "Sometimes", "Never"],
  pets: [
    "Dog",
    "Cat",
    "Reptile",
    "Amphibian",
    "Bird",
    "Fish",
    "Don't have but love",
    "Other",
    "Turtle",
    "Hamster",
    "Rabbit",
    "Pet-free",
    "All the pets",
    "Want a pet",
    "Allergic to pets",
  ],
};

export const PERSONALITY_OPTIONS = {
  communication: [
    "Big time texter",
    "Phone caller",
    "Video chatter",
    "Bad texter",
    "Better in person",
  ],
  loveLanguage: [
    "Thoughtful gestures",
    "Presents",
    "Touch",
    "Compliments",
    "Time together",
  ],
  education: [
    "Bachelors",
    "In College",
    "High School",
    "PhD",
    "In Grad School",
    "Masters",
    "Trade School",
  ],
  zodiac: [
    "Capricorn",
    "Aquarius",
    "Pisces",
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
  ],
};

export const FAMILY_PLANS_OPTIONS = [
  "Want children",
  "Don't want children",
  "Have children",
  "Open to children",
  "Not sure yet",
];

export const INTEREST_CATEGORIES = [
  {
    name: "Creativity",
    icon: "🎨",
    items: [
      "Freelancing",
      "Photography",
      "Choir",
      "Cosplay",
      "Content Creation",
      "Vintage fashion",
      "Investing",
    ],
  },
  {
    name: "Fan favorites",
    icon: "🌟",
    items: [
      "Comic-con",
      "Harry Potter",
      "90s Kid",
      "NBA",
      "MLB",
      "Dungeons & Dragons",
      "Manga",
      "Marvel",
    ],
  },
  {
    name: "Food and drink",
    icon: "🍽️",
    items: [
      "Foodie",
      "Food tours",
      "Mocktails",
      "Sweet treats",
      "Brunch",
      "Açaí",
      "Street Food",
      "Plant-based",
    ],
  },
  {
    name: "Gaming",
    icon: "🕹️",
    items: [
      "PlayStation",
      "E-Sports",
      "Fortnite",
      "Xbox",
      "League of Legends",
      "Nintendo",
      "Among Us",
    ],
  },
];

export const MOCK_PROFILES: Profile[] = [
  {
    id: "p1",
    name: "Njeri",
    age: 24,
    gender: "Female",
    location: "Nairobi",
    photos: ["https://picsum.photos/400/600?random=1"],
    bio: "Art lover and coffee enthusiast. Let's explore the city!",
    distance: "2km away",
    isEscort: false,
    followerCount: 1240,
  },
  {
    id: "p2",
    name: "Mwende",
    age: 27,
    gender: "Female",
    location: "Mombasa",
    photos: ["https://picsum.photos/400/600?random=2"],
    bio: "Beach girl. Passionate about marine life.",
    distance: "5km away",
    isEscort: false,
    followerCount: 890,
  },
  {
    id: "p3",
    name: "Atieno",
    age: 22,
    gender: "Female",
    location: "Kisumu",
    photos: ["https://picsum.photos/400/600?random=3"],
    bio: "Medical student, looking for someone to talk to.",
    distance: "10km away",
    isEscort: false,
    followerCount: 2100,
  },
  {
    id: "p4",
    name: "Otieno",
    age: 29,
    gender: "Male",
    location: "Nairobi",
    photos: ["https://picsum.photos/400/600?random=31"],
    bio: "Tech entrepreneur and outdoor explorer.",
    distance: "4km away",
    isEscort: false,
    followerCount: 1500,
  },
  {
    id: "p5",
    name: "Kev",
    age: 25,
    gender: "Male",
    location: "Nakuru",
    photos: ["https://picsum.photos/400/600?random=32"],
    bio: "Music is life. Always looking for new beats.",
    distance: "8km away",
    isEscort: false,
    followerCount: 600,
  },
];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "a1",
    title: "First Swipe",
    icon: "🔥",
    unlocked: false,
    rarity: "common",
  },
  {
    id: "a2",
    title: "Perfect Match",
    icon: "❤️",
    unlocked: false,
    rarity: "rare",
  },
  {
    id: "a3",
    title: "King of Hearts",
    icon: "👑",
    unlocked: false,
    rarity: "epic",
  },
  {
    id: "a4",
    title: "Stream Star",
    icon: "🎬",
    unlocked: false,
    rarity: "rare",
  },
  {
    id: "a5",
    title: "High Roller",
    icon: "💎",
    unlocked: false,
    rarity: "legendary",
  },
];

export const GAMES: Game[] = [
  {
    id: "hush-quiz",
    name: "Hush Quiz",
    icon: "fa-gamepad",
    color: "bg-indigo-500",
    description: "Play solo and discover your dating vibe.",
  },
  {
    id: "date-night",
    name: "Date Night Story",
    icon: "fa-heart",
    color: "bg-rose-500",
    description: "Choose your path through a romantic story.",
  },
];

export const AVATAR_OPTIONS = {
  bases: ["Male Body", "Female Body", "Robo Frame", "Ethereal"],
  outfits: [
    "None",
    "Maasai Shuka",
    "Classic Suit",
    "Cyber Tunic",
    "Urban Wear",
  ],
  hairs: ["None", "Afro", "Braids", "Pompadour", "Fade"],
  accessories: ["None", "Gold Chain", "VR Goggles", "Floral Lei", "Crown"],
  colors: [
    { name: "Ebony", hex: "#2D1F1D" },
    { name: "Bronze", hex: "#8B5A2B" },
    { name: "Gold", hex: "#FFD700" },
    { name: "Rose", hex: "#F43F5E" },
    { name: "Sky", hex: "#38BDF8" },
    { name: "Neon", hex: "#ADFF2F" },
    { name: "Slate", hex: "#475569" },
    { name: "Royal Purple", hex: "#7C3AED" },
  ],
};
