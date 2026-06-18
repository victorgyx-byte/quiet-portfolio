"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { PromptChips } from "@/components/prompt-chips";
import { useUiMode } from "@/components/ui-mode";
import {
  COMPETENCY_OPTIONS,
  REFLECTION_TYPE_OPTIONS,
  getReflectionTypeLabel
} from "@/lib/reflection-utils";
import { createReflectionStat } from "@/lib/reflection-stats";
import {
  getActiveLessonCheckpoint,
  subscribeToActiveLessonReflectionSessions
} from "@/lib/reflection-sessions";
import { createReflection } from "@/lib/reflections";
import { uploadReflectionEvidenceFiles, uploadReflectionImages } from "@/lib/storage";
import type { ReflectionType, ReflectionVisibility } from "@/types/reflection";
import type { ReflectionSession } from "@/types/reflection-session";

const MAX_IMAGES = 5;
const MAX_EVIDENCE_FILES = 4;
const MAX_COMPETENCIES = 3;
const ATTENDING_CHIPS = [
  "I noticed...",
  "I felt...",
  "I tried...",
  "I struggled with...",
  "I was surprised by...",
  "I helped...",
  "I chose...",
  "I want to remember..."
];
const INTERPRETING_CHIPS = [
  "This stayed with me because...",
  "I realised...",
  "It showed me...",
  "Compared to before...",
  "I wonder if...",
  "Next time...",
  "I want to understand...",
  "This mattered because..."
];

type SelectedImage = {
  file: File;
  previewUrl: string;
};

