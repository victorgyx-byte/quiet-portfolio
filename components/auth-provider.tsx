"use client";

import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  type UserCredential,
  signOut as firebaseSignOut
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { auth, googleProvider } from "@/lib/firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isTeacher: boolean;
  signInWithGoogle: () => Promise<UserCredential>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function getTeacherEmails() {
  return (process.env.NEXT_PUBLIC_TEACHER_EMAILS ?? "")
    .split(",")
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isTeacherEmail(email?: string | null) {
  if (!email) return false;
  return getTeacherEmails().includes(email.toLowerCase());
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    return signInWithPopup(auth, googleProvider);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const isTeacher = useMemo(() => {
    return isTeacherEmail(user?.email);
  }, [user?.email]);

  const value = useMemo(
    () => ({ user, loading, isTeacher, signInWithGoogle, signOut }),
    [isTeacher, loading, signInWithGoogle, signOut, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
