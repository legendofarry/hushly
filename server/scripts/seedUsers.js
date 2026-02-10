const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");

const resolveServiceAccountPath = () => {
  const envPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!envPath) return null;
  return path.isAbsolute(envPath)
    ? envPath
    : path.resolve(process.cwd(), envPath);
};

const serviceAccountPath = resolveServiceAccountPath();
if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
  console.error(
    "Missing service account. Set FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS.",
  );
  process.exit(1);
}

// eslint-disable-next-line import/no-dynamic-require, global-require
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const { FieldValue } = admin.firestore;

const USERS_COLLECTION = "user";
const PUBLIC_NICKNAMES_COLLECTION = "public_nicknames";
const SETTINGS_COLLECTION = "user_settings";

const DEFAULT_USER_SETTINGS = {
  discoverable: true,
  showOnlineStatus: true,
  allowMessageRequests: true,
  readReceipts: true,
  locationPrecision: "city",
  dataSharing: false,
  loginAlerts: true,
};

const seedUsers = [
  {
    nickname: "Amina",
    realName: "Amina Ali",
    email: "seed.amina@hushly.app",
    password: "HushlySeed#2026A",
    gender: "female",
    interestedIn: ["male"],
    ageRange: "22-28",
    area: "Nairobi",
    intents: ["Relationships"],
    bio: "Soft heart, sharp mind. Looking for calm, real energy.",
    photoUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Kofi",
    realName: "Kofi Mensah",
    email: "seed.kofi@hushly.app",
    password: "HushlySeed#2026B",
    gender: "male",
    interestedIn: ["female"],
    ageRange: "25-31",
    area: "Mombasa",
    intents: ["Casual Meetups"],
    bio: "Beach runs, late night jokes, low drama. Let’s vibe.",
    photoUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Zuri",
    realName: "Zuri Njeri",
    email: "seed.zuri@hushly.app",
    password: "HushlySeed#2026C",
    gender: "female",
    interestedIn: ["male", "female"],
    ageRange: "21-26",
    area: "Kisumu",
    intents: ["Friends"],
    bio: "Here for honest friends and soft laughs. Coffee first.",
    photoUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Imani",
    realName: "Imani Okello",
    email: "seed.imani@hushly.app",
    password: "HushlySeed#2026D",
    gender: "female",
    interestedIn: ["male"],
    ageRange: "24-30",
    area: "Nakuru",
    intents: ["Plans & Hangouts"],
    bio: "Road trips, sunsets, playlists. Let’s make a plan.",
    photoUrl:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Jabari",
    realName: "Jabari Otieno",
    email: "seed.jabari@hushly.app",
    password: "HushlySeed#2026E",
    gender: "male",
    interestedIn: ["female"],
    ageRange: "27-33",
    area: "Eldoret",
    intents: ["Relationships"],
    bio: "Builder by day, chef by night. Looking for my person.",
    photoUrl:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Amara",
    realName: "Amara Wanjiku",
    email: "seed.amara@hushly.app",
    password: "HushlySeed#2026F",
    gender: "female",
    interestedIn: ["male"],
    ageRange: "23-29",
    area: "Thika",
    intents: ["Chill Buddies"],
    bio: "Quiet dates, warm talks, chill energy. That’s my lane.",
    photoUrl:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Nuru",
    realName: "Nuru Abdalla",
    email: "seed.nuru@hushly.app",
    password: "HushlySeed#2026G",
    gender: "female",
    interestedIn: ["female", "male"],
    ageRange: "20-25",
    area: "Malindi",
    intents: ["Friends"],
    bio: "Sun-kissed, bookish, and a little shy. Say hi.",
    photoUrl:
      "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Tafari",
    realName: "Tafari Kamau",
    email: "seed.tafari@hushly.app",
    password: "HushlySeed#2026H",
    gender: "male",
    interestedIn: ["female"],
    ageRange: "26-32",
    area: "Kitale",
    intents: ["Plans & Hangouts"],
    bio: "Live music, long walks, late brunch. Let’s link.",
    photoUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Sade",
    realName: "Sade Achieng",
    email: "seed.sade@hushly.app",
    password: "HushlySeed#2026I",
    gender: "female",
    interestedIn: ["male"],
    ageRange: "24-29",
    area: "Nairobi",
    intents: ["Casual Meetups"],
    bio: "A little playful, a little serious. Let’s see.",
    photoUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Liya",
    realName: "Liya Hassan",
    email: "seed.liya@hushly.app",
    password: "HushlySeed#2026J",
    gender: "female",
    interestedIn: ["male"],
    ageRange: "21-27",
    area: "Mombasa",
    intents: ["Relationships"],
    bio: "Soft girl energy with big dreams. Looking for real love.",
    photoUrl:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Kenji",
    realName: "Kenji Mwai",
    email: "seed.kenji@hushly.app",
    password: "HushlySeed#2026K",
    gender: "male",
    interestedIn: ["female"],
    ageRange: "24-30",
    area: "Nairobi",
    intents: ["Plans & Hangouts"],
    bio: "Gym at sunrise, tacos at night. Balance is everything.",
    photoUrl:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Eshe",
    realName: "Eshe Wairimu",
    email: "seed.eshe@hushly.app",
    password: "HushlySeed#2026L",
    gender: "female",
    interestedIn: ["male"],
    ageRange: "22-27",
    area: "Kisumu",
    intents: ["Friends"],
    bio: "Laughing at my own jokes and yours too.",
    photoUrl:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Rayan",
    realName: "Rayan Noor",
    email: "seed.rayan@hushly.app",
    password: "HushlySeed#2026M",
    gender: "male",
    interestedIn: ["female"],
    ageRange: "23-29",
    area: "Mombasa",
    intents: ["Casual Meetups"],
    bio: "Low-key adventures, high-key loyalty.",
    photoUrl:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Tani",
    realName: "Tani Adebayo",
    email: "seed.tani@hushly.app",
    password: "HushlySeed#2026N",
    gender: "female",
    interestedIn: ["male", "female"],
    ageRange: "22-28",
    area: "Nakuru",
    intents: ["Relationships"],
    bio: "Small talks? No. Deep talks? Yes.",
    photoUrl:
      "https://images.unsplash.com/photo-1485893086445-ed75865251e0?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Abel",
    realName: "Abel Maina",
    email: "seed.abel@hushly.app",
    password: "HushlySeed#2026O",
    gender: "male",
    interestedIn: ["female"],
    ageRange: "26-32",
    area: "Eldoret",
    intents: ["Chill Buddies"],
    bio: "Quiet confidence, loud playlists.",
    photoUrl:
      "https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Nia",
    realName: "Nia Wambui",
    email: "seed.nia@hushly.app",
    password: "HushlySeed#2026P",
    gender: "female",
    interestedIn: ["male"],
    ageRange: "21-26",
    area: "Thika",
    intents: ["Friends"],
    bio: "Kind eyes, quick wit. Let’s be friends first.",
    photoUrl:
      "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Zane",
    realName: "Zane Kibet",
    email: "seed.zane@hushly.app",
    password: "HushlySeed#2026Q",
    gender: "male",
    interestedIn: ["female"],
    ageRange: "24-30",
    area: "Nairobi",
    intents: ["Plans & Hangouts"],
    bio: "Gamer, runner, and a little romantic.",
    photoUrl:
      "https://images.unsplash.com/photo-1524503033411-c9566986fc8f?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Mara",
    realName: "Mara Aoko",
    email: "seed.mara@hushly.app",
    password: "HushlySeed#2026R",
    gender: "female",
    interestedIn: ["male"],
    ageRange: "23-29",
    area: "Malindi",
    intents: ["Casual Meetups"],
    bio: "Beach bookworm. Coffee over chaos.",
    photoUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Neo",
    realName: "Neo Ochieng",
    email: "seed.neo@hushly.app",
    password: "HushlySeed#2026S",
    gender: "male",
    interestedIn: ["female"],
    ageRange: "25-31",
    area: "Kitale",
    intents: ["Relationships"],
    bio: "Love laughs and deep late-night chats.",
    photoUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Layla",
    realName: "Layla Noor",
    email: "seed.layla@hushly.app",
    password: "HushlySeed#2026T",
    gender: "female",
    interestedIn: ["male"],
    ageRange: "22-28",
    area: "Nairobi",
    intents: ["Friends"],
    bio: "Chai, sunsets, and honest energy.",
    photoUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Omar",
    realName: "Omar Said",
    email: "seed.omar@hushly.app",
    password: "HushlySeed#2026U",
    gender: "male",
    interestedIn: ["female"],
    ageRange: "27-33",
    area: "Mombasa",
    intents: ["Relationships"],
    bio: "Sea breeze and steady love. Let’s build.",
    photoUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Zola",
    realName: "Zola Mirembe",
    email: "seed.zola@hushly.app",
    password: "HushlySeed#2026V",
    gender: "female",
    interestedIn: ["female"],
    ageRange: "24-30",
    area: "Kisumu",
    intents: ["Chill Buddies"],
    bio: "Soft smiles, hard boundaries.",
    photoUrl:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Timo",
    realName: "Timo Wanyama",
    email: "seed.timo@hushly.app",
    password: "HushlySeed#2026W",
    gender: "male",
    interestedIn: ["female"],
    ageRange: "23-29",
    area: "Eldoret",
    intents: ["Casual Meetups"],
    bio: "Good vibes only. Let’s keep it light.",
    photoUrl:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Isha",
    realName: "Isha Kamau",
    email: "seed.isha@hushly.app",
    password: "HushlySeed#2026X",
    gender: "female",
    interestedIn: ["male"],
    ageRange: "21-26",
    area: "Nakuru",
    intents: ["Plans & Hangouts"],
    bio: "Let’s plan a real date and see where it goes.",
    photoUrl:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Jules",
    realName: "Jules Otis",
    email: "seed.jules@hushly.app",
    password: "HushlySeed#2026Y",
    gender: "male",
    interestedIn: ["female"],
    ageRange: "26-32",
    area: "Nairobi",
    intents: ["Chill Buddies"],
    bio: "Books, beats, and slow mornings.",
    photoUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Mika",
    realName: "Mika Wanjiru",
    email: "seed.mika@hushly.app",
    password: "HushlySeed#2026Z",
    gender: "female",
    interestedIn: ["male"],
    ageRange: "22-28",
    area: "Thika",
    intents: ["Friends"],
    bio: "Soft voice, bold heart. Say hi.",
    photoUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Rico",
    realName: "Rico Njoroge",
    email: "seed.rico@hushly.app",
    password: "HushlySeed#2026AA",
    gender: "male",
    interestedIn: ["female"],
    ageRange: "27-33",
    area: "Nairobi",
    intents: ["Relationships"],
    bio: "Gentle, grounded, and ready for love.",
    photoUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Ayo",
    realName: "Ayo Mwangi",
    email: "seed.ayo@hushly.app",
    password: "HushlySeed#2026AB",
    gender: "male",
    interestedIn: ["female"],
    ageRange: "24-30",
    area: "Mombasa",
    intents: ["Plans & Hangouts"],
    bio: "Let’s trade playlists and stories.",
    photoUrl:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Tessa",
    realName: "Tessa Atieno",
    email: "seed.tessa@hushly.app",
    password: "HushlySeed#2026AC",
    gender: "female",
    interestedIn: ["male"],
    ageRange: "23-29",
    area: "Kisumu",
    intents: ["Casual Meetups"],
    bio: "Low-key dates, high-key laughs.",
    photoUrl:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Eli",
    realName: "Eli Kibet",
    email: "seed.eli@hushly.app",
    password: "HushlySeed#2026AD",
    gender: "male",
    interestedIn: ["female"],
    ageRange: "26-32",
    area: "Eldoret",
    intents: ["Friends"],
    bio: "Coffee, hikes, and a good story.",
    photoUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Zaya",
    realName: "Zaya Mutisya",
    email: "seed.zaya@hushly.app",
    password: "HushlySeed#2026AE",
    gender: "female",
    interestedIn: ["male"],
    ageRange: "21-27",
    area: "Nakuru",
    intents: ["Relationships"],
    bio: "Let’s build a soft life together.",
    photoUrl:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Kairo",
    realName: "Kairo Onyancha",
    email: "seed.kairo@hushly.app",
    password: "HushlySeed#2026AF",
    gender: "male",
    interestedIn: ["female"],
    ageRange: "24-30",
    area: "Kitale",
    intents: ["Chill Buddies"],
    bio: "Vibes, laughter, and honest talks.",
    photoUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Asha",
    realName: "Asha Noor",
    email: "seed.asha@hushly.app",
    password: "HushlySeed#2026AG",
    gender: "female",
    interestedIn: ["male"],
    ageRange: "22-28",
    area: "Mombasa",
    intents: ["Plans & Hangouts"],
    bio: "Sea air and slow dances.",
    photoUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Biko",
    realName: "Biko Nderitu",
    email: "seed.biko@hushly.app",
    password: "HushlySeed#2026AH",
    gender: "male",
    interestedIn: ["female"],
    ageRange: "27-33",
    area: "Nairobi",
    intents: ["Relationships"],
    bio: "Quiet strength, open heart.",
    photoUrl:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Tara",
    realName: "Tara Wekesa",
    email: "seed.tara@hushly.app",
    password: "HushlySeed#2026AI",
    gender: "female",
    interestedIn: ["male"],
    ageRange: "23-29",
    area: "Thika",
    intents: ["Casual Meetups"],
    bio: "Soft laughs, bold dreams.",
    photoUrl:
      "https://images.unsplash.com/photo-1485893086445-ed75865251e0?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Samir",
    realName: "Samir Hassan",
    email: "seed.samir@hushly.app",
    password: "HushlySeed#2026AJ",
    gender: "male",
    interestedIn: ["female"],
    ageRange: "24-30",
    area: "Kisumu",
    intents: ["Friends"],
    bio: "Good conversation beats small talk.",
    photoUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
  },
  {
    nickname: "Nala",
    realName: "Nala Amina",
    email: "seed.nala@hushly.app",
    password: "HushlySeed#2026AK",
    gender: "female",
    interestedIn: ["male"],
    ageRange: "21-27",
    area: "Nakuru",
    intents: ["Relationships"],
    bio: "Soft heart, big laugh, real vibe.",
    photoUrl:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=600&q=80",
  },
];

