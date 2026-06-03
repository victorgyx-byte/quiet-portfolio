import type { Timestamp } from "firebase/firestore";

export type ReflectionSession = {
  userId: string;
  type: "lesson";
  lessonTitle: string;
  active: boolean;
  startedAt?: Timestamp;
  updatedAt?: Timestamp;
};
