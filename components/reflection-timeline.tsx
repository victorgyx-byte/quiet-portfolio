"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { subscribeToStudentReflections } from "@/lib/reflections";
import type { Reflection } from "@/types/reflection";

function formatDate(reflection: Reflection) {
  const date = reflection.createdAt?.toDate();
  if (!date) return "Just now";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

export function ReflectionTimeline() {
  const { user } = useAuth();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    return subscribeToStudentReflections(
      user.uid,
      setReflections,
      currentError => setError(currentError.message)
    );
  }, [user]);

  return (
    <section className="glass-card rounded-3xl p-4 shadow-soft sm:p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Timeline</h2>
          <p className="mt-1 text-sm text-slate-500">Your moments, newest first.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
          {reflections.length} saved
        </span>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl bg-oat p-4 text-sm leading-6 text-clay">
          {error}
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        {reflections.length === 0 && !error ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-500">
            No reflections yet. Start with one small moment from this week.
          </div>
        ) : null}

        {reflections.map(reflection => (
          <article
            key={reflection.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.07)]"
          >
            {reflection.images?.length ? (
              <div className="grid grid-cols-2 gap-[1px] bg-slate-200 sm:grid-cols-3">
                {reflection.images.map(image => (
                  <a
                    key={image.path}
                    href={image.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block bg-white"
                  >
                    <img
                      src={image.url}
                      alt="Reflection upload"
                      className="h-28 w-full object-cover"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            ) : null}
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {reflection.competency}
                </span>
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                  {reflection.category}
                </span>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                  {reflection.visibility === "private" ? "Private" : "Shared"}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-slate-900">{reflection.title}</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                {reflection.body}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                {formatDate(reflection)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
