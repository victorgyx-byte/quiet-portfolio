"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

export function SignInButton({ compact = false }: { compact?: boolean }) {
  const { signInWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleSignIn() {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={isSigningIn}
      className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-moss disabled:cursor-wait disabled:opacity-70"
    >
      <span className="grid size-6 place-items-center rounded-full bg-white text-sm font-bold text-ink">
        G
      </span>
      {compact ? "Continue" : isSigningIn ? "Opening Google..." : "Continue with Google"}
    </button>
  );
}
