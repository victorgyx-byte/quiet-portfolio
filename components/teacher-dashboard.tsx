"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { createStudentNotification } from "@/lib/notifications";
import { addTeacherFeedback, subscribeToTeacherReflections } from "@/lib/reflections";
import type { Reflection } from "@/types/reflection";

type TeacherTab = "shared" | "trends" | "notifications";

function formatDate(reflection: Reflection) {
  const date = reflection.createdAt?.toDate();
  if (!date) return "Just now";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function getStudentKey(reflection: Reflection) {
  return reflection.studentEmail || reflection.userId;
}

export function TeacherDashboard() {
  const { user } = useAuth();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [error, setError] = useState("");
  const [studentFilter, setStudentFilter] = useState("all");
  const [competencyFilter, setCompetencyFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "saving" | "error">("idle");
  const [activeTab, setActiveTab] = useState<TeacherTab>("shared");
  const [notificationTitle, setNotificationTitle] = useState("A gentle reflection reminder");
  const [notificationMessage, setNotificationMessage] = useState(
    "Take two minutes today to capture one moment that stayed with you."
  );
  const [notificationStatus, setNotificationStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  useEffect(() => {
    return subscribeToTeacherReflections(
      setReflections,
      currentError => setError(currentError.message)
    );
  }, []);

  const students = useMemo(() => {
    const map = new Map<string, { key: string; name: string; email: string; count: number }>();
    reflections.forEach(reflection => {
      const key = getStudentKey(reflection);
      const current = map.get(key);
      map.set(key, {
        key,
        name: reflection.studentName || "Student",
        email: reflection.studentEmail || "",
        count: (current?.count ?? 0) + 1
      });
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [reflections]);

  const competencies = useMemo(
    () => [...new Set(reflections.map(reflection => reflection.competency))].sort(),
    [reflections]
  );

  const filteredReflections = useMemo(
    () =>
      reflections.filter(reflection => {
        const studentMatch =
          studentFilter === "all" || getStudentKey(reflection) === studentFilter;
        const competencyMatch =
          competencyFilter === "all" || reflection.competency === competencyFilter;
        return studentMatch && competencyMatch;
      }),
    [competencyFilter, reflections, studentFilter]
  );

  const groupedReflections = useMemo(() => {
    const map = new Map<string, { studentName: string; studentEmail: string; items: Reflection[] }>();
    filteredReflections.forEach(reflection => {
      const key = getStudentKey(reflection);
      const current = map.get(key);
      map.set(key, {
        studentName: reflection.studentName || "Student",
        studentEmail: reflection.studentEmail || "",
        items: [...(current?.items ?? []), reflection]
      });
    });
    return [...map.entries()].map(([key, value]) => ({ key, ...value }));
  }, [filteredReflections]);

  const competencyTrends = useMemo(
    () =>
      competencies
        .map(competency => ({
          competency,
          count: reflections.filter(reflection => reflection.competency === competency).length
        }))
        .sort((a, b) => b.count - a.count),
    [competencies, reflections]
  );

  const categoryTrends = useMemo(() => {
    const categories = [...new Set(reflections.map(reflection => reflection.category))];
    return categories
      .map(category => ({
        category,
        count: reflections.filter(reflection => reflection.category === category).length
      }))
      .sort((a, b) => b.count - a.count);
  }, [reflections]);

  const maxTrendCount = Math.max(
    1,
    ...competencyTrends.map(item => item.count),
    ...categoryTrends.map(item => item.count)
  );

  async function handleFeedback(reflection: Reflection) {
    if (!feedbackText.trim() || !user?.email) return;

    setFeedbackStatus("saving");
    try {
      await addTeacherFeedback(reflection.id, feedbackText, {
        name: user.displayName ?? "Teacher",
        email: user.email
      });
      setFeedbackText("");
      setFeedbackStatus("idle");
    } catch {
      setFeedbackStatus("error");
    }
  }

  async function handleSendNotification() {
    if (!user?.email || !notificationTitle.trim() || !notificationMessage.trim()) return;
    setNotificationStatus("sending");
    try {
      await createStudentNotification({
        title: notificationTitle.trim(),
        message: notificationMessage.trim(),
        target: "all",
        senderName: user.displayName ?? "Teacher",
        senderEmail: user.email
      });
      setNotificationStatus("sent");
    } catch {
      setNotificationStatus("error");
    }
  }

  return (
    <div className="space-y-5">
      <section className="glass-card rounded-3xl p-5 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          Teacher dashboard
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Shared learning moments</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          See only reflections students chose to share, then leave short feedback that
          appears in their timeline.
        </p>
      </section>

      <div className="grid gap-2 rounded-3xl border border-slate-200 bg-white/80 p-2 shadow-soft sm:grid-cols-3">
        {[
          ["shared", "Student reflections"],
          ["trends", "Overall trend"],
          ["notifications", "Notification centre"]
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id as TeacherTab)}
            className={`min-h-11 rounded-2xl px-3 py-2 text-sm font-bold ${
              activeTab === id ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold text-slate-500">Shared</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{reflections.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold text-slate-500">Students</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{students.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold text-slate-500">Feedback</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {reflections.reduce(
              (total, reflection) => total + (reflection.teacherFeedbackNotes?.length ?? 0),
              0
            )}
          </p>
        </div>
      </div>

      {activeTab === "shared" ? (
      <section className="glass-card rounded-3xl p-5 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Student
            <select
              value={studentFilter}
              onChange={event => setStudentFilter(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">All students</option>
              {students.map(student => (
                <option key={student.key} value={student.key}>
                  {student.name} ({student.count})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Growth tag
            <select
              value={competencyFilter}
              onChange={event => setCompetencyFilter(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">All growth tags</option>
              {competencies.map(competency => (
                <option key={competency} value={competency}>
                  {competency}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {filteredReflections.length === 0 && !error ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-500">
              No shared reflections match this view.
            </div>
          ) : null}

          {groupedReflections.map(group => (
            <details key={group.key} open className="rounded-2xl border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{group.studentName}</p>
                    <p className="text-xs text-slate-500">{group.studentEmail}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                    {group.items.length}
                  </span>
                </div>
              </summary>

              <div className="mt-3 space-y-3">
                {group.items.map(reflection => {
                  const isExpanded = expandedId === reflection.id;
                  return (
                    <article
                      key={reflection.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                    >
                      {reflection.images?.length ? (
                        <div className="grid grid-cols-2 gap-[1px] bg-slate-200 sm:grid-cols-4">
                          {reflection.images.map(image => (
                            <a key={image.path} href={image.url} target="_blank" rel="noreferrer">
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
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedId(current => (current === reflection.id ? null : reflection.id));
                          setFeedbackText("");
                          setFeedbackStatus("idle");
                        }}
                        className="w-full p-4 text-left"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {reflection.competency}
                          </span>
                          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                            {reflection.category}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                            {formatDate(reflection)}
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-bold text-slate-900">{reflection.title}</h3>
                        <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                          {reflection.body}
                        </p>
                      </button>

                      {isExpanded ? (
                        <div className="space-y-4 border-t border-slate-200 bg-white p-4">
                          <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                            {reflection.body}
                          </p>

                          {(reflection.teacherFeedbackNotes ?? []).length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-slate-800">Feedback history</p>
                              {[...(reflection.teacherFeedbackNotes ?? [])]
                                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                                .map((note, index) => (
                                  <div
                                    key={`${note.createdAt}-${index}`}
                                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
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

                          <label className="block">
                            <span className="text-sm font-semibold text-slate-700">
                              Leave feedback
                            </span>
                            <textarea
                              value={isExpanded ? feedbackText : ""}
                              onChange={event => setFeedbackText(event.target.value)}
                              rows={3}
                              placeholder="A short note, question, or next step..."
                              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-500"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleFeedback(reflection)}
                            disabled={!feedbackText.trim() || feedbackStatus === "saving"}
                            className="btn-primary disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {feedbackStatus === "saving" ? "Saving feedback..." : "Send feedback"}
                          </button>
                          {feedbackStatus === "error" ? (
                            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                              Could not save feedback. Please try again.
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </section>
      ) : null}

      {activeTab === "trends" ? (
        <section className="glass-card rounded-3xl p-5 shadow-soft">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Overall trend</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              This view uses only reflections students made visible to teachers. Private
              reflection text and images should stay private; a future aggregate-only
              collection can count private entries without exposing incidents.
            </p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-lg font-bold text-slate-900">21CC areas</h3>
              <div className="mt-4 space-y-3">
                {competencyTrends.length === 0 ? (
                  <p className="text-sm text-slate-500">No shared reflections yet.</p>
                ) : null}
                {competencyTrends.map(item => (
                  <div key={item.competency}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-700">{item.competency}</p>
                      <p className="text-xs font-bold text-slate-500">{item.count}</p>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${(item.count / maxTrendCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-lg font-bold text-slate-900">Reflection context</h3>
              <div className="mt-4 space-y-3">
                {categoryTrends.length === 0 ? (
                  <p className="text-sm text-slate-500">No shared reflections yet.</p>
                ) : null}
                {categoryTrends.map(item => (
                  <div key={item.category}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-700">{item.category}</p>
                      <p className="text-xs font-bold text-slate-500">{item.count}</p>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-teal-600"
                        style={{ width: `${(item.count / maxTrendCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "notifications" ? (
        <section className="glass-card rounded-3xl p-5 shadow-soft">
          <h2 className="text-2xl font-bold text-slate-900">Notification centre</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Send a gentle in-app reminder to students. For now, reminders go to all
            students who open the app.
          </p>

          <div className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <label className="block text-sm font-semibold text-slate-700">
              Title
              <input
                value={notificationTitle}
                onChange={event => {
                  setNotificationTitle(event.target.value);
                  setNotificationStatus("idle");
                }}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Message
              <textarea
                value={notificationMessage}
                onChange={event => {
                  setNotificationMessage(event.target.value);
                  setNotificationStatus("idle");
                }}
                rows={4}
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-500"
              />
            </label>

            <button
              type="button"
              onClick={handleSendNotification}
              disabled={
                notificationStatus === "sending" ||
                !notificationTitle.trim() ||
                !notificationMessage.trim()
              }
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-45"
            >
              {notificationStatus === "sending" ? "Sending reminder..." : "Send reminder"}
            </button>

            {notificationStatus === "sent" ? (
              <p className="rounded-xl bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700">
                Reminder sent.
              </p>
            ) : null}
            {notificationStatus === "error" ? (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                Could not send reminder. Please try again.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
