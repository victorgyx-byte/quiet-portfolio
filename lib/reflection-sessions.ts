"use client";

import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ReflectionSession } from "@/types/reflection-session";

const COLLECTION = "reflectionSessions";

export async function startLessonReflectionSession(userId: string, lessonTitle: string) {
  const ref = doc(db, COLLECTION, userId);
  await setDoc(
    ref,
    {
      userId,
      type: "lesson",
      lessonTitle: lessonTitle.trim(),
      active: true,
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function endLessonReflectionSession(userId: string) {
  const ref = doc(db, COLLECTION, userId);
  await setDoc(
    ref,
    {
      active: false,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function getLessonReflectionSession(userId: string) {
  const ref = doc(db, COLLECTION, userId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as ReflectionSession;
  return data.active ? data : null;
}

export function subscribeToLessonReflectionSession(
  userId: string,
  onNext: (session: ReflectionSession | null) => void,
  onError: (error: Error) => void
) {
  const ref = doc(db, COLLECTION, userId);
  return onSnapshot(
    ref,
    snapshot => {
      if (!snapshot.exists()) {
        onNext(null);
        return;
      }
      const data = snapshot.data() as ReflectionSession;
      onNext(data.active ? data : null);
    },
    onError
  );
}
