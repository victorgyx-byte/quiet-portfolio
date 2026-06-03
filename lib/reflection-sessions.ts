"use client";

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ReflectionSession } from "@/types/reflection-session";

const COLLECTION = "reflectionSessions";
const reflectionSessionsCollection = collection(db, COLLECTION);

export async function startLessonReflectionSession(input: {
  userId: string;
  teacherName: string;
  teacherEmail: string;
  lessonTitle: string;
}) {
  const docRef = await addDoc(reflectionSessionsCollection, {
    userId: input.userId,
    teacherName: input.teacherName,
    teacherEmail: input.teacherEmail,
    type: "lesson",
    lessonTitle: input.lessonTitle.trim(),
    active: true,
    startedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
}

export async function endLessonReflectionSession(sessionId: string) {
  const ref = doc(db, COLLECTION, sessionId);
  await updateDoc(ref, {
    active: false,
    updatedAt: serverTimestamp()
  });
}

export function subscribeToActiveLessonReflectionSessions(
  onNext: (sessions: ReflectionSession[]) => void,
  onError: (error: Error) => void
) {
  const q = query(
    reflectionSessionsCollection,
    where("active", "==", true),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(
    q,
    snapshot => {
      const sessions = snapshot.docs
        .map(docSnapshot => ({
          id: docSnapshot.id,
          ...docSnapshot.data()
        }))
        .map(session => session as Partial<ReflectionSession> & { id: string })
        .filter(
          session =>
            session.type === "lesson" &&
            typeof session.lessonTitle === "string" &&
            session.lessonTitle.trim().length > 0 &&
            typeof session.teacherName === "string" &&
            session.teacherName.trim().length > 0 &&
            typeof session.teacherEmail === "string" &&
            session.teacherEmail.trim().length > 0
        ) as ReflectionSession[];

      onNext(sessions);
    },
    onError
  );
}
