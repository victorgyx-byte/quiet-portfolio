import type { Timestamp } from "firebase/firestore";

export type ReflectionSession = {
  id: string;
  userId: string;
  type: "lesson";
  lessonTitle: string;
  teacherName: string;
  teacherEmail: string;
  active: boolean;
  startedAt?: Timestamp;
  updatedAt?: Timestamp;
};
