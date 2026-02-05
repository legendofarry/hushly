export enum IntentType {
  FRIENDS = "Friends",
  CHILL = "Chill Buddies",
  CASUAL = "Casual Meetups",
  RELATIONSHIP = "Relationships",
  MUTUAL = "Mutual / Sugar",
  HIRING = "Companionship (Hire)",
  PLANS = "Plans & Hangouts",
}

export interface UserProfile {
  id: string;
  realName: string; // Private
  nickname: string; // Public
  nicknameLower?: string;
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