type SelectedEvidenceFile = SelectedImage & {
  kind: "image" | "audio";
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

function buildReflectionTitle(momentText: string, reflectionType: ReflectionType, lessonTitle: string) {
  const trimmed = momentText.trim();
  if (!trimmed) {
    if (reflectionType === "lesson" && lessonTitle.trim()) {
      return lessonTitle.trim();
    }
    return "Captured moment";
  }
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}...` : trimmed;
}

function buildReflectionBody(momentText: string, elaborationText: string) {
  const moment = momentText.trim();
  const elaboration = elaborationText.trim();

  if (moment && elaboration) {
    return `Moment:\n${moment}\n\nWhy this mattered:\n${elaboration}`;
  }
  if (elaboration) return elaboration;
  if (moment) return moment;
  return "Image-based reflection.";
}

export function ReflectionForm() {
  const { user } = useAuth();
  const { mode } = useUiMode();
  const isStudio = mode === "studio";

  const [entryType, setEntryType] = useState<ReflectionType | null>(null);
  const [activeLessonSessions, setActiveLessonSessions] = useState<ReflectionSession[]>([]);
  const [selectedLessonSessionId, setSelectedLessonSessionId] = useState("");
  const [step, setStep] = useState(1);
  const [momentText, setMomentText] = useState("");
  const [elaborationText, setElaborationText] = useState("");
  const [competencies, setCompetencies] = useState<string[]>([]);
  const [evidenceText, setEvidenceText] = useState("");
  const [visibility, setVisibility] = useState<ReflectionVisibility>("private");
  const [files, setFiles] = useState<SelectedImage[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<SelectedEvidenceFile[]>([]);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState("");
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const evidenceInputRef = useRef<HTMLInputElement | null>(null);
  const momentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const elaborationTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    return subscribeToActiveLessonReflectionSessions(
      sessions => setActiveLessonSessions(sessions),
      currentError => setError(currentError.message)
    );
  }, []);

  useEffect(() => {
    return () => {
      files.forEach(image => URL.revokeObjectURL(image.previewUrl));
      evidenceFiles.forEach(file => URL.revokeObjectURL(file.previewUrl));
    };
  }, [evidenceFiles, files]);

  useEffect(() => {
    if (activeLessonSessions.length === 0) {
      setSelectedLessonSessionId("");
      return;
    }
    if (
      !selectedLessonSessionId ||
      !activeLessonSessions.some(session => session.id === selectedLessonSessionId)
    ) {
      setSelectedLessonSessionId(activeLessonSessions[0].id);
    }
  }, [activeLessonSessions, selectedLessonSessionId]);

  const selectedLessonSession =
    activeLessonSessions.find(session => session.id === selectedLessonSessionId) ?? null;
  const activeLessonCheckpoint = getActiveLessonCheckpoint(selectedLessonSession);
  const lessonTitle = selectedLessonSession?.lessonTitle ?? "";
  const canContinueStep1 = momentText.trim().length > 0 || files.length > 0;
  const canSave = canContinueStep1;

  useEffect(() => {
    if (entryType === "lesson" && step > 0 && (!selectedLessonSession || !activeLessonCheckpoint)) {
      setStep(0);
    }
  }, [activeLessonCheckpoint, entryType, selectedLessonSession, step]);

  function replaceFiles(next: SelectedImage[]) {
    files.forEach(image => URL.revokeObjectURL(image.previewUrl));
    setFiles(next);
  }

  function replaceEvidenceFiles(next: SelectedEvidenceFile[]) {
    evidenceFiles.forEach(file => URL.revokeObjectURL(file.previewUrl));
    setEvidenceFiles(next);
  }

  function resetFlow() {
    setEntryType(null);
    setStep(1);
    setMomentText("");
    setElaborationText("");
    setCompetencies([]);
    setEvidenceText("");
    setVisibility("private");
    replaceFiles([]);
    replaceEvidenceFiles([]);
    setStatus("idle");
    setError("");
  }

  function prepareAnotherLessonCheckpoint() {
    setEntryType("lesson");
    setStep(selectedLessonSession && activeLessonCheckpoint ? 1 : 0);
    setMomentText("");
    setElaborationText("");
    setCompetencies([]);
    setEvidenceText("");
    setVisibility("private");
    replaceFiles([]);
    replaceEvidenceFiles([]);
    setStatus("idle");
    setError("");
  }

  function beginReflectionType(type: ReflectionType) {
    setEntryType(type);
    setStep(type === "lesson" ? 0 : 1);
    setStatus("idle");
    setError("");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    const imageFiles = nextFiles.filter(file => file.type.startsWith("image/"));

    const remainingSlots = Math.max(0, MAX_IMAGES - files.length);
    if (remainingSlots === 0) {
      setError(`You can upload up to ${MAX_IMAGES} images.`);
      event.target.value = "";
      return;
    }

    if (imageFiles.length > remainingSlots) {
      setError(`You can upload up to ${MAX_IMAGES} images.`);
    } else {
      setError("");
    }

    const selected = imageFiles.slice(0, remainingSlots).map(file => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    setFiles(current => [...current, ...selected]);
    event.target.value = "";
  }

  function handleEvidenceFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    const acceptedFiles = nextFiles.filter(
      file => file.type.startsWith("image/") || file.type.startsWith("audio/")
    );

    const remainingSlots = Math.max(0, MAX_EVIDENCE_FILES - evidenceFiles.length);
    if (remainingSlots === 0) {
      setError(`You can add up to ${MAX_EVIDENCE_FILES} evidence files.`);
      event.target.value = "";
      return;
    }

    if (acceptedFiles.length > remainingSlots) {
      setError(`You can add up to ${MAX_EVIDENCE_FILES} evidence files.`);
    } else {
      setError("");
    }

    const selected = acceptedFiles.slice(0, remainingSlots).map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      kind: file.type.startsWith("audio/") ? ("audio" as const) : ("image" as const)
    }));
    setEvidenceFiles(current => [...current, ...selected]);
    event.target.value = "";
  }

  function removeImage(index: number) {
    setFiles(current => {
      const copy = [...current];
      const removed = copy.splice(index, 1)[0];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return copy;
    });
  }

  function removeEvidenceFile(index: number) {
    setEvidenceFiles(current => {
      const copy = [...current];
      const removed = copy.splice(index, 1)[0];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return copy;
    });
  }

  function insertChipText(
    chip: string,
    value: string,
    setValue: (next: string) => void,
    textarea: HTMLTextAreaElement | null
  ) {
    const start = textarea?.selectionStart;
    const end = textarea?.selectionEnd;
    const hasCursor = typeof start === "number" && typeof end === "number";
    const prefix = value.trim().length > 0 ? "\n" : "";

    if (!hasCursor || !textarea) {
      setValue(value ? `${value}${prefix}${chip}` : chip);
      return;
    }

    const before = value.slice(0, start);
    const after = value.slice(end);
    const separator = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
    const next = `${before}${separator}${chip}${after}`;
    setValue(next);
    window.requestAnimationFrame(() => {
      const nextCursor = before.length + separator.length + chip.length;
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function toggleCompetency(item: string) {
    setCompetencies(current => {
      if (current.includes(item)) {
        return current.filter(value => value !== item);
      }
      if (current.length >= MAX_COMPETENCIES) {
        return current;
      }
      return [...current, item];
    });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !entryType || !canSave) return;

    const normalizedLessonTitle = entryType === "lesson" ? lessonTitle : "";
    if (entryType === "lesson" && (!selectedLessonSessionId || !normalizedLessonTitle)) {
      setError("Choose the active lesson stream before saving lesson reflections.");
      return;
    }
    if (entryType === "lesson" && !activeLessonCheckpoint) {
      setError("Wait for your teacher to open a checkpoint prompt before saving.");
      return;
    }

    setStatus("saving");
    setError("");

    try {
      const images = files.length
        ? await uploadReflectionImages(
            user.uid,
            files.map(image => image.file)
          )
        : [];
      const uploadedEvidenceFiles = evidenceFiles.length
        ? await uploadReflectionEvidenceFiles(
            user.uid,
            evidenceFiles.map(file => file.file)
          )
        : [];

      const nextVisibility: ReflectionVisibility =
        entryType === "lesson" ? "shared_with_teacher" : visibility;

      await createReflection({
        userId: user.uid,
        studentName: user.displayName ?? "Student",
        studentEmail: user.email ?? "",
        title: buildReflectionTitle(momentText, entryType, normalizedLessonTitle),
        body: buildReflectionBody(momentText, elaborationText),
        reflectionType: entryType,
        competencies,
        evidenceText: evidenceText.trim(),
        evidenceFiles: uploadedEvidenceFiles,
        visibility: nextVisibility,
        images,
        ...(entryType === "lesson"
          ? {
              lessonSessionId: selectedLessonSessionId,
              lessonTitle: normalizedLessonTitle,
              lessonCheckpointId: activeLessonCheckpoint?.id,
              lessonCheckpointPrompt: activeLessonCheckpoint?.prompt,
              lessonCheckpointHelperText: activeLessonCheckpoint?.helperText
            }
          : {})
      });

      await createReflectionStat({
        reflectionType: entryType,
        visibility: nextVisibility,
        monthKey: new Date().toISOString().slice(0, 7)
      });

      await Promise.all(
        competencies.map(competencyTag =>
          createReflectionStat({
            reflectionType: entryType,
            competencyTag,
            visibility: nextVisibility,
            monthKey: new Date().toISOString().slice(0, 7)
          })
        )
      );

      setStatus("saved");
    } catch (currentError) {
      setStatus("error");
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Could not save this moment. Please try again."
      );
    }
  }

  const totalSteps = entryType === "lesson" ? 4 : 4;
  const displayStep = entryType === "lesson" ? step + 1 : step;
  const stepLabel = useMemo(
    () => `Step ${displayStep} of ${totalSteps}`,
    [displayStep, totalSteps]
  );
  const stepCardClass = useMemo(() => {
    if (isStudio) {
      if (!entryType || step <= 1) return "studio-step-capture";
      if (step === 2) return "studio-step-meaning";
      if (step === 3) return "studio-step-growth";
      return "studio-step-visibility";
    }
    if (!entryType || step <= 1) return "border-orange-200/80 bg-orange-50/85";
    if (step === 2) return "border-amber-200/80 bg-amber-50/85";
    if (step === 3) return "border-sky-200/80 bg-sky-50/85";
    return "border-violet-200/80 bg-violet-50/85";
  }, [entryType, isStudio, step]);

  const textAreaClass = isStudio
    ? "studio-open-input w-full resize-none text-base leading-8 outline-none"
    : "w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base leading-7 outline-none transition focus:border-blue-500 focus:bg-white";
  const chipClass = (selected: boolean, tone: "blue" | "teal" = "blue") =>
    isStudio
      ? `studio-chip ${selected ? "selected" : ""}`
      : `min-h-11 rounded-2xl border px-3 py-2 text-left text-sm font-semibold ${
          selected
            ? tone === "teal"
              ? "border-teal-400 bg-teal-50 text-teal-700"
              : "border-blue-400 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-white text-slate-600"
        }`;

  function goBackInFlow() {
    if (status === "saving") return;
    if (!entryType) return;
    if (entryType === "lesson" && step > 0) {
      setStep(current => current - 1);
      return;
    }
    if (entryType !== "lesson" && step > 1) {
      setStep(current => current - 1);
      return;
    }
    resetFlow();
  }

  return (
    <form
      onSubmit={handleSave}
      className={`${isStudio ? "studio-capture-card" : "rounded-3xl border p-4 shadow-soft backdrop-blur sm:p-5"} ${stepCardClass}`}
    >
      {entryType === "lesson" && selectedLessonSession ? (
        <div className="mb-4 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
            Lesson reflection session
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-teal-900">
                Reflecting in: {selectedLessonSession.lessonTitle}
              </p>
              <p className="text-xs text-teal-700">
                Started by {selectedLessonSession.teacherName}. Lesson checkpoints will be shared live with teachers.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {!entryType ? (
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <div className="mb-4 flex items-center justify-between">
            <p className={isStudio ? "studio-kicker" : "text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"}>
              Start reflection
            </p>
          </div>
          <div className={isStudio ? "studio-prompt-block" : ""}>
            <h2 className="display-title">What kind of checkpoint is this?</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Choose where this reflection belongs.
            </p>
          </div>

          <div className="mx-auto grid max-w-xl gap-2">
            {REFLECTION_TYPE_OPTIONS.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => beginReflectionType(option.id)}
                className={
                  isStudio
                    ? "studio-choice-row justify-center text-center"
                    : "flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center"
                }
              >
                <span className="block">
                  <span className="block text-sm font-semibold text-slate-800">{option.label}</span>
                  <span className="block text-xs text-slate-500">
                    {option.id === "general"
                      ? "A general moment from your day."
                      : option.id === "lesson"
                        ? "A lesson checkpoint that teachers can see live."
                        : "A checkpoint from co-curricular learning."}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {entryType === "lesson" || !entryType ? null : null}
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status !== "saved" ? (
                <button
                  type="button"
                  onClick={goBackInFlow}
                  disabled={status === "saving"}
                  className={
                    isStudio
                      ? "studio-small-pill disabled:cursor-not-allowed disabled:opacity-45"
                      : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-45"
                  }
                >
                  Back
                </button>
              ) : null}
              <p className={isStudio ? "studio-kicker" : "text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"}>
                {stepLabel}
              </p>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: totalSteps }, (_, index) => index + 1).map(point => (
                <span
                  key={point}
                  className={`h-1.5 w-7 rounded-full ${point <= displayStep ? "bg-blue-600" : "bg-slate-200"}`}
                />
              ))}
            </div>
          </div>

          {status === "saved" ? (
            <div className="space-y-4">
              <h2 className="display-title">Saved to timeline</h2>
              <p className="text-sm leading-6 text-slate-600">
                {entryType === "lesson"
                  ? "Checkpoint saved and visible to your teacher. Keep adding more if the lesson continues."
                  : "Nice one. Your moment is now part of your growth story."}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Link href="/timeline" className="btn-primary grid place-items-center">
                  View timeline
                </Link>
                <button
                  type="button"
                  onClick={entryType === "lesson" ? prepareAnotherLessonCheckpoint : resetFlow}
                  className="btn-secondary"
                >
                  {entryType === "lesson" ? "Add another checkpoint" : "Add another moment"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {entryType === "lesson" && step === 0 ? (
                <div className="space-y-4">
                  <div className={isStudio ? "studio-prompt-block" : ""}>
                    <h2 className="display-title">Which lesson checkpoint are you joining?</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Choose the active lesson your teacher has started, then answer the open checkpoint prompt.
                    </p>
                  </div>
                  {activeLessonSessions.length > 0 ? (
                    <>
                      <select
                        value={selectedLessonSessionId}
                        onChange={event => setSelectedLessonSessionId(event.target.value)}
                        className={isStudio ? "studio-open-input min-h-12 w-full text-base outline-none" : "min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base outline-none focus:border-blue-500"}
                      >
                        {activeLessonSessions.map(session => (
                          <option key={session.id} value={session.id}>
                            {session.lessonTitle} - {session.teacherName}
                          </option>
                        ))}
                      </select>
                      {selectedLessonSession ? (
                        <div className="space-y-2 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                          <p>
                            You’ll submit into {selectedLessonSession.lessonTitle}, started by {selectedLessonSession.teacherName}.
                          </p>
                          {activeLessonCheckpoint ? (
                            <div className="rounded-xl bg-white/70 px-3 py-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">
                                Open checkpoint
                              </p>
                              <p className="mt-1 font-semibold text-teal-950">
                                {activeLessonCheckpoint.prompt}
                              </p>
                              {activeLessonCheckpoint.helperText ? (
                                <p className="mt-1 text-xs leading-5 text-teal-700">
                                  {activeLessonCheckpoint.helperText}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <p className="rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold text-amber-700">
                              Your teacher has not opened a checkpoint prompt yet.
                            </p>
                          )}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                      There is no active lesson stream right now. Ask your teacher to start one, or capture this as a General reflection instead.
                    </div>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      disabled={!selectedLessonSessionId || !activeLessonCheckpoint}
                      className="btn-primary disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Continue
                    </button>
                    <button type="button" onClick={resetFlow} className="btn-secondary">
                      Back
                    </button>
                  </div>
                </div>
              ) : null}

              {((entryType !== "lesson" && step === 1) || (entryType === "lesson" && step === 1)) ? (
                <div className="space-y-4">
                  <div className={isStudio ? "studio-prompt-block" : ""}>
                    <h2 className="display-title">
                      {entryType === "lesson" && activeLessonCheckpoint
                        ? activeLessonCheckpoint.prompt
                        : "What is one moment that stayed with you?"}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {entryType === "lesson"
                        ? activeLessonCheckpoint?.helperText ||
                          `This checkpoint will be saved under ${lessonTitle}.`
                        : `Choose something from ${getReflectionTypeLabel(entryType).toLowerCase()} that you noticed, felt, tried, struggled with, or want to remember.`}
                    </p>
                  </div>

                  <PromptChips
                    chips={ATTENDING_CHIPS}
                    onSelect={chip =>
                      insertChipText(chip, momentText, setMomentText, momentTextareaRef.current)
                    }
                  />
                  <label className="block">
                    <textarea
                      ref={momentTextareaRef}
                      value={momentText}
                      onChange={event => setMomentText(event.target.value)}
                      placeholder="I noticed..."
                      rows={4}
                      className={textAreaClass}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">
                      Add photo if it helps you remember.
                    </span>
                    <div className={isStudio ? "mt-3 grid grid-cols-2 gap-2" : "mt-2 grid gap-2 sm:grid-cols-2"}>
                      <button type="button" onClick={() => cameraInputRef.current?.click()} className="btn-secondary">
                        Take Photo
                      </button>
                      <button type="button" onClick={() => libraryInputRef.current?.click()} className="btn-secondary">
                        Choose from Library
                      </button>
                    </div>
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <input
                      ref={libraryInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {files.length ? (
                    <div className={isStudio ? "studio-photo-strip" : "grid grid-cols-2 gap-2 sm:grid-cols-3"}>
                      {files.map((image, index) => (
                        <div key={`${image.file.name}-${image.file.size}-${index}`} className={isStudio ? "studio-photo-tile" : "rounded-xl border border-slate-200 bg-white p-2"}>
                          <img
                            src={image.previewUrl}
                            alt={image.file.name}
                            className={isStudio ? "h-32 w-full object-cover" : "h-24 w-full rounded-lg object-cover"}
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="btn-tertiary mt-2 w-full border-rose-200 bg-rose-50 text-rose-600"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    disabled={!canContinueStep1}
                    onClick={() => setStep(current => current + 1)}
                    className="btn-primary disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Continue
                  </button>
                </div>
              ) : null}

              {((entryType !== "lesson" && step === 2) || (entryType === "lesson" && step === 2)) ? (
                <div className="space-y-4">
                  <div className={isStudio ? "studio-prompt-block" : ""}>
                    <h2 className="display-title">Why do you think this stayed with you?</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      What might it show about you, others, or the situation?
                    </p>
                  </div>
                  <PromptChips
                    chips={INTERPRETING_CHIPS}
                    onSelect={chip =>
                      insertChipText(chip, elaborationText, setElaborationText, elaborationTextareaRef.current)
                    }
                  />
                  <textarea
                    ref={elaborationTextareaRef}
                    value={elaborationText}
                    onChange={event => setElaborationText(event.target.value)}
                    placeholder="This stayed with me because..."
                    rows={5}
                    className={textAreaClass}
                  />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <button type="button" onClick={() => setStep(current => current + 1)} className="btn-primary sm:col-span-1">
                      Continue
                    </button>
                    <button type="button" onClick={() => setStep(current => current - 1)} className="btn-secondary">
                      Back
                    </button>
                    <button type="button" onClick={() => setStep(current => current + 1)} className="btn-secondary">
                      Skip for now
                    </button>
                  </div>
                </div>
              ) : null}

              {((entryType !== "lesson" && step === 3) || (entryType === "lesson" && step === 3)) ? (
                <div className="space-y-4">
                  <div className={isStudio ? "studio-prompt-block" : ""}>
                    <h2 className="display-title">What kind of growth does this show?</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Optional 21CC tags. Choose up to {MAX_COMPETENCIES}.
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">21CC tags</p>
                    <span className="text-xs font-semibold text-slate-500">
                      {competencies.length}/{MAX_COMPETENCIES}
                    </span>
                  </div>
                  <div className={isStudio ? "studio-chip-cloud" : "grid gap-2 sm:grid-cols-2"}>
                    {COMPETENCY_OPTIONS.map(item => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleCompetency(item)}
                        className={chipClass(competencies.includes(item))}
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <div className={isStudio ? "studio-follow-up-panel" : "space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-3"}>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        What evidence shows that?
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Optional. Add a short note, photo, or audio file that helps show the growth you chose.
                      </p>
                    </div>
                    <textarea
                      value={evidenceText}
                      onChange={event => setEvidenceText(event.target.value)}
                      placeholder="The evidence is..."
                      rows={3}
                      className={textAreaClass}
                    />
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                      <button
                        type="button"
                        onClick={() => evidenceInputRef.current?.click()}
                        className="btn-secondary"
                      >
                        Add photo or audio
                      </button>
                      <span className="text-xs font-semibold text-slate-500">
                        {evidenceFiles.length}/{MAX_EVIDENCE_FILES}
                      </span>
                      <input
                        ref={evidenceInputRef}
                        type="file"
                        accept="image/*,audio/*"
                        multiple
                        onChange={handleEvidenceFileChange}
                        className="hidden"
                      />
                    </div>

                    {evidenceFiles.length ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {evidenceFiles.map((item, index) => (
                          <div
                            key={`${item.file.name}-${item.file.size}-${index}`}
                            className="rounded-2xl border border-slate-200 bg-white p-2"
                          >
                            {item.kind === "image" ? (
                              <img
                                src={item.previewUrl}
                                alt={item.file.name}
                                className="h-24 w-full rounded-xl object-cover"
                              />
                            ) : (
                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="mb-2 text-xs font-semibold text-slate-600">
                                  {item.file.name}
                                </p>
                                <audio controls src={item.previewUrl} className="w-full" />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeEvidenceFile(index)}
                              className="btn-tertiary mt-2 w-full border-rose-200 bg-rose-50 text-rose-600"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {entryType === "lesson" ? (
                    <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                      Lesson reflections are always visible to teachers so they can respond during class.
                    </div>
                  ) : null}

                  <div className="grid gap-2 sm:grid-cols-2">
                    {entryType === "lesson" ? (
                      <>
                        <button
                          type="submit"
                          disabled={status === "saving" || !canSave}
                          className="btn-primary disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {status === "saving" ? "Saving..." : "Save checkpoint"}
                        </button>
                        <button type="button" onClick={() => setStep(current => current - 1)} className="btn-secondary">
                          Back
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => setStep(4)} className="btn-primary">
                          Continue
                        </button>
                        <button type="button" onClick={() => setStep(2)} className="btn-secondary">
                          Back
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : null}

              {entryType !== "lesson" && step === 4 ? (
                <div className="space-y-4">
                  <div className={isStudio ? "studio-prompt-block" : ""}>
                    <h2 className="display-title">Who should see this?</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Sharing with teachers can help you get ideas and guidance. You can keep this private if you prefer.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {[
                      ["private", "Private", "Only you can see this entry."],
                      ["shared_with_teacher", "Share with teacher", "Teachers can view this and give feedback."]
                    ].map(([value, label, help]) => (
                      <label
                        key={value}
                        className={
                          isStudio
                            ? `studio-choice-row ${visibility === value ? "selected" : ""}`
                            : `flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 ${
                                visibility === value ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white"
                              }`
                        }
                      >
                        <input
                          type="radio"
                          name="visibility"
                          value={value}
                          checked={visibility === value}
                          onChange={event => setVisibility(event.target.value as ReflectionVisibility)}
                          className="mt-1 size-4 accent-blue-600"
                        />
                        <span>
                          <span className={`block text-sm font-semibold ${visibility === value ? "text-blue-700" : "text-slate-700"}`}>
                            {label}
                          </span>
                          <span className="block text-xs text-slate-500">{help}</span>
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="submit"
                      disabled={status === "saving" || !canSave}
                      className="btn-primary disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {status === "saving" ? "Saving..." : "Save moment"}
                    </button>
                    <button type="button" onClick={() => setStep(3)} className="btn-secondary">
                      Back
                    </button>
                  </div>
                </div>
              ) : null}

              {status === "error" ? (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                  Something went wrong while saving. Please try again.
                </p>
              ) : null}
              {error ? (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                  {error}
                </p>
              ) : null}
            </>
          )}
        </>
      )}
    </form>
  );
}
