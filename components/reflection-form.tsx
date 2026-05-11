"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
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

const MAX_IMAGES = 3;

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

  const [step, setStep] = useState(1);
  const [momentText, setMomentText] = useState("");
  const [elaborationText, setElaborationText] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [competency, setCompetency] = useState(competencies[0]);
  const [visibility, setVisibility] = useState<ReflectionVisibility>("private");
  const [files, setFiles] = useState<SelectedImage[]>([]);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState("");

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

    if (imageFiles.length > MAX_IMAGES) {
      setError(`You can upload up to ${MAX_IMAGES} images.`);
      const selected = imageFiles.slice(0, MAX_IMAGES).map(file => ({
        file,
        previewUrl: URL.createObjectURL(file)
      }));
      replaceFiles(selected);
      return;
    }

    setError("");
    const selected = imageFiles.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    replaceFiles(selected);
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

  return (
    <form
      onSubmit={handleSave}
      className="rounded-3xl border border-white/80 bg-white/88 p-4 shadow-soft backdrop-blur sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">
          {stepLabel}
        </p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map(point => (
            <span
              key={point}
              className={`h-1.5 w-7 rounded-full ${
                point <= step ? "bg-moss" : "bg-ink/14"
              }`}
            />
          ))}
        </div>
      </div>

      {status === "saved" ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-ink">Saved to timeline</h2>
          <p className="text-sm leading-6 text-ink/68">
            Your reflection has been captured successfully.
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
              <div>
                <h2 className="text-xl font-bold text-ink sm:text-2xl">
                  What stayed with you today?
                </h2>
                <p className="mt-1 text-sm leading-6 text-ink/62">
                  Just one moment, thought, or feeling.
                </p>
              </div>

              <label className="block">
                <textarea
                  value={momentText}
                  onChange={event => setMomentText(event.target.value)}
                  placeholder="Write a short moment..."
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-base leading-7 outline-none transition focus:border-moss focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-ink">Photo (optional)</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="mt-2 min-h-11 w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-sm outline-none transition file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-moss"
                />
              </label>

              {files.length ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {files.map((image, index) => (
                    <div key={`${image.file.name}-${image.file.size}-${index}`} className="rounded-xl border border-ink/10 bg-white p-2">
                      <img
                        src={image.previewUrl}
                        alt={image.file.name}
                        className="h-24 w-full rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="btn-tertiary mt-2 w-full border-clay/30 bg-oat text-clay"
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
                Save moment & continue
              </button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-ink sm:text-2xl">
                  What made this important?
                </h2>
                <p className="mt-1 text-sm leading-6 text-ink/62">
                  What did you notice, what helped, what can you do from here?
                </p>
              </div>
              <textarea
                value={elaborationText}
                onChange={event => setElaborationText(event.target.value)}
                placeholder="Write a short reflection..."
                rows={5}
                className="w-full resize-none rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-base leading-7 outline-none transition focus:border-moss focus:bg-white"
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
              <div>
                <h2 className="text-xl font-bold text-ink sm:text-2xl">
                  What kind of growth does this show?
                </h2>
                <p className="mt-1 text-sm leading-6 text-ink/62">
                  Choose one that feels closest, then pick context.
                </p>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-ink">21CC growth tag</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {competencies.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCompetency(item)}
                      className={`min-h-11 rounded-2xl border px-3 py-2 text-left text-sm font-semibold ${
                        competency === item
                          ? "border-moss bg-skywash text-moss"
                          : "border-ink/10 bg-white text-ink/72"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Context</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {categories.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategory(item)}
                      className={`min-h-11 rounded-2xl border px-3 py-2 text-left text-sm font-semibold ${
                        category === item
                          ? "border-moss bg-skywash text-moss"
                          : "border-ink/10 bg-white text-ink/72"
                      }`}
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
              <div>
                <h2 className="text-xl font-bold text-ink sm:text-2xl">Who should see this?</h2>
                <p className="mt-1 text-sm leading-6 text-ink/62">
                  Sharing with teachers can help you get feedback and guidance. You can
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
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 ${
                      visibility === value
                        ? "border-moss bg-skywash"
                        : "border-ink/10 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={value}
                      checked={visibility === value}
                      onChange={event =>
                        setVisibility(event.target.value as ReflectionVisibility)
                      }
                      className="mt-1 size-4 accent-moss"
                    />
                    <span>
                      <span
                        className={`block text-sm font-semibold ${
                          visibility === value ? "text-moss" : "text-ink/78"
                        }`}
                      >
                        {label}
                      </span>
                      <span className="block text-xs text-ink/58">{help}</span>
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
            <p className="mt-3 rounded-xl bg-oat px-3 py-2 text-sm font-semibold text-clay">
              Something went wrong while saving. Please try again.
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 rounded-xl bg-oat px-3 py-2 text-sm font-semibold text-clay">
              {error}
            </p>
          ) : null}
        </>
      )}
    </form>
  );
}
