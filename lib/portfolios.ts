"use client";

import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { NewPortfolio, Portfolio } from "@/types/portfolio";
import type { SlidesDeckIntegration } from "@/types/slides-export";

const portfoliosCollection = collection(db, "portfolios");

export function createPortfolio(portfolio: NewPortfolio) {
  return addDoc(portfoliosCollection, {
    ...portfolio,
    updates: portfolio.updates ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export function subscribeToStudentPortfolios(
  userId: string,
  onNext: (portfolios: Portfolio[]) => void,
  onError: (error: Error) => void
) {
  const q = query(portfoliosCollection, where("userId", "==", userId));
  return onSnapshot(
    q,
    snapshot => {
      const data = snapshot.docs
        .map(item => ({ id: item.id, ...item.data() }) as Portfolio)
        .sort((a, b) => {
          const aTime = a.updatedAt?.toDate?.().getTime() ?? 0;
          const bTime = b.updatedAt?.toDate?.().getTime() ?? 0;
          return bTime - aTime;
        });
      onNext(data);
    },
    onError
  );
}

export async function updatePortfolio(
  portfolioId: string,
  patch: Partial<Omit<Portfolio, "id" | "userId" | "studentName" | "createdAt" | "updatedAt">>
) {
  const ref = doc(db, "portfolios", portfolioId);
  await updateDoc(ref, {
    ...patch,
    updatedAt: serverTimestamp()
  });
}

export async function addPortfolioUpdate(portfolioId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const ref = doc(db, "portfolios", portfolioId);
  await updateDoc(ref, {
    updates: arrayUnion({
      text: trimmed,
      createdAt: new Date().toISOString()
    }),
    updatedAt: serverTimestamp()
  });
}

export async function savePortfolioSlidesIntegration(
  portfolioId: string,
  integration: SlidesDeckIntegration
) {
  const ref = doc(db, "portfolios", portfolioId);
  await updateDoc(ref, {
    slidesIntegration: integration,
    updatedAt: serverTimestamp()
  });
}
