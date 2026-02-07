export type PhotoQualityReport = {
  width: number;
  height: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  score: number;
  issues: string[];
  hash?: string;
};

const HASH_STORAGE_KEY = "hushly_photo_hashes_v1";
const MAX_HASHES = 20;

const canUseStorage = () =>
  typeof window !== "undefined" && typeof localStorage !== "undefined";

const loadHashes = (): string[] => {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(HASH_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

const saveHashes = (hashes: string[]) => {
  if (!canUseStorage()) return;
  const trimmed = hashes.slice(-MAX_HASHES);
  localStorage.setItem(HASH_STORAGE_KEY, JSON.stringify(trimmed));
};

const loadImageFromFile = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (event) => {
      URL.revokeObjectURL(url);
      reject(event);
    };
    img.src = url;
  });

const getImageData = (img: HTMLImageElement, width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas-unavailable");
  }
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
};

const computeStats = (data: Uint8ClampedArray) => {
  const length = data.length / 4;
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    sum += gray;
    sumSq += gray * gray;
  }
  const mean = sum / length;
  const variance = Math.max(sumSq / length - mean * mean, 0);
  const stdDev = Math.sqrt(variance);
  return { brightness: mean, contrast: stdDev };
};

const computeSharpness = (data: Uint8ClampedArray, width: number) => {
  let total = 0;
  let count = 0;
  for (let y = 1; y < data.length / 4 / width - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = (y * width + x) * 4;
      const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      const leftIdx = (y * width + (x - 1)) * 4;
      const rightIdx = (y * width + (x + 1)) * 4;
      const upIdx = ((y - 1) * width + x) * 4;
      const downIdx = ((y + 1) * width + x) * 4;
      const leftGray =
        0.299 * data[leftIdx] +
        0.587 * data[leftIdx + 1] +
        0.114 * data[leftIdx + 2];
      const rightGray =
        0.299 * data[rightIdx] +
        0.587 * data[rightIdx + 1] +
        0.114 * data[rightIdx + 2];
      const upGray =
        0.299 * data[upIdx] +
        0.587 * data[upIdx + 1] +
        0.114 * data[upIdx + 2];
      const downGray =
        0.299 * data[downIdx] +
        0.587 * data[downIdx + 1] +
        0.114 * data[downIdx + 2];
      const laplacian = leftGray + rightGray + upGray + downGray - 4 * gray;
      total += Math.abs(laplacian);
      count += 1;
    }
  }
  return count > 0 ? total / count : 0;
};

const hexFromBits = (bits: number[]) => {
  const hex: string[] = [];
  for (let i = 0; i < bits.length; i += 4) {
    const chunk = bits.slice(i, i + 4).join("");
    hex.push(parseInt(chunk, 2).toString(16));
  }
  return hex.join("");
};

export const computePhotoHash = async (file: File) => {
  const img = await loadImageFromFile(file);
  const width = 9;
  const height = 8;
  const imageData = getImageData(img, width, height);
  const bits: number[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const idx = (y * width + x) * 4;
      const nextIdx = (y * width + x + 1) * 4;
      const gray =
        0.299 * imageData.data[idx] +
        0.587 * imageData.data[idx + 1] +
        0.114 * imageData.data[idx + 2];
      const nextGray =
        0.299 * imageData.data[nextIdx] +
        0.587 * imageData.data[nextIdx + 1] +
        0.114 * imageData.data[nextIdx + 2];
      bits.push(gray > nextGray ? 1 : 0);
    }
  }
  return hexFromBits(bits);
};

const hammingDistance = (a: string, b: string) => {
  if (a.length !== b.length) return Number.MAX_SAFE_INTEGER;
  let distance = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    distance += diff.toString(2).split("1").length - 1;
  }
  return distance;
};

export const isDuplicatePhotoHash = (hash: string, threshold = 6) => {
  const stored = loadHashes();
  return stored.some((existing) => hammingDistance(existing, hash) <= threshold);
};

export const storePhotoHash = (hash: string) => {
  const stored = loadHashes();
  if (!stored.includes(hash)) {
    stored.push(hash);
    saveHashes(stored);
  }
};

export const analyzeImageFile = async (file: File): Promise<PhotoQualityReport> => {
  const img = await loadImageFromFile(file);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  const sampleSize = 128;
  const ratio = width / height;
  const imageData = getImageData(img, sampleSize, Math.round(sampleSize / ratio));
  const { brightness, contrast } = computeStats(imageData.data);
  const sharpness = computeSharpness(imageData.data, imageData.width);
  const issues: string[] = [];

  if (width < 640 || height < 640) {
    issues.push("Low resolution. Use a clearer, higher-res selfie.");
  }
  if (brightness < 70) {
    issues.push("Image is too dark. Add more light.");
  }
  if (brightness > 200) {
    issues.push("Image is too bright. Reduce exposure.");
  }
  if (contrast < 25) {
    issues.push("Low contrast. Face visibility may be low.");
  }
  if (sharpness < 8) {
    issues.push("Image looks blurry. Try a steadier shot.");
  }
  if (ratio < 0.6 || ratio > 1.8) {
    issues.push("Unusual crop. Center your face in the frame.");
  }

  let score = 100;
  score -= issues.length * 12;
  score = Math.max(35, Math.min(100, score));

  return {
    width,
    height,
    brightness,
    contrast,
    sharpness,
    score,
    issues,
  };
};
