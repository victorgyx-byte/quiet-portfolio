"use client";

import {
  arrayUnion,
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
import type { NewReflection, Reflection } from "@/types/reflection";

const reflectionsCollection = collection(db, "reflections");

export function createReflection(reflection: NewReflection) {
  return addDoc(reflectionsCollection, {
    ...reflection,
    followUpNotes: reflection.followUpNotes ?? [],
    createdAt: serverTimestamp()
  });
}

export async function addReflectionFollowUp(reflectionId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Note is empty.");
  }

  const reflectionRef = doc(db, "reflections", reflectionId);
  await updateDoc(reflectionRef, {
    followUpNotes: arrayUnion({
      text: trimmed,
      createdAt: new Date().toISOString()
    })
  });
}

export function subscribeToStudentReflections(
  userId: string,
  onNext: (reflections: Reflection[]) => void,
  onError: (error: Error) => void
) {
  const reflectionsQuery = query(
    reflectionsCollection,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    reflectionsQuery,
    snapshot => {
      onNext(
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Reflection[]
      );
    },
    onError
  );
}

export function subscribeToTeacherReflections(
  onNext: (reflections: Reflection[]) => void,
  onError: (error: Error) => void
) {
  const reflectionsQuery = query(
    reflectionsCollection,
    where("visibility", "==", "shared_with_teacher"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    reflectionsQuery,
    snapshot => {
      onNext(
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Reflection[]
      );
    },
    onError
  );
}
