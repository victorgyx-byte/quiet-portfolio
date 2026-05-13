"use client";

import { useAuth } from "@/components/auth-provider";
import { ReflectionForm } from "@/components/reflection-form";
import { useUiMode } from "@/components/ui-mode";

export function StudentDashboard() {
  const { user } = useAuth();
  const { mode } = useUiMode();
  const firstName = user?.displayName?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-4">
      {mode === "classic" ? (
        <section className="student-hero glass-card rounded-3xl p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
            Your Space
          </p>
          <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
            Hey {firstName}, what stuck with you today?
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/68">
            Snap a quick thought, add context later, and build your story over time.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#eef3ff] px-3 py-1 text-xs font-semibold text-[#395cc7]">
              Private by default
            </span>
            <span className="rounded-full bg-[#ecfff9] px-3 py-1 text-xs font-semibold text-[#177f68]">
              Feedback when ready
            </span>
          </div>
        </section>
      ) : null}
      <div id="compose" className="scroll-mt-24">
        <ReflectionForm />
      </div>
    </div>
  );
}
