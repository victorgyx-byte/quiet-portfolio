import type { Timestamp } from "firebase/firestore";

export type StudentNotification = {
  id: string;
  title: string;
  message: string;
  target: "all";
  senderName: string;
  senderEmail: string;
  createdAt?: Timestamp;
};

export type NewStudentNotification = Omit<StudentNotification, "id" | "createdAt">;
