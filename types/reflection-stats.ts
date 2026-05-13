import type { Timestamp } from "firebase/firestore";
import type { ReflectionVisibility } from "@/types/reflection";

export type ReflectionStat = {
  id: string;
  competency: string;
  category: string;
  visibility: ReflectionVisibility;
  monthKey: string;
  createdAt?: Timestamp;
};

export type NewReflectionStat = Omit<ReflectionStat, "id" | "createdAt">;
