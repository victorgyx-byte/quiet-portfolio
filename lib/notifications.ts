"use client";

import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { NewStudentNotification, StudentNotification } from "@/types/notification";

const notificationsCollection = collection(db, "notifications");

export function createStudentNotification(notification: NewStudentNotification) {
  return addDoc(notificationsCollection, {
    ...notification,
    createdAt: serverTimestamp()
  });
}

export function subscribeToRecentStudentNotifications(
  onNext: (notifications: StudentNotification[]) => void,
  onError: (error: Error) => void
) {
  const q = query(notificationsCollection, where("target", "==", "all"));

  return onSnapshot(
    q,
    snapshot => {
      const notifications = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }) as StudentNotification)
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.().getTime() ?? 0;
          const bTime = b.createdAt?.toDate?.().getTime() ?? 0;
          return bTime - aTime;
        })
        .slice(0, 5);
      onNext(notifications);
    },
    onError
  );
}
