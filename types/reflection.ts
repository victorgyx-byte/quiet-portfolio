import type { Timestamp } from "firebase/firestore";

export type ReflectionImage = {
  url: string;
  path: string;
  contentType: string;
  size: number;
};

export type ReflectionEvidenceFile = ReflectionImage & {
  kind: "image" | "audio";
  name: string;
};

export type ReflectionVisibility = "private" | "shared_with_teacher";
export type ReflectionType = "general" | "lesson" | "cca";

export type FollowUpNote = {
  text: string;
  createdAt: string;
};

export type TeacherFeedbackNote = {
  text: string;
  teacherName: string;
  teacherEmail: string;
  createdAt: string;
};

export type Reflection = {
  id: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  title: string;
  body: string;
  reflectionType?: ReflectionType;
  lessonSessionId?: string;
  lessonTitle?: string;
  lessonCheckpointId?: string;
  lessonCheckpointPrompt?: string;
  lessonCheckpointHelperText?: string;
  competencies?: string[];
  evidenceText?: string;
  evidenceFiles?: ReflectionEvidenceFile[];
  category?: string;
  competency?: string;
  visibility: ReflectionVisibility;
  images: ReflectionImage[];
  followUpNotes?: FollowUpNote[];
  teacherFeedbackNotes?: TeacherFeedbackNote[];
  createdAt?: Timestamp;
};

export type NewReflection = Omit<Reflection, "id" | "createdAt">;
