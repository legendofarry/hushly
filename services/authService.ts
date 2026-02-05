import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  User,
  updateEmail,
  updatePassword,
} from "firebase/auth";
import { auth } from "../firebase";

const SESSION_KEY = "kipepeo_session";

const saveSession = (uid: string, token: string) => {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ uid, token, createdAt: Date.now() }),
  );
};

export const setSession = (uid: string, token: string) => {
  saveSession(uid, token);
};

export const clearSession = async () => {
  sessionStorage.removeItem(SESSION_KEY);
  await signOut(auth);
};

export const checkEmailExists = async (email: string) => {
  const methods = await fetchSignInMethodsForEmail(auth, email);
  return methods.length > 0;
};

export const loginWithEmail = async (email: string, password: string) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const token = await credential.user.getIdToken();
  saveSession(credential.user.uid, token);
  return credential.user;
};

export const registerWithEmail = async (email: string, password: string) => {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const token = await credential.user.getIdToken();
  saveSession(credential.user.uid, token);
  return credential.user;
};

export const sendPasswordReset = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

export const sendVerificationEmail = async (user: User) => {
  await sendEmailVerification(user);
};

export const refreshUser = async (user: User) => {
  await user.reload();
  return user;
};

const reauthenticate = async (currentPassword: string) => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("auth/no-current-user");
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  return user;
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
) => {
  const user = await reauthenticate(currentPassword);
  await updatePassword(user, newPassword);
};

export const changeEmail = async (currentPassword: string, newEmail: string) => {
  const user = await reauthenticate(currentPassword);
  await updateEmail(user, newEmail);
  await sendEmailVerification(user);
  return user;
};
