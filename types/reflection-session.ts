import type { Timestamp } from "firebase/firestore";

export type LessonCheckpoint = {
  id: string;
  prompt: string;
  helperText?: string;
  createdAt: string;
};

export type ReflectionSession = {
  id: string;
  userId: string;
  type: "lesson";
  lessonTitle: string;
  teacherName: string;
  teacherEmail: string;
  active: boolean;
  activeCheckpointId?: string;
  checkpoints?: LessonCheckpoint[];
  startedAt?: Timestamp;
  updatedAt?: Timestamp;
};
