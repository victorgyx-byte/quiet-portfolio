import type { Timestamp } from "firebase/firestore";

export type ReflectionImage = {
  url: string;
  path: string;
  contentType: string;
  size: number;
};

export type ReflectionVisibility = "private" | "shared_with_teacher";

export type Reflection = {
  id: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  title: string;
  body: string;
  category: string;
  competency: string;
  visibility: ReflectionVisibility;
  images: ReflectionImage[];
  createdAt?: Timestamp;
};

export type NewReflection = Omit<Reflection, "id" | "createdAt">;
