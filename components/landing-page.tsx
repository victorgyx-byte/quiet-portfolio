"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { SignInButton } from "@/components/sign-in-button";

const principles = [
  "Private first",
  "Student-owned",
  "Growth over comparison",
  "Teacher insight without surveillance"
];

export function LandingPage() {
  const { user, loading } = useAuth();

  return (
    <main className="min-h-screen">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl content-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Secondary student portfolio
          </p>
          <h1 className="text-5xl font-bold leading-[1.02] tracking-normal text-slate-900 sm:text-6xl">
            Student's Companion
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            A calm space for students to notice progress, connect learning to
            life, and build evidence of 21CC development over time.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {loading ? (
              <div className="h-12 w-44 animate-pulse rounded-full bg-slate-200" />
            ) : user ? (
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Open dashboard
              </Link>
            ) : (
              <SignInButton />
            )}
            <Link
              href="/teacher"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white/90 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Teacher view
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-[2rem] border border-white/80 bg-white/80 p-4 shadow-soft backdrop-blur">
            <div className="rounded-[1.5rem] bg-blue-50 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Today
                  </p>
                  <h2 className="text-2xl font-bold text-slate-900">A learning moment</h2>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
                  Private
                </span>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-sm leading-6 text-slate-600">
                    I changed my approach after feedback. Next time, I want to ask
                    one clarifying question before starting.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-rose-50 p-4">
                    <p className="text-xs font-semibold text-rose-700">Competency</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      Self-management
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-semibold text-teal-700">Evidence</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      Group project
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
            {principles.map(principle => (
              <div
                key={principle}
                className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-600"
              >
                {principle}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
