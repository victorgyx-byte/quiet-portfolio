"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
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

export function ReflectionForm() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [competency, setCompetency] = useState(competencies[5]);
  const [visibility, setVisibility] = useState<ReflectionVisibility>("private");
  const [files, setFiles] = useState<SelectedImage[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      files.forEach(image => URL.revokeObjectURL(image.previewUrl));
    };
  }, [files]);

  function replaceFiles(next: SelectedImage[]) {
    files.forEach(image => URL.revokeObjectURL(image.previewUrl));
    setFiles(next);
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

  function moveImage(from: number, to: number) {
    if (to < 0 || to >= files.length || from === to) return;
    setFiles(current => {
      const copy = [...current];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !title.trim() || !body.trim()) return;

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
        title: title.trim(),
        body: body.trim(),
        category,
        competency,
        visibility,
        images
      });
      setTitle("");
      setBody("");
      setVisibility("private");
      replaceFiles([]);
      setDragIndex(null);
      setStatus("saved");
    } catch {
      setStatus("error");
      setError("Image upload or save failed. Check Firebase settings and try again.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-white/80 bg-white/82 p-5 shadow-soft backdrop-blur"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-ink">New reflection</h2>
          <p className="mt-1 text-sm leading-6 text-ink/62">
            Capture one moment, decision, or piece of evidence.
          </p>
        </div>
        <span className="rounded-full bg-skywash px-3 py-1 text-xs font-semibold text-moss">
          Student owned
        </span>
      </div>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-ink">Title</span>
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="What changed in your learning?"
            className="mt-2 min-h-12 w-full rounded-2xl border border-ink/10 bg-mist px-4 text-base outline-none transition focus:border-moss focus:bg-white"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Context</span>
            <select
              value={category}
              onChange={event => setCategory(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-2xl border border-ink/10 bg-mist px-4 text-base outline-none transition focus:border-moss focus:bg-white"
            >
              {categories.map(item => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink">21CC focus</span>
            <select
              value={competency}
              onChange={event => setCompetency(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-2xl border border-ink/10 bg-mist px-4 text-base outline-none transition focus:border-moss focus:bg-white"
            >
              {competencies.map(item => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-ink">Reflection</span>
          <textarea
            value={body}
            onChange={event => setBody(event.target.value)}
            placeholder="What did you notice? What helped? What might you try next?"
            rows={5}
            className="mt-2 w-full resize-none rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-base leading-7 outline-none transition focus:border-moss focus:bg-white"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-ink">Images (optional)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="mt-2 min-h-12 w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-sm outline-none transition file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-moss"
          />
          <p className="mt-2 text-xs text-ink/58">Up to 3 images. Compressed before upload.</p>
        </label>

        {files.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {files.map((image, index) => (
              <div
                key={`${image.file.name}-${image.file.size}-${index}`}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={event => event.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null) moveImage(dragIndex, index);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={`overflow-hidden rounded-xl border ${
                  dragIndex === index ? "border-moss bg-skywash" : "border-ink/10 bg-white"
                }`}
              >
                <img
                  src={image.previewUrl}
                  alt={image.file.name}
                  className="h-24 w-full object-cover"
                />
                <div className="space-y-2 p-2">
                  <p
                    className="truncate text-xs font-semibold text-ink/72"
                    title={image.file.name}
                  >
                    {image.file.name}
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => moveImage(index, index - 1)}
                      disabled={index === 0}
                      className="rounded-lg border border-ink/10 px-2 py-1 text-xs font-semibold text-ink/65 disabled:opacity-40"
                    >
                      Left
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(index, index + 1)}
                      disabled={index === files.length - 1}
                      className="rounded-lg border border-ink/10 px-2 py-1 text-xs font-semibold text-ink/65 disabled:opacity-40"
                    >
                      Right
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="rounded-lg border border-clay/30 bg-oat px-2 py-1 text-xs font-semibold text-clay"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <fieldset>
          <legend className="text-sm font-semibold text-ink">Visibility</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {[
              ["private", "Private"],
              ["shared_with_teacher", "Share with teacher"]
            ].map(([value, label]) => (
              <label
                key={value}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 text-sm font-semibold transition ${
                  visibility === value
                    ? "border-moss bg-skywash text-moss"
                    : "border-ink/10 bg-white/70 text-ink/70"
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={value}
                  checked={visibility === value}
                  onChange={event => setVisibility(event.target.value as ReflectionVisibility)}
                  className="size-4 accent-moss"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={status === "saving" || !title.trim() || !body.trim()}
          className="min-h-12 w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-moss disabled:cursor-not-allowed disabled:opacity-45"
        >
          {status === "saving" ? "Saving..." : "Save reflection"}
        </button>

        {status === "saved" ? (
          <p className="text-center text-sm font-semibold text-moss">Reflection saved.</p>
        ) : null}
        {status === "error" ? (
          <p className="text-center text-sm font-semibold text-clay">
            Something went wrong. Check Firebase settings and try again.
          </p>
        ) : null}
        {error ? <p className="text-center text-sm font-semibold text-clay">{error}</p> : null}
      </div>
    </form>
  );
}
