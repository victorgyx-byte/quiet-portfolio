"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { createStudentNotification } from "@/lib/notifications";
import {
  closeActiveLessonCheckpoint,
  createLessonCheckpoint,
  endLessonReflectionSession,
  getActiveLessonCheckpoint,
  getLessonCheckpoints,
  setActiveLessonCheckpoint,
  startLessonReflectionSession,
  subscribeToActiveLessonReflectionSessions
} from "@/lib/reflection-sessions";
import {
  getReflectionCompetencies,
  getReflectionCompetencyLabel,
  getReflectionLessonTitle,
  getReflectionType,
  getReflectionTypeLabel
} from "@/lib/reflection-utils";
import { subscribeToReflectionStats } from "@/lib/reflection-stats";
import { addTeacherFeedback, subscribeToTeacherReflections } from "@/lib/reflections";
import type { ReflectionSession } from "@/types/reflection-session";
import type { ReflectionStat } from "@/types/reflection-stats";
import type { Reflection, TeacherFeedbackNote } from "@/types/reflection";

type TeacherTab = "live" | "review" | "trends" | "notifications";
const TEACHER_REVIEW_PAGE_SIZE = 10;

function formatDate(reflection: Reflection) {
  const date = reflection.createdAt?.toDate();
  if (!date) return "Just now";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatTime(reflection: Reflection) {
  const date = reflection.createdAt?.toDate();
  if (!date) return "Now";
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatFeedbackDate(note: TeacherFeedbackNote) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(note.createdAt));
}

function getStudentKey(reflection: Reflection) {
  return reflection.studentEmail || reflection.userId;
}

function getStatReflectionType(stat: ReflectionStat) {
  if (stat.reflectionType) return stat.reflectionType;
  if ((stat.category ?? "").toLowerCase() === "cca") return "cca" as const;
  return "general" as const;
}

