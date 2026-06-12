"use client";

import {
  addDoc,
  arrayUnion,
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
import type { LessonCheckpoint, ReflectionSession } from "@/types/reflection-session";

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
    activeCheckpointId: "",
    updatedAt: serverTimestamp()
  });
}

function createCheckpointId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `checkpoint-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getActiveLessonCheckpoint(session?: ReflectionSession | null) {
  if (!session?.activeCheckpointId) return null;
  return (
    session.checkpoints?.find(checkpoint => checkpoint.id === session.activeCheckpointId) ?? null
  );
}

export function getLessonCheckpoints(session?: ReflectionSession | null) {
  return [...(session?.checkpoints ?? [])].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );
}

export async function createLessonCheckpoint(
  sessionId: string,
  input: { prompt: string; helperText?: string }
) {
  const checkpoint: LessonCheckpoint = {
    id: createCheckpointId(),
    prompt: input.prompt.trim(),
    helperText: input.helperText?.trim() || "",
    createdAt: new Date().toISOString()
  };
  const ref = doc(db, COLLECTION, sessionId);
  await updateDoc(ref, {
    checkpoints: arrayUnion(checkpoint),
    activeCheckpointId: checkpoint.id,
    updatedAt: serverTimestamp()
  });
  return checkpoint.id;
}

export async function setActiveLessonCheckpoint(sessionId: string, checkpointId: string) {
  const ref = doc(db, COLLECTION, sessionId);
  await updateDoc(ref, {
    activeCheckpointId: checkpointId,
    updatedAt: serverTimestamp()
  });
}

export async function closeActiveLessonCheckpoint(sessionId: string) {
  const ref = doc(db, COLLECTION, sessionId);
  await updateDoc(ref, {
    activeCheckpointId: "",
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
