import {
  arrayUnion,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { GameAnswers } from "../types";

const GAME_ANSWERS_COLLECTION = "game_answers";

const gameAnswersRef = (userId: string) =>
  doc(db, GAME_ANSWERS_COLLECTION, userId);

const mapGameAnswers = (userId: string, data: any): GameAnswers => {
  const createdAt =
    data?.createdAt?.toMillis?.() ?? data?.createdAt ?? undefined;
  const updatedAt =
    data?.updatedAt?.toMillis?.() ?? data?.updatedAt ?? undefined;
  return {
    userId,
    hushQuiz: {
      answers:
        typeof data?.hushQuiz?.answers === "object" &&
        data?.hushQuiz?.answers !== null
          ? data.hushQuiz.answers
          : {},
      updatedAt:
        data?.hushQuiz?.updatedAt?.toMillis?.() ??
        data?.hushQuiz?.updatedAt ??
        undefined,
    },
    dateNight: {
      traits: Array.isArray(data?.dateNight?.traits)
        ? data.dateNight.traits
        : [],
      updatedAt:
        data?.dateNight?.updatedAt?.toMillis?.() ??
        data?.dateNight?.updatedAt ??
        undefined,
    },
    createdAt,
    updatedAt,
  };
};

export const getGameAnswers = async (userId: string) => {
  const snapshot = await getDoc(gameAnswersRef(userId));
  if (!snapshot.exists()) return null;
  return mapGameAnswers(snapshot.id, snapshot.data());
};

export const getGameAnswersByIds = async (userIds: string[]) => {
  if (!userIds.length) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += 10) {
    chunks.push(userIds.slice(i, i + 10));
  }
  const results: GameAnswers[] = [];
  for (const chunk of chunks) {
    const snapshot = await getDocs(
      query(
        collection(db, GAME_ANSWERS_COLLECTION),
        where(documentId(), "in", chunk),
      ),
    );
    snapshot.forEach((docSnap) => {
      results.push(mapGameAnswers(docSnap.id, docSnap.data()));
    });
  }
  return results;
};

export const recordHushQuizAnswer = async (
  userId: string,
  questionId: string,
  choice: "A" | "B",
) => {
  if (!userId || !questionId) return;
  const now = Date.now();
  await setDoc(
    gameAnswersRef(userId),
    {
      userId,
      updatedAt: now,
      ["hushQuiz.updatedAt"]: now,
      [`hushQuiz.answers.${questionId}`]: choice,
    },
    { merge: true },
  );
};

export const recordDateNightTrait = async (
  userId: string,
  trait: string,
) => {
  if (!userId || !trait) return;
  const now = Date.now();
  await setDoc(
    gameAnswersRef(userId),
    {
      userId,
      updatedAt: now,
      ["dateNight.updatedAt"]: now,
      ["dateNight.traits"]: arrayUnion(trait),
    },
    { merge: true },
  );
};
