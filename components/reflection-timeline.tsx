"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useUiMode } from "@/components/ui-mode";
import {
  addReflectionFollowUp,
  deleteReflection,
  fetchStudentReflectionsPage
} from "@/lib/reflections";
import type { Reflection } from "@/types/reflection";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

const PAGE_SIZE = 10;

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
  const { mode } = useUiMode();
  const isStudio = mode === "studio";
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData>>();
  const [expandedReflectionId, setExpandedReflectionId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteStatus, setNoteStatus] = useState<"idle" | "saving" | "error">("idle");
  const [noteError, setNoteError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState("");
  const [selectedMonthKey, setSelectedMonthKey] = useState("all");

  useEffect(() => {
    let active = true;
    if (!user) return;

    setLoading(true);
    setError("");
    setReflections([]);
    setCursor(undefined);
    setHasMore(false);

    fetchStudentReflectionsPage(user.uid, PAGE_SIZE)
      .then(result => {
        if (!active) return;
        setReflections(result.reflections);
        setCursor(result.cursor);
        setHasMore(result.hasMore);
      })
      .catch(currentError => {
        if (!active) return;
        setError(currentError.message);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!deleteSuccess) return;
    const timeout = window.setTimeout(() => setDeleteSuccess(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [deleteSuccess]);

  const expandedReflection =
    reflections.find(reflection => reflection.id === expandedReflectionId) ?? null;

  async function handleAddNote() {
    if (!expandedReflection || !noteText.trim()) return;
    setNoteStatus("saving");
    setNoteError("");
    try {
      await addReflectionFollowUp(expandedReflection.id, noteText);
      setNoteText("");
      setNoteStatus("idle");
    } catch {
      setNoteStatus("error");
      setNoteError("Could not save note. Try again.");
    }
  }

  async function handleLoadMore() {
    if (!user || !cursor || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await fetchStudentReflectionsPage(user.uid, PAGE_SIZE, cursor);
      setReflections(current => [...current, ...result.reflections]);
      setCursor(result.cursor);
      setHasMore(result.hasMore);
    } catch (currentError) {
      const message =
        currentError instanceof Error ? currentError.message : "Could not load more reflections.";
      setError(message);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleDeleteReflection(reflection: Reflection) {
    setDeletingId(reflection.id);
    setError("");
    setDeleteSuccess("");
    try {
      await deleteReflection(reflection);
      setReflections(current => current.filter(item => item.id !== reflection.id));
      if (expandedReflectionId === reflection.id) {
        setExpandedReflectionId(null);
      }
      setConfirmDeleteId(null);
      setDeleteSuccess("Reflection deleted.");
    } catch {
      setError("Could not delete this reflection. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const monthlyGroups = reflections.reduce<
    Array<{ label: string; key: string; items: Reflection[] }>
  >((groups, reflection) => {
    const date = reflection.createdAt?.toDate();
    const key = date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      : "recent";
    const label = date
      ? new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date)
      : "Recent";
    const existing = groups.find(group => group.key === key);
    if (existing) {
      existing.items.push(reflection);
      return groups;
    }
    groups.push({ key, label, items: [reflection] });
    return groups;
  }, []);
  const monthOptions = [
    { key: "all", label: "All months" },
    ...monthlyGroups.map(group => ({ key: group.key, label: group.label }))
  ];
  const visibleGroups =
    selectedMonthKey === "all"
      ? monthlyGroups
      : monthlyGroups.filter(group => group.key === selectedMonthKey);

  return (
    <section className={isStudio ? "studio-board studio-timeline" : "glass-card rounded-3xl p-4 shadow-soft sm:p-5"}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="display-title">Timeline</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review your entries over time and spot growth patterns.
          </p>
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
      {deleteSuccess ? (
        <div className="mt-5 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-700">
          {deleteSuccess}
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        <div className={isStudio ? "studio-filter-strip" : "rounded-xl border border-slate-200 bg-white p-3"}>
          <label className="block text-sm font-semibold text-slate-700">
            Month
            <select
              value={selectedMonthKey}
              onChange={event => setSelectedMonthKey(event.target.value)}
              className={isStudio ? "studio-select mt-2 min-h-11 w-full text-sm outline-none" : "mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500"}
            >
              {monthOptions.map(option => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-500">
            Loading your timeline...
          </div>
        ) : null}

        {reflections.length === 0 && !error && !loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-500">
            No reflections yet. Start with one small moment from this week.
          </div>
        ) : null}

        {!loading
          ? visibleGroups.map((group, groupIndex) => (
              <details
                key={group.key}
                open={groupIndex < 2}
                className={isStudio ? "studio-month-group" : "rounded-2xl border border-slate-200 bg-white p-3"}
              >
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <span>{group.label}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                      {group.items.length}
                    </span>
                  </div>
                </summary>
                <div className="mt-3 space-y-4">
                  {group.items.map(reflection => {
                    const isExpanded = expandedReflectionId === reflection.id;
                    return (
                      <article
                        key={reflection.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setExpandedReflectionId(current =>
                            current === reflection.id ? null : reflection.id
                          );
                          setNoteText("");
                          setNoteStatus("idle");
                          setNoteError("");
                        }}
                        onKeyDown={event => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setExpandedReflectionId(current =>
                              current === reflection.id ? null : reflection.id
                            );
                            setNoteText("");
                            setNoteStatus("idle");
                            setNoteError("");
                          }
                        }}
                        className={isStudio ? `studio-moment-card ${isExpanded ? "expanded" : ""}` : "w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_10px_26px_rgba(15,23,42,0.07)]"}
                      >
                        {reflection.images?.length ? (
                          <div className={isStudio ? "studio-moment-media" : "grid grid-cols-2 gap-[1px] bg-slate-200 sm:grid-cols-3"}>
                            {reflection.images.map(image => (
                              <div key={image.path} className="bg-white">
                                <img
                                  src={image.url}
                                  alt="Reflection upload"
                                  className={isStudio ? "h-36 w-full object-cover" : "h-28 w-full object-cover"}
                                  loading="lazy"
                                />
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <div className={isStudio ? "p-4 sm:p-5" : "p-4"}>
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

                          {isExpanded ? (
                            <div
                              className={isStudio ? "studio-moment-detail" : "mt-4 space-y-4 border-t border-slate-200 pt-4"}
                              onClick={event => event.stopPropagation()}
                            >
                              {reflection.images?.length ? (
                                <div className="space-y-3">
                                  <p className="text-sm font-semibold text-slate-800">Images</p>
                                  {reflection.images.map(image => (
                                    <a
                                      key={image.path}
                                      href={image.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={isStudio ? "studio-full-image" : "block rounded-2xl border border-slate-200 bg-slate-50 p-2"}
                                    >
                                      <img
                                        src={image.url}
                                        alt="Reflection upload"
                                        className="mx-auto max-h-[40vh] w-auto max-w-full rounded-xl object-contain"
                                        loading="lazy"
                                      />
                                    </a>
                                  ))}
                                </div>
                              ) : null}

                              <div className={isStudio ? "studio-follow-up-panel" : "space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"}>
                                <p className="text-sm font-semibold text-slate-800">
                                  Additional reflections
                                </p>
                                <div className="space-y-2">
                                  {(reflection.followUpNotes ?? []).length === 0 ? (
                                    <p className="text-sm text-slate-500">
                                      No follow-up reflections yet. Add a later thought, update, or
                                      shift in perspective.
                                    </p>
                                  ) : (
                                    [...(reflection.followUpNotes ?? [])]
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
                                    value={isExpanded ? noteText : ""}
                                    onChange={event => setNoteText(event.target.value)}
                                    rows={3}
                                    placeholder="Add an additional reflection..."
                                    className={isStudio ? "studio-open-input mt-2 w-full resize-none text-sm leading-6 outline-none" : "mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-blue-500"}
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

                              {(reflection.teacherFeedbackNotes ?? []).length > 0 ? (
                                <div className={isStudio ? "studio-follow-up-panel" : "space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-3"}>
                                  <p className="text-sm font-semibold text-blue-900">
                                    Teacher feedback
                                  </p>
                                  {[...(reflection.teacherFeedbackNotes ?? [])]
                                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                                    .map((note, index) => (
                                      <div
                                        key={`${note.createdAt}-${index}`}
                                        className="rounded-xl border border-blue-100 bg-white px-3 py-2"
                                      >
                                        <p className="text-sm leading-6 text-slate-700">{note.text}</p>
                                        <p className="mt-1 text-xs text-slate-400">
                                          {note.teacherName} /{" "}
                                          {new Intl.DateTimeFormat("en", {
                                            month: "short",
                                            day: "numeric",
                                            hour: "numeric",
                                            minute: "2-digit"
                                          }).format(new Date(note.createdAt))}
                                        </p>
                                      </div>
                                    ))}
                                </div>
                              ) : null}

                              <div className={isStudio ? "studio-danger-panel" : "rounded-2xl border border-rose-200 bg-rose-50/70 p-3"}>
                                {confirmDeleteId === reflection.id ? (
                                  <div className="space-y-3">
                                    <p className="text-sm font-semibold text-rose-700">
                                      Are you sure you want to delete this reflection?
                                    </p>
                                    <p className="text-xs text-rose-600">
                                      This action cannot be undone.
                                    </p>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(null)}
                                        disabled={deletingId === reflection.id}
                                        className="btn-secondary disabled:cursor-not-allowed disabled:opacity-45"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteReflection(reflection)}
                                        disabled={deletingId === reflection.id}
                                        className="btn-tertiary border-rose-300 bg-rose-100 text-rose-700 disabled:cursor-not-allowed disabled:opacity-45"
                                      >
                                        {deletingId === reflection.id
                                          ? "Deleting..."
                                          : "Yes, delete reflection"}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(reflection.id)}
                                    className="btn-tertiary border-rose-300 bg-rose-100 text-rose-700"
                                  >
                                    Delete reflection
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </details>
            ))
          : null}

        {!loading && hasMore ? (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loadingMore ? "Loading more..." : "Load older reflections"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
