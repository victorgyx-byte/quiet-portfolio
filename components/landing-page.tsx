"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { SignInButton } from "@/components/sign-in-button";

const principles = [
  "Private first",
  "Student-owned",
  "Growth over comparison",
  "Ready for conversation"
];

const sampleMoments = [
  {
    label: "Capture",
    title: "I noticed...",
    body: "A small moment from today, saved before it disappears."
  },
  {
    label: "Reflect",
    title: "This mattered because...",
    body: "Students add meaning when they are ready to think deeper."
  },
  {
    label: "Curate",
    title: "My growth story",
    body: "Moments become a portfolio students can keep shaping."
  }
];

export function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  return (
    <main className="landing-studio min-h-screen overflow-hidden">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl content-center gap-12 px-5 py-8 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-black uppercase tracking-[0.14em] text-[#8a6a57]">
            Student reflection checkpoints
          </p>
          <h1 className="text-6xl font-black leading-[0.92] tracking-normal text-[#322219] sm:text-7xl">
            Checkpoint
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#735846]">
            A warm space for students to capture moments, make meaning from their
            process, and shape reflections into portfolios they can present.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {loading ? (
              <div className="h-12 w-44 animate-pulse rounded-full bg-[#f0d8c7]" />
            ) : user ? (
              <Link
                href="/dashboard"
                className="home-primary inline-flex min-h-12 items-center justify-center rounded-full px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5"
              >
                Open dashboard
              </Link>
            ) : (
              <SignInButton />
            )}
            <Link
              href="/teacher"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d8bda9] bg-[#fff7ec]/70 px-5 py-3 text-sm font-bold text-[#684636] transition hover:border-[#cfa88f]"
            >
              Teacher view
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            {principles.map(principle => (
              <span
                key={principle}
                className="rounded-full border border-[#dfc4af] bg-[#fff9f1]/60 px-4 py-2 text-sm font-bold text-[#735846]"
              >
                {principle}
              </span>
            ))}
          </div>
        </div>

        <div className="relative min-h-[520px]">
          <div className="absolute left-0 top-8 h-64 w-48 rotate-[-5deg] overflow-hidden rounded-[1.7rem] bg-[#eeb48b] shadow-[0_24px_70px_rgba(102,61,36,0.18)] sm:left-8">
            <div className="h-36 bg-[linear-gradient(135deg,#d87545,#f6c58f)]" />
            <div className="space-y-3 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#7a3f2d]">
                Photo
              </p>
              <p className="text-xl font-black leading-tight text-[#322219]">
                Process evidence
              </p>
            </div>
          </div>

          <div className="absolute right-0 top-0 w-[78%] max-w-md rounded-[2rem] border border-[#dfc4af]/70 bg-[#fff8ef]/78 p-5 shadow-[0_24px_70px_rgba(102,61,36,0.12)] backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9a765f]">
              Today
            </p>
            <h2 className="mt-3 text-3xl font-black leading-none text-[#322219]">
              What stayed with you?
            </h2>
            <p className="mt-4 border-b border-[#cda98f] pb-12 text-lg font-semibold text-[#a68f7f]">
              I noticed...
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#3a281f] px-3 py-1 text-xs font-bold text-[#fff6ea]">
                Critical Thinking
              </span>
              <span className="rounded-full bg-[#ffe5cf] px-3 py-1 text-xs font-bold text-[#8f3f2b]">
                Private
              </span>
            </div>
          </div>

          <div className="absolute bottom-8 left-4 right-4 grid gap-3 sm:left-24 sm:right-0 sm:grid-cols-3">
            {sampleMoments.map((moment, index) => (
              <div key={moment.label} className={`landing-note ${index === 1 ? "sm:translate-y-8" : ""}`}>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#9a765f]">
                  {moment.label}
                </p>
                <h3 className="mt-2 text-lg font-black text-[#322219]">{moment.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#735846]">{moment.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
