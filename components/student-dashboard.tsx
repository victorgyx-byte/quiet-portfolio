"use client";

import { useAuth } from "@/components/auth-provider";
import { PortfolioBuilder } from "@/components/portfolio-builder";
import { ReflectionForm } from "@/components/reflection-form";
import { ReflectionTimeline } from "@/components/reflection-timeline";

export function StudentDashboard() {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-ink p-5 text-white shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">
          Student dashboard
        </p>
        <h1 className="mt-3 text-3xl font-bold">Welcome, {firstName}.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
          This is your private record of learning. You decide what to keep for
          yourself and what to share with a teacher.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[0.94fr_1.06fr]">
        <ReflectionForm />
        <ReflectionTimeline />
      </div>
      <PortfolioBuilder />
    </div>
  );
}
