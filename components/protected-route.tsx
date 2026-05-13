"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";

export function ProtectedRoute({
  children,
  teacherOnly = false
}: {
  children: React.ReactNode;
  teacherOnly?: boolean;
}) {
  const { user, loading, isTeacher } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-12 w-12 animate-pulse rounded-full bg-blue-200/60" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-12 w-12 animate-pulse rounded-full bg-orange-200/60" />
      </div>
    );
  }

  if (teacherOnly && !isTeacher) {
    return (
      <div className="mx-auto grid min-h-[65vh] max-w-md place-items-center text-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Teacher access is limited.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Your student dashboard is ready, and this view is reserved for teacher
            accounts configured in the app.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          >
            Go to reflections
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
