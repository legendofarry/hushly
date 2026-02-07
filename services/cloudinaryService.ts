
import {
  analyzeImageFile,
  computePhotoHash,
  isDuplicatePhotoHash,
  storePhotoHash,
  type PhotoQualityReport,
} from "./photoAiService";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const uploadToCloudinary = async (file: File): Promise<string> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Missing Cloudinary configuration.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error("Cloudinary upload failed.");
  }

  const data = await response.json();
  if (!data?.secure_url) {
    throw new Error("Cloudinary did not return an image URL.");
  }

  return data.secure_url as string;
};

export const uploadAudioToCloudinary = async (
  file: File,
): Promise<string> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Missing Cloudinary configuration.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error("Cloudinary audio upload failed.");
  }

  const data = await response.json();
  if (!data?.secure_url) {
    throw new Error("Cloudinary did not return an audio URL.");
  }

  return data.secure_url as string;
};

export type PhotoAiReport = PhotoQualityReport & {
  duplicate: boolean;
  hash?: string;
};

export const analyzePhotoForAi = async (file: File): Promise<PhotoAiReport> => {
  const [quality, hash] = await Promise.all([
    analyzeImageFile(file),
    computePhotoHash(file),
  ]);
  const duplicate = isDuplicatePhotoHash(hash);
  return { ...quality, hash, duplicate };
};

export const storePhotoAiHash = (hash?: string) => {
  if (!hash) return;
  storePhotoHash(hash);
};
