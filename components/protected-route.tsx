"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { SignInButton } from "@/components/sign-in-button";

export function ProtectedRoute({
  children,
  teacherOnly = false
}: {
  children: React.ReactNode;
  teacherOnly?: boolean;
}) {
  const { user, loading, isTeacher } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-12 w-12 animate-pulse rounded-full bg-sage/30" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto grid min-h-[65vh] max-w-md place-items-center text-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            Sign in
          </p>
          <h1 className="mt-3 text-3xl font-bold text-ink">Your portfolio is private.</h1>
          <p className="mt-3 text-sm leading-6 text-ink/65">
            Use your school Google account to open your reflection space.
          </p>
          <div className="mt-6">
            <SignInButton />
          </div>
        </div>
      </div>
    );
  }

  if (teacherOnly && !isTeacher) {
    return (
      <div className="mx-auto grid min-h-[65vh] max-w-md place-items-center text-center">
        <div>
          <h1 className="text-3xl font-bold text-ink">Teacher access is limited.</h1>
          <p className="mt-3 text-sm leading-6 text-ink/65">
            Your student dashboard is ready, and this view is reserved for teacher
            accounts configured in the app.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
          >
            Go to reflections
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
