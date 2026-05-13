"use client";

import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { NewReflectionStat, ReflectionStat } from "@/types/reflection-stats";

const reflectionStatsCollection = collection(db, "reflectionStats");

export function createReflectionStat(stat: NewReflectionStat) {
  return addDoc(reflectionStatsCollection, {
    ...stat,
    createdAt: serverTimestamp()
  });
}

export function subscribeToReflectionStats(
  onNext: (stats: ReflectionStat[]) => void,
  onError: (error: Error) => void
) {
  const q = query(reflectionStatsCollection);
  return onSnapshot(
    q,
    snapshot => {
      onNext(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ReflectionStat));
    },
    onError
  );
}
