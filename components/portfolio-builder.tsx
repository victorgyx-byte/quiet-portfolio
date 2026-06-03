"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useUiMode } from "@/components/ui-mode";
import {
  getReflectionCompetencies,
  getReflectionCompetencyLabel,
  getReflectionLessonTitle,
  getReflectionType,
  getReflectionTypeLabel
} from "@/lib/reflection-utils";
import {
  addPortfolioUpdate,
  createPortfolio,
  deletePortfolio,
  savePortfolioSlidesIntegration,
  subscribeToStudentPortfolios,
  updatePortfolio
} from "@/lib/portfolios";
import { subscribeToStudentReflections } from "@/lib/reflections";
import type { Portfolio, PortfolioPurpose } from "@/types/portfolio";
import type { Reflection } from "@/types/reflection";
import type { SlidesDeckIntegration, SlidesExportPayload } from "@/types/slides-export";

const PURPOSE_OPTIONS: Array<{ id: PortfolioPurpose; label: string }> = [
  { id: "show_growth", label: "To show my growth" },
  { id: "show_best_work", label: "To show my best work" },
  { id: "reflect_on_challenge", label: "To reflect on a challenge" },
  { id: "teacher_conversation", label: "To prepare for a conversation with my teacher" },
  { id: "share_pride", label: "To share something I am proud of" },
  { id: "understand_self", label: "To understand myself better" },
  { id: "something_else", label: "Something else" }
];

const FOCUS_TAGS = [
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

function formatDate(dateValue?: { toDate: () => Date }) {
  const date = dateValue?.toDate();
  if (!date) return "Recent";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function ReflectionReferenceList({
  reflections,
  selectedReflectionIds,
  toggleReflection,
  selectable = false
}: {
  reflections: Reflection[];
  selectedReflectionIds: string[];
  toggleReflection?: (id: string) => void;
  selectable?: boolean;
}) {
  if (reflections.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-4 text-sm text-slate-500">
        No reflections yet.
      </div>
    );
  }

  return (
    <div className="portfolio-reference-list max-h-80 space-y-2 overflow-auto pr-1">
      {reflections.map(reflection => {
        const checked = selectedReflectionIds.includes(reflection.id);
        const content = (
          <>
            {selectable ? (
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleReflection?.(reflection.id)}
                className="mt-1 size-4 accent-orange-700"
              />
            ) : null}
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">{reflection.title}</span>
              <span className="mt-1 block text-xs text-slate-500">
                {getReflectionCompetencyLabel(reflection)} | {formatDate(reflection.createdAt)}
              </span>
              {getReflectionType(reflection) === "lesson" && getReflectionLessonTitle(reflection) ? (
                <span className="mt-1 block text-xs text-slate-500">
                  Lesson: {getReflectionLessonTitle(reflection)}
                </span>
              ) : null}
              <span className="mt-2 block whitespace-pre-line text-xs leading-5 text-slate-500">
                {reflection.body.length > 180 ? `${reflection.body.slice(0, 180)}...` : reflection.body}
              </span>
            </span>
          </>
        );

        return selectable ? (
          <label
            key={reflection.id}
            className={`portfolio-reference-item ${checked ? "selected" : ""}`}
          >
            {content}
          </label>
        ) : (
          <article key={reflection.id} className="portfolio-reference-item selected">
            {content}
          </article>
        );
      })}
    </div>
  );
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
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Could not read image size."));
    image.src = dataUrl;
  });
}

