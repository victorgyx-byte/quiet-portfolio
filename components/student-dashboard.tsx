"use client";

import { useAuth } from "@/components/auth-provider";
import { ReflectionForm } from "@/components/reflection-form";

export function StudentDashboard() {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-ink p-5 text-white shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
          Reflection Space
        </p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Hi {firstName}, what shifted today?</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/72">
          Add one short reflection. Keep it private, or share when you are ready.
        </p>
      </section>
      <div id="compose" className="scroll-mt-24">
        <ReflectionForm />
      </div>
    </div>
  );
}
