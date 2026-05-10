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
    <section className="rounded-3xl border border-white/80 bg-white/64 p-5 shadow-soft backdrop-blur">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-ink">Timeline</h2>
          <p className="mt-1 text-sm text-ink/62">Your reflections in reverse order.</p>
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

      <div className="mt-5 space-y-3">
        {reflections.length === 0 && !error ? (
          <div className="rounded-2xl border border-dashed border-ink/15 bg-mist p-6 text-sm leading-6 text-ink/62">
            No reflections yet. Start with one small moment from this week.
          </div>
        ) : null}

        {reflections.map(reflection => (
          <article
            key={reflection.id}
            className="rounded-2xl border border-ink/8 bg-white p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-skywash px-3 py-1 text-xs font-semibold text-moss">
                {reflection.competency}
              </span>
              <span className="rounded-full bg-oat px-3 py-1 text-xs font-semibold text-clay">
                {reflection.category}
              </span>
              <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink/56">
                {reflection.visibility === "private" ? "Private" : "Shared"}
              </span>
            </div>
            <h3 className="mt-4 text-lg font-bold text-ink">{reflection.title}</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink/70">
              {reflection.body}
            </p>
            {reflection.images?.length ? (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {reflection.images.map(image => (
                  <a
                    key={image.path}
                    href={image.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-xl border border-ink/10"
                  >
                    <img
                      src={image.url}
                      alt="Reflection upload"
                      className="h-24 w-full object-cover"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            ) : null}
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-ink/42">
              {formatDate(reflection)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