function renderEvidence(reflection: Reflection) {
  if (!reflection.evidenceText && !reflection.evidenceFiles?.length) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-orange-200 bg-orange-50/70 p-3">
      <p className="text-sm font-semibold text-orange-950">Evidence</p>
      {reflection.evidenceText ? (
        <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
          {reflection.evidenceText}
        </p>
      ) : null}
      {reflection.evidenceFiles?.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {reflection.evidenceFiles.map(file =>
            file.kind === "image" ? (
              <a
                key={file.path}
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl border border-orange-100 bg-white p-2"
              >
                <img
                  src={file.url}
                  alt={file.name || "Evidence upload"}
                  className="mx-auto max-h-48 w-auto max-w-full rounded-xl object-contain"
                  loading="lazy"
                />
              </a>
            ) : (
              <div key={file.path} className="rounded-2xl border border-orange-100 bg-white p-3">
                <p className="mb-2 text-xs font-semibold text-slate-500">
                  {file.name || "Audio evidence"}
                </p>
                <audio controls src={file.url} className="w-full" />
              </div>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}

export function TeacherDashboard({ activeTab = "live" }: { activeTab?: TeacherTab }) {
  const { user } = useAuth();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [stats, setStats] = useState<ReflectionStat[]>([]);
  const [error, setError] = useState("");
  const [statsError, setStatsError] = useState("");
  const [studentFilter, setStudentFilter] = useState("all");
  const [competencyFilter, setCompetencyFilter] = useState("all");
  const [reviewVisibleCount, setReviewVisibleCount] = useState(TEACHER_REVIEW_PAGE_SIZE);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedPastLessonKey, setSelectedPastLessonKey] = useState("");
  const [activeLessonSessions, setActiveLessonSessions] = useState<ReflectionSession[]>([]);
  const [lessonTitleDraft, setLessonTitleDraft] = useState("");
  const [lessonSessionStatus, setLessonSessionStatus] = useState<
    "idle" | "starting" | "ending" | "error"
  >("idle");
  const [selectedLessonSessionId, setSelectedLessonSessionId] = useState("");
  const [selectedLiveId, setSelectedLiveId] = useState<string | null>(null);
  const [checkpointPromptDraft, setCheckpointPromptDraft] = useState("");
  const [checkpointHelperDraft, setCheckpointHelperDraft] = useState("");
  const [checkpointStatus, setCheckpointStatus] = useState<
    "idle" | "opening" | "closing" | "reopening" | "error"
  >("idle");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "saving" | "error">("idle");
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

  useEffect(() => {
    return subscribeToReflectionStats(
      setStats,
      currentError => setStatsError(currentError.message)
    );
  }, []);

  useEffect(() => {
    return subscribeToActiveLessonReflectionSessions(
      setActiveLessonSessions,
      currentError => setError(currentError.message)
    );
  }, []);

  const lessonReflections = useMemo(
    () =>
      reflections.filter(
        reflection =>
          getReflectionType(reflection) === "lesson" && reflection.visibility === "shared_with_teacher"
      ),
    [reflections]
  );

  const activeLessonSessionIds = useMemo(
    () => new Set(activeLessonSessions.map(session => session.id)),
    [activeLessonSessions]
  );

  const pastLessonGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        lessonTitle: string;
        latestTime: number;
        students: Set<string>;
        items: Reflection[];
      }
    >();

    lessonReflections
      .filter(reflection => !reflection.lessonSessionId || !activeLessonSessionIds.has(reflection.lessonSessionId))
      .forEach(reflection => {
        const lessonTitle = getReflectionLessonTitle(reflection) || "Untitled lesson";
        const key = reflection.lessonSessionId || `legacy-${lessonTitle}`;
        const current = map.get(key);
        const createdTime = reflection.createdAt?.toDate().getTime() ?? 0;
        map.set(key, {
          key,
          lessonTitle,
          latestTime: Math.max(current?.latestTime ?? 0, createdTime),
          students: new Set([...(current?.students ?? []), getStudentKey(reflection)]),
          items: [...(current?.items ?? []), reflection].sort(
            (a, b) =>
              (b.createdAt?.toDate().getTime() ?? 0) - (a.createdAt?.toDate().getTime() ?? 0)
          )
        });
      });

    return [...map.values()].sort((a, b) => b.latestTime - a.latestTime);
  }, [activeLessonSessionIds, lessonReflections]);

  const reviewSource = useMemo(
    () => reflections.filter(reflection => getReflectionType(reflection) !== "lesson"),
    [reflections]
  );

  const teacherOwnedActiveSession =
    activeLessonSessions.find(session => session.userId === user?.uid) ?? null;
  const selectedTeacherOwnedSession =
    activeLessonSessions.find(
      session => session.id === selectedLessonSessionId && session.userId === user?.uid
    ) ?? null;

  useEffect(() => {
    if (activeLessonSessions.length === 0) {
      setSelectedLessonSessionId("");
      return;
    }
    if (
      !selectedLessonSessionId ||
      !activeLessonSessions.some(session => session.id === selectedLessonSessionId)
    ) {
      setSelectedLessonSessionId(teacherOwnedActiveSession?.id ?? activeLessonSessions[0].id);
    }
  }, [activeLessonSessions, selectedLessonSessionId, teacherOwnedActiveSession?.id]);

  const selectedLessonSession =
    activeLessonSessions.find(session => session.id === selectedLessonSessionId) ?? null;
  const activeLessonCheckpoint = getActiveLessonCheckpoint(selectedLessonSession);
  const selectedLessonCheckpoints = getLessonCheckpoints(selectedLessonSession);

  const liveReflections = useMemo(
    () =>
      selectedLessonSessionId
        ? lessonReflections.filter(
            reflection => reflection.lessonSessionId === selectedLessonSessionId
          )
        : [],
    [lessonReflections, selectedLessonSessionId]
  );

  useEffect(() => {
    if (liveReflections.length === 0) {
      setSelectedLiveId(null);
      return;
    }
    if (!selectedLiveId || !liveReflections.some(reflection => reflection.id === selectedLiveId)) {
      setSelectedLiveId(liveReflections[0].id);
    }
  }, [liveReflections, selectedLiveId]);

  useEffect(() => {
    if (pastLessonGroups.length === 0) {
      setSelectedPastLessonKey("");
      return;
    }
    if (
      !selectedPastLessonKey ||
      !pastLessonGroups.some(group => group.key === selectedPastLessonKey)
    ) {
      setSelectedPastLessonKey(pastLessonGroups[0].key);
    }
  }, [pastLessonGroups, selectedPastLessonKey]);

  useEffect(() => {
    setFeedbackText("");
    setFeedbackStatus("idle");
  }, [selectedLiveId, expandedId, activeTab]);

  useEffect(() => {
    setReviewVisibleCount(TEACHER_REVIEW_PAGE_SIZE);
    setExpandedId(null);
    setFeedbackText("");
    setFeedbackStatus("idle");
  }, [competencyFilter, studentFilter]);

  const students = useMemo(() => {
    const map = new Map<string, { key: string; name: string; email: string; count: number }>();
    reviewSource.forEach(reflection => {
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
  }, [reviewSource]);

  const competencies = useMemo(
    () =>
      [...new Set(reviewSource.flatMap(reflection => getReflectionCompetencies(reflection)))].sort(),
    [reviewSource]
  );

  const baseStats = useMemo(() => stats.filter(stat => !stat.competencyTag), [stats]);

  const filteredReviewReflections = useMemo(
    () =>
      reviewSource.filter(reflection => {
        const studentMatch =
          studentFilter === "all" || getStudentKey(reflection) === studentFilter;
        const competencyMatch =
          competencyFilter === "all" ||
          getReflectionCompetencies(reflection).includes(competencyFilter);
        return studentMatch && competencyMatch;
      }),
    [competencyFilter, reviewSource, studentFilter]
  );

  const selectedPastLessonGroup =
    pastLessonGroups.find(group => group.key === selectedPastLessonKey) ?? null;

  const visibleReviewReflections = useMemo(
    () => filteredReviewReflections.slice(0, reviewVisibleCount),
    [filteredReviewReflections, reviewVisibleCount]
  );
  const hasMoreReviewReflections = reviewVisibleCount < filteredReviewReflections.length;

  const groupedReviewReflections = useMemo(() => {
    const map = new Map<string, { studentName: string; studentEmail: string; items: Reflection[] }>();
    visibleReviewReflections.forEach(reflection => {
      const key = getStudentKey(reflection);
      const current = map.get(key);
      map.set(key, {
        studentName: reflection.studentName || "Student",
        studentEmail: reflection.studentEmail || "",
        items: [...(current?.items ?? []), reflection]
      });
    });
    return [...map.entries()].map(([key, value]) => ({ key, ...value }));
  }, [visibleReviewReflections]);

  const competencyTrends = useMemo(
    () =>
      [...new Set(stats.map(stat => stat.competencyTag ?? stat.competency).filter(Boolean))]
        .map(competency => ({
          competency: competency as string,
          count: stats.filter(
            stat => (stat.competencyTag ?? stat.competency) === competency
          ).length
        }))
        .sort((a, b) => b.count - a.count),
    [stats]
  );

  const reflectionTypeTrends = useMemo(() => {
    const reflectionTypes = [...new Set(baseStats.map(getStatReflectionType))];
    return reflectionTypes
      .map(reflectionType => ({
        reflectionType,
        count: baseStats.filter(stat => getStatReflectionType(stat) === reflectionType).length
      }))
      .sort((a, b) => b.count - a.count);
  }, [baseStats]);

  const visibilityTrends = useMemo(() => {
    const shared = baseStats.filter(stat => stat.visibility === "shared_with_teacher").length;
    const privateCount = baseStats.filter(stat => stat.visibility === "private").length;
    return { shared, private: privateCount, total: shared + privateCount };
  }, [baseStats]);

  const maxTrendCount = Math.max(
    1,
    ...competencyTrends.map(item => item.count),
    ...reflectionTypeTrends.map(item => item.count)
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

  async function handleStartLessonStream() {
    if (!user?.uid || !user.email || !lessonTitleDraft.trim()) return;
    setLessonSessionStatus("starting");
    setError("");
    try {
      const sessionId = await startLessonReflectionSession({
        userId: user.uid,
        teacherName: user.displayName ?? "Teacher",
        teacherEmail: user.email,
        lessonTitle: lessonTitleDraft.trim()
      });
      setSelectedLessonSessionId(sessionId);
      setLessonTitleDraft("");
      setLessonSessionStatus("idle");
    } catch {
      setLessonSessionStatus("error");
      setError("Could not start the lesson stream. Please try again.");
    }
  }

  async function handleOpenCheckpoint() {
    const sessionToUpdate = selectedTeacherOwnedSession ?? teacherOwnedActiveSession;
    if (!sessionToUpdate || !checkpointPromptDraft.trim()) return;
    setCheckpointStatus("opening");
    setError("");
    try {
      await createLessonCheckpoint(sessionToUpdate.id, {
        prompt: checkpointPromptDraft,
        helperText: checkpointHelperDraft
      });
      setCheckpointPromptDraft("");
      setCheckpointHelperDraft("");
      setCheckpointStatus("idle");
    } catch {
      setCheckpointStatus("error");
      setError("Could not open the checkpoint prompt. Please try again.");
    }
  }

  async function handleCloseCheckpoint() {
    const sessionToUpdate = selectedTeacherOwnedSession ?? teacherOwnedActiveSession;
    if (!sessionToUpdate || !activeLessonCheckpoint) return;
    setCheckpointStatus("closing");
    setError("");
    try {
      await closeActiveLessonCheckpoint(sessionToUpdate.id);
      setCheckpointStatus("idle");
    } catch {
      setCheckpointStatus("error");
      setError("Could not close the checkpoint prompt. Please try again.");
    }
  }

  async function handleReopenCheckpoint(checkpointId: string) {
    const sessionToUpdate = selectedTeacherOwnedSession ?? teacherOwnedActiveSession;
    if (!sessionToUpdate) return;
    setCheckpointStatus("reopening");
    setError("");
    try {
      await setActiveLessonCheckpoint(sessionToUpdate.id, checkpointId);
      setCheckpointStatus("idle");
    } catch {
      setCheckpointStatus("error");
      setError("Could not reopen that checkpoint. Please try again.");
    }
  }

  async function handleEndLessonStream() {
    const sessionToEnd = selectedTeacherOwnedSession ?? teacherOwnedActiveSession;
    if (!sessionToEnd) return;
    setLessonSessionStatus("ending");
    setError("");
    try {
      await endLessonReflectionSession(sessionToEnd.id);
      setLessonSessionStatus("idle");
    } catch {
      setLessonSessionStatus("error");
      setError("Could not end the lesson stream. Please try again.");
    }
  }

  const liveStudentCount = new Set(liveReflections.map(getStudentKey)).size;

  return (
    <div className="space-y-5">
      <section className="glass-card rounded-3xl p-5 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          Teacher dashboard
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          {activeTab === "live"
            ? "Live lesson inbox"
            : activeTab === "review"
              ? "Review shared reflections"
              : activeTab === "trends"
                ? "Overall trend"
                : "Notification centre"}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          {activeTab === "live"
            ? "Use one desktop-friendly lesson stream at a time so you can scan student checkpoints and respond quickly during class."
            : activeTab === "review"
              ? "Review ended lesson streams, then browse general and CCA reflections when you want to read across students."
              : activeTab === "trends"
                ? "See anonymous class-wide patterns across reflection types, visibility, and 21CC tags."
                : "Send a gentle in-app reminder to students who open the app."}
        </p>
      </section>

      {activeTab === "live" ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
              <p className="text-xs font-semibold text-slate-500">Current lesson stream</p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {selectedLessonSession?.lessonTitle || teacherOwnedActiveSession?.lessonTitle || "No live lesson yet"}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
              <p className="text-xs font-semibold text-slate-500">Responses in stream</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{liveReflections.length}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
              <p className="text-xs font-semibold text-slate-500">Students in stream</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{liveStudentCount}</p>
            </div>
          </div>

          <section className="glass-card rounded-3xl p-5 shadow-soft">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700">
                  Active lesson stream
                  <select
                    value={selectedLessonSessionId}
                    onChange={event => setSelectedLessonSessionId(event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                    disabled={activeLessonSessions.length === 0}
                  >
                    {activeLessonSessions.length === 0 ? (
                      <option value="">No active lesson streams</option>
                    ) : null}
                    {activeLessonSessions.map(session => (
                      <option key={session.id} value={session.id}>
                        {session.lessonTitle} - {session.teacherName}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedTeacherOwnedSession || teacherOwnedActiveSession ? (
                  <button
                    type="button"
                    onClick={handleEndLessonStream}
                    disabled={lessonSessionStatus === "ending"}
                    className="btn-secondary w-full disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {lessonSessionStatus === "ending" ? "Ending stream..." : "End my lesson stream"}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      value={lessonTitleDraft}
                      onChange={event => {
                        setLessonTitleDraft(event.target.value);
                        setLessonSessionStatus("idle");
                      }}
                      placeholder="Start a stream, e.g. Sec 2 English: argumentative"
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleStartLessonStream}
                      disabled={lessonSessionStatus === "starting" || !lessonTitleDraft.trim()}
                      className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {lessonSessionStatus === "starting" ? "Starting stream..." : "Start lesson stream"}
                    </button>
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                Teachers start one live stream first, then open checkpoint prompts during the lesson. Students join the stream and respond to the current prompt.
              </div>
            </div>

            {selectedLessonSession ? (
              <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Current checkpoint prompt
                    </p>
                    {activeLessonCheckpoint ? (
                      <div className="mt-3 rounded-2xl bg-orange-50 px-4 py-3">
                        <p className="text-lg font-bold text-slate-900">
                          {activeLessonCheckpoint.prompt}
                        </p>
                        {activeLessonCheckpoint.helperText ? (
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {activeLessonCheckpoint.helperText}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500">
                        No checkpoint prompt is open. Students can join the stream, but they will wait here until you open a prompt.
                      </div>
                    )}

                    {selectedLessonCheckpoints.length > 0 ? (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Earlier prompts
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedLessonCheckpoints.map((checkpoint, index) => (
                            <button
                              key={checkpoint.id}
                              type="button"
                              onClick={() => handleReopenCheckpoint(checkpoint.id)}
                              disabled={
                                checkpointStatus === "reopening" ||
                                checkpoint.id === selectedLessonSession.activeCheckpointId ||
                                selectedLessonSession.userId !== user?.uid
                              }
                              className={`rounded-full px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${
                                checkpoint.id === selectedLessonSession.activeCheckpointId
                                  ? "bg-slate-900 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {index + 1}. {checkpoint.prompt.slice(0, 34)}
                              {checkpoint.prompt.length > 34 ? "..." : ""}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {selectedLessonSession.userId === user?.uid ? (
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-slate-700">
                        New prompt
                        <textarea
                          value={checkpointPromptDraft}
                          onChange={event => {
                            setCheckpointPromptDraft(event.target.value);
                            setCheckpointStatus("idle");
                          }}
                          rows={3}
                          placeholder="e.g. What did you notice about your planning today?"
                          className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 outline-none focus:border-blue-500"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-700">
                        Optional helper text
                        <textarea
                          value={checkpointHelperDraft}
                          onChange={event => {
                            setCheckpointHelperDraft(event.target.value);
                            setCheckpointStatus("idle");
                          }}
                          rows={2}
                          placeholder="Add a sentence to guide students, if needed."
                          className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 outline-none focus:border-blue-500"
                        />
                      </label>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                        <button
                          type="button"
                          onClick={handleOpenCheckpoint}
                          disabled={checkpointStatus === "opening" || !checkpointPromptDraft.trim()}
                          className="btn-primary disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {checkpointStatus === "opening" ? "Opening..." : "Open checkpoint"}
                        </button>
                        <button
                          type="button"
                          onClick={handleCloseCheckpoint}
                          disabled={checkpointStatus === "closing" || !activeLessonCheckpoint}
                          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {checkpointStatus === "closing" ? "Closing..." : "Close prompt"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500">
                      This stream was started by {selectedLessonSession.teacherName}. You can view responses, but only the stream owner can open or close prompts.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-700">
                {error}
              </div>
            ) : null}

            {activeLessonSessions.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-500">
                No active lesson streams yet. Start one above, and students will be able to join it from the Lesson reflection option.
              </div>
            ) : (
              <div className="mt-5 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {liveReflections.map(reflection => {
                  const isSelected = selectedLiveId === reflection.id;
                  return (
                    <article
                      key={reflection.id}
                      className={`overflow-hidden rounded-3xl border transition ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white shadow-soft"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedLiveId(current => (current === reflection.id ? null : reflection.id))
                        }
                        className="w-full p-4 text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className={`text-sm font-bold ${isSelected ? "text-white" : "text-slate-900"}`}>
                              {reflection.studentName || "Student"}
                            </p>
                            <p className={`text-xs ${isSelected ? "text-slate-200" : "text-slate-500"}`}>
                              {formatDate(reflection)} at {formatTime(reflection)}
                            </p>
                          </div>
                          {reflection.images?.length ? (
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                isSelected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {reflection.images.length} photo{reflection.images.length > 1 ? "s" : ""}
                            </span>
                          ) : null}
                        </div>
                        <p className={`mt-3 text-sm font-semibold ${isSelected ? "text-white" : "text-slate-800"}`}>
                          {reflection.title}
                        </p>
                        {reflection.lessonCheckpointPrompt ? (
                          <p
                            className={`mt-2 rounded-2xl px-3 py-2 text-xs font-semibold ${
                              isSelected ? "bg-white/15 text-white" : "bg-orange-50 text-orange-700"
                            }`}
                          >
                            Prompt: {reflection.lessonCheckpointPrompt}
                          </p>
                        ) : null}
                        <p
                          className={`mt-2 whitespace-pre-line text-sm leading-6 ${
                            isSelected ? "text-slate-100" : "text-slate-600"
                          }`}
                        >
                          {reflection.body}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              isSelected ? "bg-white/15 text-white" : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {getReflectionCompetencyLabel(reflection)}
                          </span>
                        </div>
                      </button>

                      {isSelected ? (
                        <div className="space-y-4 border-t border-white/10 bg-white px-4 py-4 text-slate-700">
                          {reflection.images?.length ? (
                            <div className="grid grid-cols-2 gap-2">
                              {reflection.images.map(image => (
                                <a key={image.path} href={image.url} target="_blank" rel="noreferrer">
                                  <img
                                    src={image.url}
                                    alt="Shared reflection upload"
                                    className="h-36 w-full rounded-2xl object-cover"
                                    loading="lazy"
                                  />
                                </a>
                              ))}
                            </div>
                          ) : null}

                          {renderEvidence(reflection)}

                          {(reflection.teacherFeedbackNotes ?? []).length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-slate-800">Feedback history</p>
                              {[...(reflection.teacherFeedbackNotes ?? [])]
                                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                                .map((note, index) => (
                                  <div
                                    key={`${note.createdAt}-${index}`}
                                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
                                  >
                                    <p className="text-sm leading-6 text-slate-700">{note.text}</p>
                                    <p className="mt-1 text-xs text-slate-400">
                                      {note.teacherName} / {formatFeedbackDate(note)}
                                    </p>
                                  </div>
                                ))}
                            </div>
                          ) : null}

                          <div className="space-y-3">
                            <label className="block">
                              <span className="text-sm font-semibold text-slate-700">Leave feedback</span>
                              <textarea
                                value={feedbackText}
                                onChange={event => setFeedbackText(event.target.value)}
                                rows={4}
                                placeholder="A short note, question, or next step..."
                                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 outline-none focus:border-blue-500"
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
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}

      {activeTab === "review" ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
              <p className="text-xs font-semibold text-slate-500">General / CCA items</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{reviewSource.length}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
              <p className="text-xs font-semibold text-slate-500">Past lesson streams</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{pastLessonGroups.length}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
              <p className="text-xs font-semibold text-slate-500">Feedback notes</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {[...reviewSource, ...lessonReflections].reduce(
                  (total, reflection) => total + (reflection.teacherFeedbackNotes?.length ?? 0),
                  0
                )}
              </p>
            </div>
          </div>

          <section className="glass-card rounded-3xl p-5 shadow-soft">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Past lesson streams
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Lesson review</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Ended lesson streams stay here so teachers can revisit checkpoint responses after class.
                </p>
              </div>

              <label className="block min-w-0 text-sm font-semibold text-slate-700 lg:w-80">
                Lesson
                <select
                  value={selectedPastLessonKey}
                  onChange={event => {
                    setSelectedPastLessonKey(event.target.value);
                    setExpandedId(null);
                    setFeedbackText("");
                    setFeedbackStatus("idle");
                  }}
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500"
                  disabled={pastLessonGroups.length === 0}
                >
                  {pastLessonGroups.length === 0 ? (
                    <option value="">No past lesson streams</option>
                  ) : null}
                  {pastLessonGroups.map(group => (
                    <option key={group.key} value={group.key}>
                      {group.lessonTitle} ({group.items.length})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {pastLessonGroups.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-500">
                No ended lesson streams yet. When a live lesson stream ends, its responses will appear here for slower review.
              </div>
            ) : null}

            {selectedPastLessonGroup ? (
              <div className="mt-5 space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold text-slate-500">Lesson</p>
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {selectedPastLessonGroup.lessonTitle}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold text-slate-500">Responses</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {selectedPastLessonGroup.items.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold text-slate-500">Students</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {selectedPastLessonGroup.students.size}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {selectedPastLessonGroup.items.map(reflection => {
                    const isExpanded = expandedId === reflection.id;
                    return (
                      <article
                        key={reflection.id}
                        className="overflow-hidden rounded-3xl border border-slate-200 bg-white"
                      >
                        {reflection.images?.length ? (
                          <div className="grid grid-cols-2 gap-[1px] bg-slate-200 sm:grid-cols-4">
                            {reflection.images.map(image => (
                              <a key={image.path} href={image.url} target="_blank" rel="noreferrer">
                                <img
                                  src={image.url}
                                  alt="Shared lesson reflection upload"
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
                            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                              Lesson
                            </span>
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              {getReflectionCompetencyLabel(reflection)}
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                              {formatDate(reflection)} at {formatTime(reflection)}
                            </span>
                          </div>
                          {reflection.lessonCheckpointPrompt ? (
                            <p className="mt-3 rounded-2xl bg-orange-50 px-3 py-2 text-sm font-semibold leading-6 text-orange-800">
                              Prompt: {reflection.lessonCheckpointPrompt}
                            </p>
                          ) : null}
                          <p className="mt-3 text-sm font-bold text-slate-900">
                            {reflection.studentName || "Student"}
                          </p>
                          <h3 className="mt-2 text-lg font-bold text-slate-900">{reflection.title}</h3>
                          <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                            {reflection.body}
                          </p>
                        </button>

                        {isExpanded ? (
                          <div className="space-y-4 border-t border-slate-200 bg-slate-50 p-4">
                            <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                              {reflection.body}
                            </p>

                            {renderEvidence(reflection)}

                            {(reflection.teacherFeedbackNotes ?? []).length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-sm font-semibold text-slate-800">Feedback history</p>
                                {[...(reflection.teacherFeedbackNotes ?? [])]
                                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                                  .map((note, index) => (
                                    <div
                                      key={`${note.createdAt}-${index}`}
                                      className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                                    >
                                      <p className="text-sm leading-6 text-slate-700">{note.text}</p>
                                      <p className="mt-1 text-xs text-slate-400">
                                        {note.teacherName} / {formatFeedbackDate(note)}
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
                                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-blue-500"
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
              </div>
            ) : null}
          </section>

          <section className="glass-card rounded-3xl p-5 shadow-soft">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                General and CCA
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Shared reflection review</h2>
            </div>
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

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span>
                Showing {Math.min(visibleReviewReflections.length, filteredReviewReflections.length)} of{" "}
                {filteredReviewReflections.length} matching reflections.
              </span>
              <span className="font-semibold">
                {TEACHER_REVIEW_PAGE_SIZE} at a time
              </span>
            </div>

            {error ? (
              <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="mt-5 space-y-3">
              {filteredReviewReflections.length === 0 && !error ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-500">
                  No shared review reflections match this view.
                </div>
              ) : null}

              {groupedReviewReflections.map(group => (
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
                                {getReflectionCompetencyLabel(reflection)}
                              </span>
                              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                                {getReflectionTypeLabel(getReflectionType(reflection))}
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

                              {renderEvidence(reflection)}

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
                                          {note.teacherName} / {formatFeedbackDate(note)}
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

              {hasMoreReviewReflections ? (
                <button
                  type="button"
                  onClick={() =>
                    setReviewVisibleCount(current => current + TEACHER_REVIEW_PAGE_SIZE)
                  }
                  className="btn-secondary w-full"
                >
                  Load 10 more
                </button>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      {activeTab === "trends" ? (
        <section className="glass-card rounded-3xl p-5 shadow-soft">
          {statsError ? (
            <div className="rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-700">
              {statsError}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">Total reflections</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{visibilityTrends.total}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">Shared</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{visibilityTrends.shared}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">Private counted</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{visibilityTrends.private}</p>
            </div>
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
              <h3 className="text-lg font-bold text-slate-900">Reflection type</h3>
              <div className="mt-4 space-y-3">
                {reflectionTypeTrends.length === 0 ? (
                  <p className="text-sm text-slate-500">No shared reflections yet.</p>
                ) : null}
                {reflectionTypeTrends.map(item => (
                  <div key={item.reflectionType}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-700">
                        {getReflectionTypeLabel(item.reflectionType)}
                      </p>
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
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
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
