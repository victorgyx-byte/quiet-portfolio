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

function buildPortfolioHtml(
  portfolioTitle: string,
  growthStatement: string,
  selectedReflections: Reflection[],
  studentName: string
) {
  const cards = selectedReflections
    .map(reflection => {
      const imagesHtml = (reflection.images ?? [])
        .map(
          image => `
          <img src="${image.url}" alt="Reflection image" style="width: 32%; height: 130px; object-fit: cover; border-radius: 10px; border: 1px solid #d6dfe1;" />
        `
        )
        .join("");

      return `
      <article style="margin-bottom: 22px; border: 1px solid #d6dfe1; border-radius: 14px; padding: 16px;">
        <div style="display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap;">
          <span style="background: #e8f1f2; color: #425f57; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700;">${reflection.competency}</span>
          <span style="background: #f5eee5; color: #b86b5a; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700;">${reflection.category}</span>
          <span style="background: #f6f8f5; color: #5f6e74; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700;">${formatDate(reflection)}</span>
        </div>
        <h3 style="margin: 0 0 8px; font-size: 18px;">${reflection.title}</h3>
        <p style="margin: 0; color: #38484d; white-space: pre-line; line-height: 1.6;">${reflection.body}</p>
        ${
          imagesHtml
            ? `<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">${imagesHtml}</div>`
            : ""
        }
      </article>
    `;
    })
    .join("");

  return `
  <html>
    <head>
      <title>${portfolioTitle}</title>
      <meta charset="utf-8" />
    </head>
    <body style="font-family: Avenir Next, Segoe UI, sans-serif; color: #263238; background: #ffffff; margin: 0; padding: 28px;">
      <header style="margin-bottom: 18px; border-bottom: 2px solid #e8f1f2; padding-bottom: 14px;">
        <p style="margin: 0; font-size: 12px; color: #6d7f86; text-transform: uppercase; letter-spacing: 0.12em;">Student Portfolio Submission</p>
        <h1 style="margin: 8px 0 4px; font-size: 32px;">${portfolioTitle}</h1>
        <p style="margin: 0; color: #4f5f64;">${studentName}</p>
      </header>
      <section style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 8px; font-size: 20px;">Growth Statement</h2>
        <p style="margin: 0; white-space: pre-line; line-height: 1.7; color: #38484d;">${growthStatement}</p>
      </section>
      <section>
        <h2 style="margin: 0 0 12px; font-size: 20px;">Selected Reflections</h2>
        ${cards}
      </section>
    </body>
  </html>
  `;
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

  function exportToPdf() {
    if (selectedReflections.length === 0) return;
    setExportHint("");

    const html = buildPortfolioHtml(
      title.trim() || "My Learning Portfolio",
      growthStatement.trim() || "Growth statement",
      selectedReflections,
      user?.displayName ?? "Student"
    );

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, "_blank");

    if (!printWindow) {
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = "portfolio-print-view.html";
      downloadLink.click();
      setExportHint(
        "Popup blocked on this browser. We downloaded a print page file. Open it and use Share/Print to save PDF."
      );
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }

    setExportHint(
      "A print view has been opened. If the print dialog does not appear, use your browser Share menu and choose Print or Save as PDF."
    );

    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        setExportHint(
          "Use your browser Share menu in the opened page and choose Print or Save as PDF."
        );
      }
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }, 350);
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
          className="min-h-11 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-45"
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
