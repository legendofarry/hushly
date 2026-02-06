const STORAGE_KEYS = {
  enabled: "hushly_bio_enabled",
  credentialId: "hushly_bio_cred_id",
  userId: "hushly_bio_user_id",
  email: "hushly_bio_email",
  encryptedPassword: "hushly_bio_pw",
  iv: "hushly_bio_iv",
  key: "hushly_bio_key",
  promptDismissed: "hushly_bio_prompt_dismissed",
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toBase64Url = (buffer: ArrayBuffer | Uint8Array) => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const randomBytes = (length: number) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

const ensureCrypto = () => {
  if (!crypto?.subtle) {
    throw new Error("biometric-crypto-unavailable");
  }
};

const getStoredValue = (key: string) => localStorage.getItem(key) ?? "";

const encryptPassword = async (password: string, keyBytes: Uint8Array) => {
  ensureCrypto();
  const iv = randomBytes(12);
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(password),
  );
  return {
    encrypted: toBase64Url(encrypted),
    iv: toBase64Url(iv),
  };
};

const decryptPassword = async (
  encrypted: string,
  iv: string,
  keyBytes: Uint8Array,
) => {
  ensureCrypto();
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64Url(iv) },
    key,
    fromBase64Url(encrypted),
  );
  return textDecoder.decode(decrypted);
};

export const isBiometricSupported = async () => {
  if (typeof window === "undefined") return false;
  if (!window.PublicKeyCredential || !navigator.credentials) return false;
  if (
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !==
    "function"
  ) {
    return false;
  }
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const isBiometricEnabled = () =>
  getStoredValue(STORAGE_KEYS.enabled) === "1";

export const wasBiometricPromptDismissed = () =>
  getStoredValue(STORAGE_KEYS.promptDismissed) === "1";

export const dismissBiometricPrompt = () => {
  localStorage.setItem(STORAGE_KEYS.promptDismissed, "1");
};

export const clearBiometricData = () => {
  Object.values(STORAGE_KEYS).forEach((key) => {
    if (key !== STORAGE_KEYS.promptDismissed) {
      localStorage.removeItem(key);
    }
  });
};

export const enableBiometricLogin = async (payload: {
  userId: string;
  email: string;
  displayName: string;
  password: string;
}) => {
  const { userId, email, displayName, password } = payload;
  if (!navigator.credentials || !window.PublicKeyCredential) {
    throw new Error("biometric-unavailable");
  }
  ensureCrypto();

  const challenge = randomBytes(32);
  const userHandle = textEncoder.encode(userId);

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Hushly" },
      user: {
        id: userHandle,
        name: email,
        displayName: displayName || email,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      timeout: 60000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("biometric-setup-failed");
  }

  const keyBytes = randomBytes(32);
  const encrypted = await encryptPassword(password, keyBytes);

  localStorage.setItem(STORAGE_KEYS.enabled, "1");
  localStorage.setItem(STORAGE_KEYS.credentialId, toBase64Url(credential.rawId));
  localStorage.setItem(STORAGE_KEYS.userId, userId);
  localStorage.setItem(STORAGE_KEYS.email, email);
  localStorage.setItem(STORAGE_KEYS.encryptedPassword, encrypted.encrypted);
  localStorage.setItem(STORAGE_KEYS.iv, encrypted.iv);
  localStorage.setItem(STORAGE_KEYS.key, toBase64Url(keyBytes));
  localStorage.removeItem(STORAGE_KEYS.promptDismissed);
};

export const biometricLogin = async () => {
  if (!navigator.credentials || !window.PublicKeyCredential) {
    throw new Error("biometric-unavailable");
  }
  const credentialId = getStoredValue(STORAGE_KEYS.credentialId);
  const email = getStoredValue(STORAGE_KEYS.email);
  const encryptedPassword = getStoredValue(STORAGE_KEYS.encryptedPassword);
  const iv = getStoredValue(STORAGE_KEYS.iv);
  const key = getStoredValue(STORAGE_KEYS.key);

  if (!credentialId || !email || !encryptedPassword || !iv || !key) {
    throw new Error("biometric-not-enabled");
  }

  const allowCredentials = [
    {
      id: fromBase64Url(credentialId),
      type: "public-key",
      transports: ["internal"],
    },
  ];

  const challenge = randomBytes(32);
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials,
      userVerification: "required",
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) {
    throw new Error("biometric-cancelled");
  }

  const password = await decryptPassword(
    encryptedPassword,
    iv,
    fromBase64Url(key),
  );

  return { email, password };
};

export const getStoredBiometricUser = () => ({
  userId: getStoredValue(STORAGE_KEYS.userId),
  email: getStoredValue(STORAGE_KEYS.email),
});
