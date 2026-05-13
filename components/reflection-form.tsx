"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useUiMode } from "@/components/ui-mode";
import { createReflection } from "@/lib/reflections";
import { uploadReflectionImages } from "@/lib/storage";
import type { ReflectionVisibility } from "@/types/reflection";

const categories = ["Class learning", "Project work", "CCA", "Service", "Personal growth"];
const competencies = [
  "Critical Thinking",
  "Adaptive Thinking",
  "Inventive Thinking",
  "Collaboration Skills",
  "Communication Skills",
  "Information Skills",
  "Civic Literacy",
  "Global Literacy",
  "Cross-Cultural Literacy"
];

const MAX_IMAGES = 5;

type SelectedImage = {
  file: File;
  previewUrl: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

function buildReflectionTitle(momentText: string) {
  const trimmed = momentText.trim();
  if (!trimmed) return "Captured moment";
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

  const [step, setStep] = useState(1);
  const [momentText, setMomentText] = useState("");
  const [elaborationText, setElaborationText] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [competency, setCompetency] = useState(competencies[0]);
  const [visibility, setVisibility] = useState<ReflectionVisibility>("private");
  const [files, setFiles] = useState<SelectedImage[]>([]);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState("");
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);

  const canContinueStep1 = momentText.trim().length > 0 || files.length > 0;
  const canSave = canContinueStep1 && Boolean(competency) && Boolean(category);

  useEffect(() => {
    return () => {
      files.forEach(image => URL.revokeObjectURL(image.previewUrl));
    };
  }, [files]);

  function replaceFiles(next: SelectedImage[]) {
    files.forEach(image => URL.revokeObjectURL(image.previewUrl));
    setFiles(next);
  }

  function resetFlow() {
    setStep(1);
    setMomentText("");
    setElaborationText("");
    setCategory(categories[0]);
    setCompetency(competencies[0]);
    setVisibility("private");
    replaceFiles([]);
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

  function removeImage(index: number) {
    setFiles(current => {
      const copy = [...current];
      const removed = copy.splice(index, 1)[0];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return copy;
    });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !canSave) return;

    setStatus("saving");
    setError("");

    try {
      const images = files.length
        ? await uploadReflectionImages(
            user.uid,
            files.map(image => image.file)
          )
        : [];

      await createReflection({
        userId: user.uid,
        studentName: user.displayName ?? "Student",
        studentEmail: user.email ?? "",
        title: buildReflectionTitle(momentText),
        body: buildReflectionBody(momentText, elaborationText),
        category,
        competency,
        visibility,
        images
      });

      setStatus("saved");
    } catch {
      setStatus("error");
      setError("Could not save this moment. Please try again.");
    }
  }

  const stepLabel = useMemo(() => `Step ${step} of 4`, [step]);
  const stepCardClass = useMemo(() => {
    if (isStudio) {
      if (step === 1) return "studio-step-capture";
      if (step === 2) return "studio-step-meaning";
      if (step === 3) return "studio-step-growth";
      return "studio-step-visibility";
    }
    if (step === 1) return "border-orange-200/80 bg-orange-50/85";
    if (step === 2) return "border-amber-200/80 bg-amber-50/85";
    if (step === 3) return "border-sky-200/80 bg-sky-50/85";
    return "border-violet-200/80 bg-violet-50/85";
  }, [isStudio, step]);

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

  return (
    <form
      onSubmit={handleSave}
      className={`${isStudio ? "studio-capture-card" : "rounded-3xl border p-4 shadow-soft backdrop-blur sm:p-5"} ${stepCardClass}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className={isStudio ? "studio-kicker" : "text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"}>
          {stepLabel}
        </p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map(point => (
            <span
              key={point}
              className={`h-1.5 w-7 rounded-full ${
                point <= step ? "bg-blue-600" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>

      {status === "saved" ? (
        <div className="space-y-4">
          <h2 className="display-title">Saved to timeline</h2>
          <p className="text-sm leading-6 text-slate-600">
            Nice one. Your moment is now part of your growth story.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href="/timeline"
              className="btn-primary grid place-items-center"
            >
              View timeline
            </Link>
            <button
              type="button"
              onClick={resetFlow}
              className="btn-secondary"
            >
              Add another moment
            </button>
          </div>
        </div>
      ) : (
        <>
          {step === 1 ? (
            <div className="space-y-4">
              <div className={isStudio ? "studio-prompt-block" : ""}>
                <h2 className="display-title">
                  What stayed with you today?
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  What's one moment you keep thinking about?
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  What happened? What did you notice, feel, try, or struggle with?
                </p>
              </div>

              <label className="block">
                <textarea
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
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="btn-secondary"
                  >
                    Take Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => libraryInputRef.current?.click()}
                    className="btn-secondary"
                  >
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
                onClick={() => setStep(2)}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-45"
              >
                Continue
              </button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className={isStudio ? "studio-prompt-block" : ""}>
                <h2 className="display-title">
                  What made this important?
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Add why this moment matters to your growth.
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  You can write about what changed, what you learned about yourself, what you might try next.
                </p>
              </div>
              <textarea
                value={elaborationText}
                onChange={event => setElaborationText(event.target.value)}
                placeholder="This mattered because..."
                rows={5}
                className={textAreaClass}
              />
              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn-primary sm:col-span-1"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn-secondary"
                >
                  Skip for now
                </button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className={isStudio ? "studio-prompt-block" : ""}>
                <h2 className="display-title">
                  What kind of growth does this show?
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Pick the one that fits best, then choose context.
                </p>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-800">21CC growth tag</p>
                <div className={isStudio ? "studio-chip-cloud" : "grid gap-2 sm:grid-cols-2"}>
                  {competencies.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCompetency(item)}
                      className={chipClass(competency === item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-800">Context</p>
                <div className={isStudio ? "studio-chip-cloud compact" : "grid gap-2 sm:grid-cols-2"}>
                  {categories.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategory(item)}
                      className={chipClass(category === item, "teal")}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="btn-primary"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-secondary"
                >
                  Back
                </button>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <div className={isStudio ? "studio-prompt-block" : ""}>
                <h2 className="display-title">Who should see this?</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Sharing with teachers can help you get ideas and guidance. You can
                  keep this private if you prefer.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  [
                    "private",
                    "Private",
                    "Only you can see this entry."
                  ],
                  [
                    "shared_with_teacher",
                    "Share with teacher",
                    "Teachers can view this and give feedback."
                  ]
                ].map(([value, label, help]) => (
                  <label
                    key={value}
                    className={
                      isStudio
                        ? `studio-choice-row ${visibility === value ? "selected" : ""}`
                        : `flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 ${
                            visibility === value
                              ? "border-blue-400 bg-blue-50"
                              : "border-slate-200 bg-white"
                          }`
                    }
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={value}
                      checked={visibility === value}
                      onChange={event =>
                        setVisibility(event.target.value as ReflectionVisibility)
                      }
                      className="mt-1 size-4 accent-blue-600"
                    />
                    <span>
                      <span
                        className={`block text-sm font-semibold ${
                          visibility === value ? "text-blue-700" : "text-slate-700"
                        }`}
                      >
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
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn-secondary"
                >
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
    </form>
  );
}