const normalizeNickname = (value) => value.trim().toLowerCase();

const seedUser = async (user) => {
  let authUser;
  try {
    authUser = await admin.auth().getUserByEmail(user.email);
  } catch (error) {
    authUser = await admin.auth().createUser({
      email: user.email,
      password: user.password,
      displayName: user.nickname,
      emailVerified: true,
    });
  }

  const uid = authUser.uid;
  const nicknameLower = normalizeNickname(user.nickname);
  const now = FieldValue.serverTimestamp();

  const profileDoc = {
    id: uid,
    realName: user.realName,
    nickname: user.nickname,
    nicknameLower,
    email: user.email,
    emailVerified: true,
    gender: user.gender,
    interestedIn: user.interestedIn,
    ageRange: user.ageRange,
    bio: user.bio,
    area: user.area,
    intents: user.intents,
    photoUrl: user.photoUrl,
    isAnonymous: false,
    isOnline: false,
    followerCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const batch = db.batch();
  batch.set(db.collection(USERS_COLLECTION).doc(uid), profileDoc, {
    merge: true,
  });
  batch.set(
    db.collection(PUBLIC_NICKNAMES_COLLECTION).doc(nicknameLower),
    {
      userId: uid,
      nickname: user.nickname,
      nicknameLower,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
  batch.set(
    db.collection(SETTINGS_COLLECTION).doc(uid),
    { ...DEFAULT_USER_SETTINGS, createdAt: now, updatedAt: now },
    { merge: true },
  );
  await batch.commit();
  console.log(`Seeded ${user.nickname} (${user.email}) -> ${uid}`);
};

const run = async () => {
  for (const user of seedUsers) {
    // eslint-disable-next-line no-await-in-loop
    await seedUser(user);
  }
  console.log("Seeding complete.");
  process.exit(0);
};

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
