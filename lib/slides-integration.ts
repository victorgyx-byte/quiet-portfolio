"use client";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SlidesDeckIntegration } from "@/types/slides-export";

const COLLECTION = "slidesIntegrations";

export async function getSlidesIntegration(userId: string) {
  const ref = doc(db, COLLECTION, userId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return snapshot.data() as SlidesDeckIntegration;
}

export async function saveSlidesIntegration(
  userId: string,
  integration: SlidesDeckIntegration
) {
  const ref = doc(db, COLLECTION, userId);
  await setDoc(
    ref,
    {
      ...integration,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}
