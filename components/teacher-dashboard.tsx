"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeToTeacherReflections } from "@/lib/reflections";
import type { Reflection } from "@/types/reflection";

function formatDate(reflection: Reflection) {
  const date = reflection.createdAt?.toDate();
  if (!date) return "Just now";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(date);
}

export function TeacherDashboard() {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    return subscribeToTeacherReflections(
      setReflections,
      currentError => setError(currentError.message)
    );
  }, []);

  const studentCount = useMemo(
    () => new Set(reflections.map(reflection => reflection.studentEmail)).size,
    [reflections]
  );

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-moss p-5 text-white shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
          Teacher dashboard
        </p>
        <h1 className="mt-3 text-3xl font-bold">Shared reflections</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/74">
          A simple view of reflections students have chosen to share. Private
          entries remain outside this dashboard.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-white/75 p-5 shadow-soft">
          <p className="text-sm font-semibold text-ink/58">Reflections</p>
          <p className="mt-2 text-3xl font-bold text-ink">{reflections.length}</p>
        </div>
        <div className="rounded-3xl bg-white/75 p-5 shadow-soft">
          <p className="text-sm font-semibold text-ink/58">Students</p>
          <p className="mt-2 text-3xl font-bold text-ink">{studentCount}</p>
        </div>
      </div>

      <section className="rounded-3xl border border-white/80 bg-white/70 p-5 shadow-soft">
        <h2 className="text-2xl font-bold text-ink">Recent shares</h2>
        {error ? (
          <div className="mt-5 rounded-2xl bg-oat p-4 text-sm leading-6 text-clay">
            {error}
          </div>
        ) : null}
        <div className="mt-5 space-y-3">
          {reflections.length === 0 && !error ? (
            <div className="rounded-2xl border border-dashed border-ink/15 bg-mist p-6 text-sm leading-6 text-ink/62">
              Nothing has been shared yet.
            </div>
          ) : null}
          {reflections.map(reflection => (
            <article key={reflection.id} className="rounded-2xl bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-ink">{reflection.title}</h3>
                  <p className="mt-1 text-sm text-ink/58">
                    {reflection.studentName} / {formatDate(reflection)}
                  </p>
                </div>
                <span className="rounded-full bg-skywash px-3 py-1 text-xs font-semibold text-moss">
                  {reflection.competency}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink/70">
                {reflection.body}
              </p>
              {reflection.images?.length ? (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                        alt="Shared reflection upload"
                        className="h-24 w-full object-cover"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
