"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { subscribeToStudentReflections } from "@/lib/reflections";
import type { Reflection } from "@/types/reflection";

function formatDate(reflection: Reflection) {
  const date = reflection.createdAt?.toDate();
  if (!date) return "Recent";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function addPageIfNeeded(doc: { addPage: () => void }, cursor: number, needed = 18) {
  const limit = 282;
  if (cursor + needed > limit) {
    doc.addPage();
    return 20;
  }
  return cursor;
}

async function imageUrlToJpegDataUrl(url: string) {
  try {
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) return "";
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("FileReader failed."));
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

function getImageSize(dataUrl: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height
      });
    image.onerror = () => reject(new Error("Could not read image size."));
    image.src = dataUrl;
  });
}

export function PortfolioBuilder() {
  const { user } = useAuth();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [title, setTitle] = useState("My Learning Portfolio");
  const [growthStatement, setGrowthStatement] = useState(
    "Over this period, I became more intentional about my learning choices and reflected on how I respond to feedback, collaboration, and challenges."
  );
  const [exportHint, setExportHint] = useState("");

  useEffect(() => {
    if (!user) return;
    return subscribeToStudentReflections(user.uid, setReflections, () => undefined);
  }, [user]);

  const selectedReflections = useMemo(
    () => reflections.filter(reflection => selectedIds.includes(reflection.id)),
    [reflections, selectedIds]
  );

  function toggleReflection(id: string) {
    setSelectedIds(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id]
    );
  }

  async function exportToPdf() {
    if (selectedReflections.length === 0) return;
    setExportHint("");

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4"
      });

      const margin = 16;
      const width = 210 - margin * 2;
      const maxImageHeight = 72;
      let y = 20;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(title.trim() || "My Learning Portfolio", margin, y);
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(user?.displayName ?? "Student", margin, y);
      y += 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Growth Statement", margin, y);
      y += 7;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const growthLines = doc.splitTextToSize(
        growthStatement.trim() || "Growth statement",
        width
      );
      doc.text(growthLines, margin, y);
      y += growthLines.length * 6 + 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      y = addPageIfNeeded(doc, y, 16);
      doc.text("Selected Reflections", margin, y);
      y += 8;

      let skippedImageCount = 0;
      for (const reflection of selectedReflections) {
        y = addPageIfNeeded(doc, y, 36);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(reflection.title, margin, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(
          `${reflection.competency} | ${reflection.category} | ${formatDate(reflection)}`,
          margin,
          y
        );
        y += 6;

        const bodyLines = doc.splitTextToSize(reflection.body, width);
        doc.setFontSize(11);
        doc.text(bodyLines, margin, y);
        y += bodyLines.length * 5 + 4;

        for (const image of reflection.images ?? []) {
          y = addPageIfNeeded(doc, y, 40);
          const dataUrl = await imageUrlToJpegDataUrl(image.url);
          if (!dataUrl) {
            skippedImageCount += 1;
            continue;
          }
          const { width: sourceWidth, height: sourceHeight } = await getImageSize(dataUrl);
          const ratio = sourceHeight / sourceWidth;
          let renderWidth = width;
          let renderHeight = Math.max(24, renderWidth * ratio);
          if (renderHeight > maxImageHeight) {
            renderHeight = maxImageHeight;
            renderWidth = renderHeight / ratio;
          }
          const imageX = margin + (width - renderWidth) / 2;
          y = addPageIfNeeded(doc, y, renderHeight + 6);
          doc.addImage(
            dataUrl,
            "JPEG",
            imageX,
            y,
            renderWidth,
            renderHeight,
            undefined,
            "FAST"
          );
          y += renderHeight + 4;
        }

        y += 4;
      }

      doc.save("portfolio.pdf");
      if (skippedImageCount > 0) {
        setExportHint(
          `Downloaded portfolio.pdf. ${skippedImageCount} image(s) could not be embedded; open the image once in browser and retry export.`
        );
      } else {
        setExportHint("Downloaded portfolio.pdf with images.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setExportHint(`Could not generate PDF: ${message}`);
    }
  }

  return (
    <section className="rounded-3xl border border-white/80 bg-white/74 p-5 shadow-soft backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-ink">Portfolio Builder</h2>
          <p className="mt-1 text-sm text-ink/62">
            Select reflections and export a submission-ready PDF.
          </p>
        </div>
        <button
          type="button"
          onClick={exportToPdf}
          disabled={selectedReflections.length === 0}
          className="btn-primary w-auto rounded-full px-4 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Export PDF ({selectedReflections.length})
        </button>
      </div>
      {exportHint ? (
        <p className="mt-3 rounded-xl bg-skywash px-3 py-2 text-sm font-semibold text-moss">
          {exportHint}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-3 rounded-2xl border border-ink/10 bg-mist p-4">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Portfolio title</span>
            <input
              value={title}
              onChange={event => setTitle(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus:border-moss"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Growth statement</span>
            <textarea
              value={growthStatement}
              onChange={event => setGrowthStatement(event.target.value)}
              rows={5}
              className="mt-2 w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-moss"
            />
          </label>
          <div>
            <p className="text-sm font-semibold text-ink">Select reflections</p>
            <div className="mt-2 max-h-72 space-y-2 overflow-auto pr-1">
              {reflections.map(reflection => (
                <label
                  key={reflection.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink/10 bg-white px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(reflection.id)}
                    onChange={() => toggleReflection(reflection.id)}
                    className="mt-1 size-4 accent-moss"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink">
                      {reflection.title}
                    </span>
                    <span className="text-xs text-ink/58">{formatDate(reflection)}</span>
                  </span>
                </label>
              ))}
              {reflections.length === 0 ? (
                <p className="rounded-xl bg-white px-3 py-4 text-sm text-ink/60">
                  Add reflections first, then return here to build your portfolio.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
            Preview
          </p>
          <h3 className="mt-2 text-2xl font-bold text-ink">
            {title.trim() || "My Learning Portfolio"}
          </h3>
          <p className="mt-1 text-sm text-ink/58">{user?.displayName ?? "Student"}</p>
          <p className="mt-4 whitespace-pre-line text-sm leading-6 text-ink/72">
            {growthStatement.trim() || "Write a growth statement for this submission."}
          </p>

          <div className="mt-5 space-y-3">
            {selectedReflections.map(reflection => (
              <article key={reflection.id} className="rounded-xl border border-ink/10 p-3">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-skywash px-2 py-1 text-xs font-semibold text-moss">
                    {reflection.competency}
                  </span>
                  <span className="rounded-full bg-oat px-2 py-1 text-xs font-semibold text-clay">
                    {reflection.category}
                  </span>
                </div>
                <h4 className="mt-2 text-sm font-bold text-ink">{reflection.title}</h4>
                <p className="mt-1 max-h-[7.2rem] overflow-hidden text-sm leading-6 text-ink/72">
                  {reflection.body}
                </p>
              </article>
            ))}
            {selectedReflections.length === 0 ? (
              <p className="rounded-xl bg-mist px-3 py-4 text-sm text-ink/60">
                Select reflections to preview your portfolio.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
