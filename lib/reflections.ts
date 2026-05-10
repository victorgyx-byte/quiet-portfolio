"use client";

import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { NewReflection, Reflection } from "@/types/reflection";

const reflectionsCollection = collection(db, "reflections");

export function createReflection(reflection: NewReflection) {
  return addDoc(reflectionsCollection, {
    ...reflection,
    createdAt: serverTimestamp()
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