export function PortfolioBuilder() {
  const { user } = useAuth();
  const { mode } = useUiMode();
  const isStudio = mode === "studio";
  const searchParams = useSearchParams();

  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");
  const [expandedPortfolioId, setExpandedPortfolioId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingPortfolioId, setDeletingPortfolioId] = useState("");
  const [confirmDeletePortfolioId, setConfirmDeletePortfolioId] = useState("");
  const [isSyncingSlides, setIsSyncingSlides] = useState(false);
  const [startNewDeck, setStartNewDeck] = useState(false);
  const [quickUpdateText, setQuickUpdateText] = useState("");

  const [purpose, setPurpose] = useState<PortfolioPurpose>("show_growth");
  const [purposeOther, setPurposeOther] = useState("");
  const [focusTags, setFocusTags] = useState<string[]>(["Critical Thinking"]);
  const [selectedReflectionIds, setSelectedReflectionIds] = useState<string[]>([]);
  const [connectionText, setConnectionText] = useState("");
  const [ipsativeText, setIpsativeText] = useState("");
  const [growthStatement, setGrowthStatement] = useState("");
  const [title, setTitle] = useState("My Portfolio");
  const [slidesIntegration, setSlidesIntegration] = useState<SlidesDeckIntegration | null>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeToStudentReflections(user.uid, setReflections, () => undefined);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeToStudentPortfolios(user.uid, data => {
      setPortfolios(data);
      if (!selectedPortfolioId && data.length) {
        setSelectedPortfolioId(data[0].id);
      }
    }, () => setStatusMessage("Could not load portfolios right now. Please refresh."));
  }, [user, selectedPortfolioId]);

  const selectedPortfolio = useMemo(
    () => portfolios.find(portfolio => portfolio.id === selectedPortfolioId) ?? null,
    [portfolios, selectedPortfolioId]
  );

  useEffect(() => {
    if (!selectedPortfolio || isCreating) return;
    setTitle(selectedPortfolio.title);
    setPurpose(selectedPortfolio.purpose);
    setPurposeOther(selectedPortfolio.purposeOther ?? "");
    setFocusTags(selectedPortfolio.focusTags ?? []);
    setSelectedReflectionIds(selectedPortfolio.selectedReflectionIds ?? []);
    setConnectionText(selectedPortfolio.connectionText ?? "");
    setIpsativeText(selectedPortfolio.ipsativeText ?? "");
    setGrowthStatement(selectedPortfolio.growthStatement ?? "");
    setSlidesIntegration(selectedPortfolio.slidesIntegration ?? null);
  }, [selectedPortfolio, isCreating]);

  const selectedReflections = useMemo(
    () => reflections.filter(item => selectedReflectionIds.includes(item.id)),
    [reflections, selectedReflectionIds]
  );
  const shouldShowSelectedReferences =
    isCreating && createStep >= 4 && createStep <= 5 && selectedReflections.length > 0;

  const googleConnectStatus = searchParams.get("google_connect");

  function resetCreateFlow() {
    setCreateStep(1);
    setTitle("My Portfolio");
    setPurpose("show_growth");
    setPurposeOther("");
    setFocusTags(["Critical Thinking"]);
    setSelectedReflectionIds([]);
    setConnectionText("");
    setIpsativeText("");
    setGrowthStatement("");
    setSlidesIntegration(null);
    setStartNewDeck(false);
  }

  function toggleFocus(tag: string) {
    setFocusTags(current =>
      current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag]
    );
  }

  function toggleReflection(id: string) {
    setSelectedReflectionIds(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id]
    );
  }

  async function handleCreatePortfolio() {
    if (!user) return;
    if (selectedReflectionIds.length < 2) {
      setStatusMessage("Pick at least 2 moments to build a meaningful portfolio.");
      return;
    }

    setIsSaving(true);
    setStatusMessage("");
    try {
      const created = await createPortfolio({
        userId: user.uid,
        studentName: user.displayName ?? "Student",
        title: title.trim() || "My Portfolio",
        purpose,
        purposeOther: purpose === "something_else" ? purposeOther.trim() : "",
        focusTags,
        selectedReflectionIds,
        connectionText: connectionText.trim(),
        ipsativeText: ipsativeText.trim(),
        growthStatement: growthStatement.trim(),
        updates: [],
        slidesIntegration: null
      });
      setSelectedPortfolioId(created.id);
      setExpandedPortfolioId(created.id);
      setIsCreating(false);
      setStatusMessage("Portfolio created. You can keep updating it anytime.");
    } catch {
      setStatusMessage("Could not create portfolio right now.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSavePortfolio() {
    if (!selectedPortfolio) return;
    setIsSaving(true);
    setStatusMessage("");
    try {
      await updatePortfolio(selectedPortfolio.id, {
        title: title.trim() || "My Portfolio",
        purpose,
        purposeOther: purpose === "something_else" ? purposeOther.trim() : "",
        focusTags,
        selectedReflectionIds,
        connectionText: connectionText.trim(),
        ipsativeText: ipsativeText.trim(),
        growthStatement: growthStatement.trim()
      });
      setStatusMessage("Portfolio updated.");
    } catch {
      setStatusMessage("Could not update portfolio.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddQuickUpdate() {
    if (!selectedPortfolio || !quickUpdateText.trim()) return;
    setIsSaving(true);
    try {
      await addPortfolioUpdate(selectedPortfolio.id, quickUpdateText);
      setQuickUpdateText("");
      setStatusMessage("Update note added.");
    } catch {
      setStatusMessage("Could not add update note.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeletePortfolio(portfolioId: string) {
    setDeletingPortfolioId(portfolioId);
    setStatusMessage("");
    try {
      await deletePortfolio(portfolioId);
      setConfirmDeletePortfolioId("");
      setExpandedPortfolioId("");
      if (selectedPortfolioId === portfolioId) {
        const nextPortfolio = portfolios.find(portfolio => portfolio.id !== portfolioId);
        setSelectedPortfolioId(nextPortfolio?.id ?? "");
      }
      setStatusMessage("Portfolio deleted. Your original reflections are still safe.");
    } catch {
      setStatusMessage("Could not delete portfolio. Please try again.");
    } finally {
      setDeletingPortfolioId("");
    }
  }

  function buildSlidesPayload(): SlidesExportPayload | null {
    if (!user) return null;
    return {
      version: "slides-export-v1",
      generatedAt: new Date().toISOString(),
      student: {
        uid: user.uid,
        name: user.displayName ?? "Student",
        email: user.email ?? ""
      },
      portfolio: {
        title: title.trim() || "My Portfolio",
        growthStatement: growthStatement.trim(),
        purpose:
          purpose === "something_else"
            ? purposeOther.trim()
            : PURPOSE_OPTIONS.find(item => item.id === purpose)?.label,
        focusTags,
        connectionText: connectionText.trim(),
        ipsativeText: ipsativeText.trim()
      },
      reflections: selectedReflections.map(reflection => ({
        reflectionId: reflection.id,
        title: reflection.title,
        body: reflection.body,
        competencies: getReflectionCompetencies(reflection),
        reflectionType: getReflectionType(reflection),
        lessonTitle: getReflectionLessonTitle(reflection) || undefined,
        visibility: reflection.visibility,
        createdAt: reflection.createdAt?.toDate().toISOString() ?? "",
        images: reflection.images ?? []
      }))
    };
  }

  async function syncToGoogleSlides() {
    if (!selectedPortfolio || !user) return;
    if (selectedReflections.length === 0) {
      setStatusMessage("Select moments first before syncing.");
      return;
    }
    const payload = buildSlidesPayload();
    if (!payload) return;

    setIsSyncingSlides(true);
    setStatusMessage("");
    try {
      const response = await fetch("/api/slides/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          payload,
          integration: slidesIntegration,
          forceNewDeck: startNewDeck
        })
      });
      const data = (await response.json()) as {
        ok: boolean;
        message: string;
        integration?: SlidesDeckIntegration;
      };
      if (!response.ok || !data.ok || !data.integration) {
        setStatusMessage(data.message || "Could not sync to Google Slides.");
        return;
      }
      setSlidesIntegration(data.integration);
      await savePortfolioSlidesIntegration(selectedPortfolio.id, data.integration);
      setStatusMessage(data.message);
      if (startNewDeck) setStartNewDeck(false);
    } catch {
      setStatusMessage("Could not reach Google Slides right now.");
    } finally {
      setIsSyncingSlides(false);
    }
  }

  async function exportToPdf() {
    if (selectedReflections.length === 0) {
      setStatusMessage("Select moments first before exporting.");
      return;
    }
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const margin = 16;
      const width = 210 - margin * 2;
      const maxImageHeight = 72;
      let y = 20;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(title.trim() || "My Portfolio", margin, y);
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
      const growthLines = doc.splitTextToSize(growthStatement || "Growth statement", width);
      doc.text(growthLines, margin, y);
      y += growthLines.length * 6 + 8;

      for (const reflection of selectedReflections) {
        y = addPageIfNeeded(doc, y, 36);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(reflection.title, margin, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(
          `${getReflectionCompetencyLabel(reflection)} | ${getReflectionTypeLabel(getReflectionType(reflection))}${getReflectionLessonTitle(reflection) ? ` | ${getReflectionLessonTitle(reflection)}` : ""} | ${formatDate(reflection.createdAt)}`,
          margin,
          y
        );
        y += 6;
        const bodyLines = doc.splitTextToSize(reflection.body, width);
        doc.setFontSize(11);
        doc.text(bodyLines, margin, y);
        y += bodyLines.length * 5 + 4;

        for (const image of reflection.images ?? []) {
          const dataUrl = await imageUrlToJpegDataUrl(image.url);
          if (!dataUrl) continue;
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
          doc.addImage(dataUrl, "JPEG", imageX, y, renderWidth, renderHeight);
          y += renderHeight + 4;
        }
      }

      doc.save("portfolio.pdf");
      setStatusMessage("Downloaded portfolio.pdf");
    } catch {
      setStatusMessage("Could not generate PDF on this browser.");
    }
  }

  return (
    <section className={isStudio ? "studio-board studio-portfolio" : "glass-card rounded-3xl p-5 shadow-soft"}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="display-title">Portfolio Workspace</h2>
          <p className="mt-1 text-sm text-slate-500">
            Build multiple portfolios, keep updating them, and export when ready.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsCreating(true);
            resetCreateFlow();
            setStatusMessage("");
          }}
          className={isStudio ? "studio-create-button" : "btn-primary w-auto rounded-full px-4"}
        >
          Create New Portfolio
        </button>
      </div>

      {isCreating ? (
        <div className={isStudio ? "studio-create-flow mt-4 space-y-4" : "mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-4"}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Step {createStep} of 6
          </p>

          {createStep === 1 ? (
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-slate-900">What is this portfolio for?</h3>
              <p className="text-sm text-slate-500">Choose the story you want this portfolio to tell.</p>
              <div className={isStudio ? "studio-chip-cloud" : "grid gap-2"}>
                {PURPOSE_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPurpose(option.id)}
                    className={isStudio ? `studio-chip ${purpose === option.id ? "selected" : ""}` : `rounded-xl border px-3 py-2 text-left text-sm ${
                      purpose === option.id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {purpose === "something_else" ? (
                <input
                  value={purposeOther}
                  onChange={event => setPurposeOther(event.target.value)}
                  placeholder="This portfolio is for..."
                  className={isStudio ? "studio-open-input min-h-11 w-full text-sm outline-none" : "min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500"}
                />
              ) : null}
            </div>
          ) : null}

          {createStep === 2 ? (
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-slate-900">What do you want to focus on?</h3>
              <p className="text-sm text-slate-500">Choose 1-2 priorities (you can select more).</p>
              <div className={isStudio ? "studio-chip-cloud" : "grid gap-2 sm:grid-cols-2"}>
                {FOCUS_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleFocus(tag)}
                    className={isStudio ? `studio-chip ${focusTags.includes(tag) ? "selected" : ""}` : `rounded-xl border px-3 py-2 text-left text-sm ${
                      focusTags.includes(tag) ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {createStep === 3 ? (
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-slate-900">Which moments help tell this story?</h3>
              <p className="text-sm text-slate-500">
                Pick moments you may want to refer to in the next steps.
              </p>
              <ReflectionReferenceList
                reflections={reflections}
                selectedReflectionIds={selectedReflectionIds}
                toggleReflection={toggleReflection}
                selectable
              />
            </div>
          ) : null}

          {shouldShowSelectedReferences ? (
            <aside className="portfolio-reference-panel">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-900">Selected moments</p>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                  {selectedReflections.length}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Keep these nearby as evidence while you write.
              </p>
              <div className="mt-3">
                <ReflectionReferenceList
                  reflections={selectedReflections}
                  selectedReflectionIds={selectedReflectionIds}
                />
              </div>
            </aside>
          ) : null}

          {createStep === 4 ? (
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-slate-900">Why did you choose these moments?</h3>
              <textarea
                value={connectionText}
                onChange={event => setConnectionText(event.target.value)}
                placeholder="These moments show..."
                rows={5}
                className={isStudio ? "studio-open-input w-full text-sm outline-none" : "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"}
              />
            </div>
          ) : null}

          {createStep === 5 ? (
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-slate-900">What do you notice across time?</h3>
              <textarea
                value={ipsativeText}
                onChange={event => setIpsativeText(event.target.value)}
                placeholder="What changed from then to now?"
                rows={5}
                className={isStudio ? "studio-open-input w-full text-sm outline-none" : "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"}
              />
            </div>
          ) : null}

          {createStep === 6 ? (
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-slate-900">
                Let's give your portfolio a title and a growth statement
              </h3>
              <input
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="Portfolio title"
                className={isStudio ? "studio-open-input min-h-11 w-full text-sm outline-none" : "min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500"}
              />
              <textarea
                value={growthStatement}
                onChange={event => setGrowthStatement(event.target.value)}
                placeholder="Growth statement..."
                rows={5}
                className={isStudio ? "studio-open-input w-full text-sm outline-none" : "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"}
              />
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => (createStep === 1 ? setIsCreating(false) : setCreateStep(step => step - 1))}
              className="btn-secondary"
            >
              {createStep === 1 ? "Cancel" : "Back"}
            </button>
            {createStep < 6 ? (
              <button
                type="button"
                onClick={() => setCreateStep(step => step + 1)}
                className="btn-primary"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreatePortfolio}
                disabled={isSaving}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isSaving ? "Creating..." : "Create portfolio"}
              </button>
            )}
          </div>
        </div>
      ) : null}

      {!isCreating && portfolios.length > 0 ? (
        <div className="mt-4 space-y-3">
          {portfolios.map(item => {
            const isExpanded = expandedPortfolioId === item.id;
            return (
              <details
                key={item.id}
                open={isExpanded}
                className={isStudio ? "studio-portfolio-card" : "rounded-2xl border border-slate-200 bg-white p-3"}
              >
                <summary
                  className="cursor-pointer list-none"
                  onClick={event => {
                    event.preventDefault();
                    const next = isExpanded ? "" : item.id;
                    setExpandedPortfolioId(next);
                    if (next) setSelectedPortfolioId(item.id);
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.focusTags?.slice(0, 2).join(", ") || "No focus yet"}
                      </p>
                    </div>
                    <span className={isStudio ? "studio-small-pill" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500"}>
                      {isExpanded ? "Hide" : "Edit"}
                    </span>
                  </div>
                </summary>

                {isExpanded && selectedPortfolioId === item.id ? (
                  <div className={isStudio ? "studio-portfolio-detail" : "mt-3 space-y-4 border-t border-slate-200 pt-3"}>
                    <p className="text-sm text-slate-500">
                      Add more reflections, update your story, then export to Slides or PDF.
                    </p>
                    <div className="grid gap-3">
                      <input
                        value={title}
                        onChange={event => setTitle(event.target.value)}
                        className={isStudio ? "studio-open-input min-h-11 w-full text-sm outline-none" : "min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500"}
                      />
                      <textarea
                        value={growthStatement}
                        onChange={event => setGrowthStatement(event.target.value)}
                        placeholder="Growth statement..."
                        rows={4}
                        className={isStudio ? "studio-open-input w-full text-sm outline-none" : "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"}
                      />
                      <div className="max-h-60 space-y-2 overflow-auto pr-1">
                        {reflections.map(reflection => (
                          <label key={reflection.id} className={isStudio ? "studio-choice-row" : "flex gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"}>
                            <input
                              type="checkbox"
                              checked={selectedReflectionIds.includes(reflection.id)}
                              onChange={() => toggleReflection(reflection.id)}
                              className="mt-1 size-4 accent-blue-600"
                            />
                            <span>
                              <span className="block text-sm font-semibold text-slate-900">{reflection.title}</span>
                              <span className="text-xs text-slate-500">{formatDate(reflection.createdAt)}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleSavePortfolio}
                        disabled={isSaving}
                        className="btn-secondary disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {isSaving ? "Saving..." : "Save portfolio changes"}
                      </button>
                    </div>

                    <div className={isStudio ? "studio-follow-up-panel" : "space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3"}>
                      <p className="text-sm font-semibold text-slate-800">Additional reflection update</p>
                      <textarea
                        value={quickUpdateText}
                        onChange={event => setQuickUpdateText(event.target.value)}
                        placeholder="What changed since your last update?"
                        rows={3}
                        className={isStudio ? "studio-open-input w-full text-sm outline-none" : "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"}
                      />
                      <button type="button" onClick={handleAddQuickUpdate} className="btn-secondary">
                        Add update note
                      </button>
                      {(selectedPortfolio?.updates ?? []).length > 0 ? (
                        <div className="space-y-2">
                          {[...(selectedPortfolio?.updates ?? [])]
                            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                            .slice(0, 3)
                            .map((note, index) => (
                              <p key={`${note.createdAt}-${index}`} className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                                {note.text}
                              </p>
                            ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <button type="button" onClick={exportToPdf} className="btn-primary">
                        Export PDF
                      </button>
                      <button
                        type="button"
                        onClick={syncToGoogleSlides}
                        disabled={isSyncingSlides}
                        className="btn-primary disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {isSyncingSlides ? "Syncing to Google Slides..." : "Sync to My Google Slides Deck"}
                      </button>
                    </div>
                    <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={startNewDeck}
                        onChange={event => setStartNewDeck(event.target.checked)}
                        className="mt-1 size-4 accent-blue-600"
                      />
                      <span>Start a new Slides deck this time</span>
                    </label>
                    <p className="text-sm text-slate-500">
                      First time using Slides? Connect Google Drive once before syncing.
                    </p>
                    <Link
                      href="/api/google/connect"
                      className="btn-secondary inline-flex w-full items-center justify-center rounded-2xl"
                    >
                      Connect Google Drive
                    </Link>
                    {slidesIntegration?.deckUrl ? (
                      <p className="rounded-xl bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700">
                        Linked deck:{" "}
                        <a href={slidesIntegration.deckUrl} target="_blank" rel="noreferrer" className="underline">
                          Open Google Slides
                        </a>
                      </p>
                    ) : null}

                    <div className={isStudio ? "studio-danger-panel" : "rounded-2xl border border-rose-200 bg-rose-50/70 p-3"}>
                      {confirmDeletePortfolioId === item.id ? (
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-rose-700">
                            Delete this portfolio?
                          </p>
                          <p className="text-xs leading-5 text-rose-600">
                            This removes the portfolio workspace and export link from this app.
                            Your original reflections will not be deleted.
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => setConfirmDeletePortfolioId("")}
                              disabled={deletingPortfolioId === item.id}
                              className="btn-secondary disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePortfolio(item.id)}
                              disabled={deletingPortfolioId === item.id}
                              className="btn-tertiary border-rose-300 bg-rose-100 text-rose-700 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              {deletingPortfolioId === item.id
                                ? "Deleting..."
                                : "Yes, delete portfolio"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeletePortfolioId(item.id)}
                          className="btn-tertiary border-rose-300 bg-rose-100 text-rose-700"
                        >
                          Delete portfolio
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
              </details>
            );
          })}
        </div>
      ) : null}

      {googleConnectStatus === "success" ? (
        <p className="mt-3 rounded-xl bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700">
          Google Drive connected. You can now sync to Slides.
        </p>
      ) : null}
      {googleConnectStatus === "invalid_state" ? (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          The Google connection was interrupted. Please try again.
        </p>
      ) : null}
      {(googleConnectStatus === "token_error" || googleConnectStatus === "request_failed") ? (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          We couldn't complete Google connection. Please reconnect and try again.
        </p>
      ) : null}
      {googleConnectStatus === "env_missing" ? (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          Google setup is incomplete. Ask your teacher/admin to finish app settings.
        </p>
      ) : null}

      {statusMessage ? (
        <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
