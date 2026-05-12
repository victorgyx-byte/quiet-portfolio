import type { Timestamp } from "firebase/firestore";
import type { SlidesDeckIntegration } from "@/types/slides-export";

export type PortfolioPurpose =
  | "show_growth"
  | "show_best_work"
  | "reflect_on_challenge"
  | "teacher_conversation"
  | "share_pride"
  | "understand_self"
  | "something_else";

export type PortfolioUpdate = {
  text: string;
  createdAt: string;
};

export type Portfolio = {
  id: string;
  userId: string;
  studentName: string;
  title: string;
  purpose: PortfolioPurpose;
  purposeOther?: string;
  focusTags: string[];
  selectedReflectionIds: string[];
  connectionText: string;
  ipsativeText: string;
  growthStatement: string;
  updates?: PortfolioUpdate[];
  slidesIntegration?: SlidesDeckIntegration | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type NewPortfolio = Omit<Portfolio, "id" | "createdAt" | "updatedAt">;
