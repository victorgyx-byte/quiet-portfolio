"use client";

import {
  arrayUnion,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  limit,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot
} from "firebase/firestore";
import { deleteObject, ref as storageRef } from "firebase/storage";
import { db } from "@/lib/firebase";
import { storage } from "@/lib/firebase";
import type { NewReflection, Reflection } from "@/types/reflection";

const reflectionsCollection = collection(db, "reflections");

export function createReflection(reflection: NewReflection) {
  return addDoc(reflectionsCollection, {
    ...reflection,
    followUpNotes: reflection.followUpNotes ?? [],
    teacherFeedbackNotes: reflection.teacherFeedbackNotes ?? [],
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

export async function addTeacherFeedback(
  reflectionId: string,
  text: string,
  teacher: { name: string; email: string }
) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Feedback is empty.");
  }

  const reflectionRef = doc(db, "reflections", reflectionId);
  await updateDoc(reflectionRef, {
    teacherFeedbackNotes: arrayUnion({
      text: trimmed,
      teacherName: teacher.name,
      teacherEmail: teacher.email,
      createdAt: new Date().toISOString()
    })
  });
}

export async function deleteReflection(reflection: Reflection) {
  const reflectionRef = doc(db, "reflections", reflection.id);

  const imageDeletions = (reflection.images ?? []).map(image =>
    deleteObject(storageRef(storage, image.path)).catch(() => undefined)
  );
  await Promise.all(imageDeletions);
  await deleteDoc(reflectionRef);
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

export async function fetchStudentReflectionsPage(
  userId: string,
  pageSize = 20,
  cursor?: QueryDocumentSnapshot<DocumentData>
) {
  const reflectionsQuery = cursor
    ? query(
        reflectionsCollection,
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        startAfter(cursor),
        limit(pageSize)
      )
    : query(
        reflectionsCollection,
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(pageSize)
      );

  const snapshot = await getDocs(reflectionsQuery);
  const reflections = snapshot.docs.map(
    doc => ({ id: doc.id, ...doc.data() }) as Reflection
  );

  return {
    reflections,
    cursor: snapshot.docs.at(-1),
    hasMore: snapshot.docs.length === pageSize
  };
}
