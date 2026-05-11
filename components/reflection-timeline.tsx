"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { addReflectionFollowUp, subscribeToStudentReflections } from "@/lib/reflections";
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
  const [selectedReflectionId, setSelectedReflectionId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteStatus, setNoteStatus] = useState<"idle" | "saving" | "error">("idle");
  const [noteError, setNoteError] = useState("");

  useEffect(() => {
    if (!user) return;

    return subscribeToStudentReflections(
      user.uid,
      setReflections,
      currentError => setError(currentError.message)
    );
  }, [user]);

  const selectedReflection =
    reflections.find(reflection => reflection.id === selectedReflectionId) ?? null;

  async function handleAddNote() {
    if (!selectedReflection || !noteText.trim()) return;
    setNoteStatus("saving");
    setNoteError("");
    try {
      await addReflectionFollowUp(selectedReflection.id, noteText);
      setNoteText("");
      setNoteStatus("idle");
    } catch {
      setNoteStatus("error");
      setNoteError("Could not save note. Try again.");
    }
  }

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
            role="button"
            tabIndex={0}
            onClick={() => {
              setSelectedReflectionId(reflection.id);
              setNoteText("");
              setNoteStatus("idle");
              setNoteError("");
            }}
            onKeyDown={event => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelectedReflectionId(reflection.id);
                setNoteText("");
                setNoteStatus("idle");
                setNoteError("");
              }
            }}
            className="w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_10px_26px_rgba(15,23,42,0.07)]"
          >
            {reflection.images?.length ? (
              <div className="grid grid-cols-2 gap-[1px] bg-slate-200 sm:grid-cols-3">
                {reflection.images.map(image => (
                  <div key={image.path} className="bg-white">
                    <img
                      src={image.url}
                      alt="Reflection upload"
                      className="h-28 w-full object-cover"
                      loading="lazy"
                    />
                  </div>
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

      {selectedReflection ? (
        <div
          className="fixed inset-0 z-40 bg-slate-900/25 p-0 sm:p-4"
          onClick={() => setSelectedReflectionId(null)}
        >
          <div
            className="mx-auto mt-14 flex h-[82vh] w-full max-w-3xl flex-col rounded-t-3xl border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.22)] sm:mt-10 sm:h-[78vh] sm:rounded-3xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-5">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {selectedReflection.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(selectedReflection)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReflectionId(null)}
                className="btn-secondary w-auto px-3"
              >
                Back
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-auto px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {selectedReflection.competency}
                </span>
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                  {selectedReflection.category}
                </span>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                  {selectedReflection.visibility === "private" ? "Private" : "Shared"}
                </span>
              </div>

              <p className="whitespace-pre-line text-base leading-7 text-slate-700">
                {selectedReflection.body}
              </p>

              {selectedReflection.images?.length ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-800">Images</p>
                  {selectedReflection.images.map(image => (
                    <a
                      key={image.path}
                      href={image.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-2xl border border-slate-200 bg-slate-50 p-2"
                    >
                      <img
                        src={image.url}
                        alt="Reflection upload"
                        className="mx-auto max-h-[42vh] w-auto max-w-full rounded-xl object-contain"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              ) : null}

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-800">Additional reflections</p>
                <div className="space-y-2">
                  {(selectedReflection.followUpNotes ?? []).length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No follow-up reflections yet. Add a later thought, update, or shift
                      in perspective.
                    </p>
                  ) : (
                    [...(selectedReflection.followUpNotes ?? [])]
                      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                      .map((note, index) => (
                        <div
                          key={`${note.createdAt}-${index}`}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                        >
                          <p className="text-sm leading-6 text-slate-700">{note.text}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {new Intl.DateTimeFormat("en", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit"
                            }).format(new Date(note.createdAt))}
                          </p>
                        </div>
                      ))
                  )}
                </div>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">
                    What else do you notice now?
                  </span>
                  <textarea
                    value={noteText}
                    onChange={event => setNoteText(event.target.value)}
                    rows={3}
                    placeholder="Add an additional reflection..."
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-blue-500"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={noteStatus === "saving" || !noteText.trim()}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {noteStatus === "saving"
                    ? "Saving reflection note..."
                    : "Add reflection note"}
                </button>

                {noteStatus === "error" ? (
                  <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                    {noteError}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
