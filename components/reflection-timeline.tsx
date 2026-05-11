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
          <h2 className="text-xl font-bold text-ink sm:text-2xl">Timeline</h2>
          <p className="mt-1 text-sm text-ink/62">Your moments, newest first.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/60">
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
          <div className="rounded-2xl border border-dashed border-ink/15 bg-mist p-6 text-sm leading-6 text-ink/62">
            No reflections yet. Start with one small moment from this week.
          </div>
        ) : null}

        {reflections.map(reflection => (
          <article
            key={reflection.id}
            className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_8px_24px_rgba(35,50,58,0.06)]"
          >
            {reflection.images?.length ? (
              <div className="grid grid-cols-2 gap-[1px] bg-ink/10 sm:grid-cols-3">
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
                <span className="rounded-full bg-[#eef3ff] px-3 py-1 text-xs font-semibold text-[#395cc7]">
                  {reflection.competency}
                </span>
                <span className="rounded-full bg-[#fff3e9] px-3 py-1 text-xs font-semibold text-[#bc664f]">
                  {reflection.category}
                </span>
                <span className="rounded-full bg-[#f4f8fb] px-3 py-1 text-xs font-semibold text-ink/56">
                  {reflection.visibility === "private" ? "Private" : "Shared"}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-ink">{reflection.title}</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink/70">
                {reflection.body}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink/42">
                {formatDate(reflection)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
