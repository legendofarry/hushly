export const BIO_MAX_WORDS = 25;

export const countWords = (value: string) =>
  (value.match(/\S+/g) ?? []).length;

export const trimToWordLimit = (value: string, limit = BIO_MAX_WORDS) => {
  const words = value.match(/\S+/g) ?? [];
  if (words.length <= limit) return value;
  return words.slice(0, limit).join(" ");
};

export const clampBio = (value: string, limit = BIO_MAX_WORDS) =>
  trimToWordLimit(value, limit).trim();
