import { NextRequest, NextResponse } from "next/server";
import { getReflectionTypeLabel } from "@/lib/reflection-utils";
import type {
  SlidesDeckIntegration,
  SlidesExportPayload,
  SlidesReflectionMapEntry
} from "@/types/slides-export";

const GOOGLE_SLIDES_PRESENTATIONS = "https://slides.googleapis.com/v1/presentations";
const SLIDE_WIDTH = 9144000;
const SLIDE_HEIGHT = 5143500;
const INCH = 914400;

const COLORS = {
  paper: { red: 1, green: 0.968, blue: 0.925 },
  paperDeep: { red: 1, green: 0.91, blue: 0.82 },
  peach: { red: 0.97, green: 0.77, blue: 0.56 },
  clay: { red: 0.79, green: 0.37, blue: 0.24 },
  ink: { red: 0.23, green: 0.157, blue: 0.122 },
  muted: { red: 0.48, green: 0.384, blue: 0.322 },
  cream: { red: 1, green: 0.988, blue: 0.965 }
};

type SyncRequestBody = {
  payload?: SlidesExportPayload;
  integration?: SlidesDeckIntegration | null;
  forceNewDeck?: boolean;
};

function isValidPayload(payload: unknown): payload is SlidesExportPayload {
  if (!payload || typeof payload !== "object") return false;
  const data = payload as Record<string, unknown>;
  return (
    data.version === "slides-export-v1" &&
    typeof data.generatedAt === "string" &&
    typeof data.student === "object" &&
    typeof data.portfolio === "object" &&
    Array.isArray(data.reflections)
  );
}

function safeId(prefix: string, raw: string) {
  const normalized = raw.replace(/[^a-zA-Z0-9_:-]/g, "_");
  const sliced = normalized.slice(0, 38);
  const candidate = `${prefix}_${sliced}`;
  return candidate.length >= 5 ? candidate : `${prefix}_item`;
}

async function googleRequest(url: string, token: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });
}

async function createDeck(token: string, title: string) {
  const response = await googleRequest(GOOGLE_SLIDES_PRESENTATIONS, token, {
    method: "POST",
    body: JSON.stringify({ title })
  });
  if (!response.ok) {
    throw new Error("We couldn't create your Google Slides deck yet. Please try again.");
  }
  const data = (await response.json()) as {
    presentationId: string;
    slides?: Array<{ objectId: string }>;
  };
  return {
    deckId: data.presentationId,
    deckUrl: `https://docs.google.com/presentation/d/${data.presentationId}/edit`,
    defaultSlideId: data.slides?.[0]?.objectId ?? ""
  };
}

function emu(value: number) {
  return Math.round(value * INCH);
}

function box(
  pageObjectId: string,
  objectId: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  return {
    createShape: {
      objectId,
      shapeType: "TEXT_BOX",
      elementProperties: {
        pageObjectId,
        size: {
          width: { magnitude: emu(w), unit: "EMU" },
          height: { magnitude: emu(h), unit: "EMU" }
        },
        transform: {
          scaleX: 1,
          scaleY: 1,
          translateX: emu(x),
          translateY: emu(y),
          unit: "EMU"
        }
      }
    }
  };
}

function roundedRect(
  pageObjectId: string,
  objectId: string,
  x: number,
  y: number,
  w: number,
  h: number,
  color: keyof typeof COLORS
) {
  return [
    {
      createShape: {
        objectId,
        shapeType: "ROUND_RECTANGLE",
        elementProperties: {
          pageObjectId,
          size: {
            width: { magnitude: emu(w), unit: "EMU" },
            height: { magnitude: emu(h), unit: "EMU" }
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: emu(x),
            translateY: emu(y),
            unit: "EMU"
          }
        }
      }
    },
    {
      updateShapeProperties: {
        objectId,
        shapeProperties: {
          shapeBackgroundFill: {
            solidFill: {
              color: { rgbColor: COLORS[color] }
            }
          },
          outline: { propertyState: "NOT_RENDERED" }
        },
        fields: "shapeBackgroundFill.solidFill.color,outline.propertyState"
      }
    }
  ];
}

function insertStyledText(
  objectId: string,
  text: string,
  options: {
    size: number;
    color?: keyof typeof COLORS;
    bold?: boolean;
  }
) {
  return [
    {
      insertText: {
        objectId,
        insertionIndex: 0,
        text
      }
    },
    {
      updateTextStyle: {
        objectId,
        textRange: { type: "ALL" },
        style: {
          fontFamily: "Arial",
          fontSize: { magnitude: options.size, unit: "PT" },
          foregroundColor: {
            opaqueColor: { rgbColor: COLORS[options.color ?? "ink"] }
          },
          bold: options.bold ?? false
        },
        fields: "fontFamily,fontSize,foregroundColor,bold"
      }
    }
  ];
}

function setSlideBackground(slideId: string) {
  return {
    updatePageProperties: {
      objectId: slideId,
      pageProperties: {
        pageBackgroundFill: {
          solidFill: {
            color: { rgbColor: COLORS.paper }
          }
        }
      },
      fields: "pageBackgroundFill.solidFill.color"
    }
  };
}

function createBlankSlide(slideId: string, insertionIndex?: number) {
  return {
    createSlide: {
      objectId: slideId,
      ...(typeof insertionIndex === "number" ? { insertionIndex } : {}),
      slideLayoutReference: { predefinedLayout: "BLANK" }
    }
  };
}

function formatDateLabel(dateValue: string) {
  if (!dateValue) return "Recent";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Recent";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function splitMomentBody(body: string) {
  const momentMatch = body.match(/Moment:\n([\s\S]*?)(?:\n\nWhy this mattered:\n([\s\S]*))?$/);
  if (!momentMatch) return { moment: body, meaning: "" };
  return {
    moment: momentMatch[1]?.trim() ?? body,
    meaning: momentMatch[2]?.trim() ?? ""
  };
}

async function addCoverSlide(
  token: string,
  deckId: string,
  payload: SlidesExportPayload,
  defaultSlideId?: string
) {
  const coverSlideId = "cover_slide";
  const eyebrowId = "cover_eyebrow";
  const coverTitleId = "cover_title";
  const studentId = "cover_student";
  const statementId = "cover_statement";
  const accentId = "cover_accent";
  const subtitle = payload.portfolio.growthStatement.trim() || "Learning reflection";

  const requests: Record<string, unknown>[] = [
    createBlankSlide(coverSlideId, 0),
    setSlideBackground(coverSlideId),
    ...roundedRect(coverSlideId, accentId, 6.25, 0.6, 2.55, 4.55, "peach"),
    box(coverSlideId, eyebrowId, 0.65, 0.7, 5.3, 0.36),
    ...insertStyledText(eyebrowId, "STUDENT PORTFOLIO", {
      size: 12,
      color: "muted",
      bold: true
    }),
    box(coverSlideId, coverTitleId, 0.65, 1.25, 5.85, 1.8),
    ...insertStyledText(coverTitleId, payload.portfolio.title, {
      size: 34,
      color: "ink",
      bold: true
    }),
    box(coverSlideId, studentId, 0.72, 3.3, 3.8, 0.34),
    ...insertStyledText(studentId, payload.student.name, {
      size: 14,
      color: "clay",
      bold: true
    }),
    box(coverSlideId, statementId, 0.72, 3.8, 5.35, 0.9),
    ...insertStyledText(statementId, subtitle, {
      size: 16,
      color: "muted"
    })
  ];
  if (defaultSlideId) {
    requests.push({ deleteObject: { objectId: defaultSlideId } });
  }

  const response = await googleRequest(
    `${GOOGLE_SLIDES_PRESENTATIONS}/${deckId}:batchUpdate`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ requests })
    }
  );

  if (!response.ok) {
    throw new Error("We couldn't add the portfolio cover slide. Please try again.");
  }
}

async function addNarrativeSlide(
  token: string,
  deckId: string,
  payload: SlidesExportPayload
) {
  const lines: string[] = [];
  if (payload.portfolio.purpose) lines.push(`Purpose: ${payload.portfolio.purpose}`);
  if (payload.portfolio.focusTags?.length) {
    lines.push(`Focus: ${payload.portfolio.focusTags.join(", ")}`);
  }
  if (payload.portfolio.connectionText) {
    lines.push(`Why these moments:\n${payload.portfolio.connectionText}`);
  }
  if (payload.portfolio.ipsativeText) {
    lines.push(`Across time:\n${payload.portfolio.ipsativeText}`);
  }
  if (lines.length === 0) return;

  const slideId = "meaning_slide";
  const titleId = "meaning_title";
  const bodyId = "meaning_body";
  const sideId = "meaning_side";
  const eyebrowId = "meaning_eyebrow";
  const requests: Record<string, unknown>[] = [
    createBlankSlide(slideId),
    setSlideBackground(slideId),
    ...roundedRect(slideId, sideId, 0.45, 0.45, 2.2, 4.75, "paperDeep"),
    box(slideId, eyebrowId, 0.75, 0.8, 2.6, 0.3),
    ...insertStyledText(eyebrowId, "PORTFOLIO MEANING", {
      size: 11,
      color: "muted",
      bold: true
    }),
    box(slideId, titleId, 0.75, 1.28, 2.85, 1.4),
    ...insertStyledText(titleId, "Why these moments belong together", {
      size: 23,
      color: "ink",
      bold: true
    }),
    box(slideId, bodyId, 3.3, 0.8, 5.85, 3.95),
    ...insertStyledText(bodyId, lines.join("\n\n"), {
      size: 13,
      color: "muted"
    })
  ];

  const response = await googleRequest(
    `${GOOGLE_SLIDES_PRESENTATIONS}/${deckId}:batchUpdate`,
    token,
    { method: "POST", body: JSON.stringify({ requests }) }
  );

  if (!response.ok) {
    throw new Error("We couldn't add your portfolio explanation slide. Please try again.");
  }
}

async function appendReflectionSlide(
  token: string,
  deckId: string,
  reflection: SlidesExportPayload["reflections"][number]
) {
  const slideId = safeId("slide", reflection.reflectionId);
  const titleShapeId = safeId("title", reflection.reflectionId);
  const bodyShapeId = safeId("body", reflection.reflectionId);
  const metaShapeId = safeId("meta", reflection.reflectionId);
  const momentShapeId = safeId("moment", reflection.reflectionId);
  const meaningShapeId = safeId("meaning", reflection.reflectionId);
  const accentShapeId = safeId("accent", reflection.reflectionId);

  const { moment, meaning } = splitMomentBody(reflection.body);
  const competencyLabel =
    reflection.competencies.length > 0 ? reflection.competencies.join(", ") : "No 21CC tag";
  const reflectionTypeLabel = getReflectionTypeLabel(reflection.reflectionType);
  const lessonLabel = reflection.lessonTitle ? `  |  ${reflection.lessonTitle}` : "";
  const metaText = `${competencyLabel}  |  ${reflectionTypeLabel}${lessonLabel}  |  ${formatDateLabel(reflection.createdAt)}`;

  const requests: Record<string, unknown>[] = [
    createBlankSlide(slideId),
    setSlideBackground(slideId),
    ...roundedRect(slideId, accentShapeId, 0.42, 0.42, 8.25, 0.32, "peach"),
    box(slideId, metaShapeId, 0.55, 0.78, 8.5, 0.3),
    ...insertStyledText(metaShapeId, metaText.toUpperCase(), {
      size: 9,
      color: "clay",
      bold: true
    }),
    box(slideId, titleShapeId, 0.55, 1.18, 3.85, 0.95),
    ...insertStyledText(titleShapeId, reflection.title, {
      size: 22,
      color: "ink",
      bold: true
    }),
    box(slideId, momentShapeId, 0.58, 2.2, 3.65, 1.25),
    ...insertStyledText(momentShapeId, `Moment\n${moment || reflection.title}`, {
      size: 13,
      color: "muted"
    }),
    box(slideId, meaningShapeId, 0.58, 3.65, 3.65, 1.05),
    ...insertStyledText(meaningShapeId, meaning ? `Why this mattered\n${meaning}` : "", {
      size: 13,
      color: "muted"
    }),
    box(slideId, bodyShapeId, 0.55, 4.85, 3.65, 0.24),
    ...insertStyledText(bodyShapeId, reflection.visibility === "private" ? "Private reflection" : "Shared with teacher", {
      size: 9,
      color: "muted",
      bold: true
    })
  ];

  const images = (reflection.images ?? []).slice(0, 5);
  if (images.length > 0) {
    const slotsByCount: Array<{ x: number; y: number; w: number; h: number }> =
      images.length === 1
        ? [{ x: emu(4.65), y: emu(1.18), w: emu(4.45), h: emu(3.55) }]
        : images.length === 2
          ? [
              { x: emu(4.65), y: emu(1.18), w: emu(2.15), h: emu(3.55) },
              { x: emu(6.95), y: emu(1.18), w: emu(2.15), h: emu(3.55) }
            ]
          : images.length === 3
            ? [
                { x: emu(4.65), y: emu(1.18), w: emu(2.15), h: emu(1.7) },
                { x: emu(6.95), y: emu(1.18), w: emu(2.15), h: emu(1.7) },
                { x: emu(4.65), y: emu(3.05), w: emu(4.45), h: emu(1.68) }
              ]
            : images.length === 4
              ? [
                  { x: emu(4.65), y: emu(1.18), w: emu(2.15), h: emu(1.7) },
                  { x: emu(6.95), y: emu(1.18), w: emu(2.15), h: emu(1.7) },
                  { x: emu(4.65), y: emu(3.05), w: emu(2.15), h: emu(1.68) },
                  { x: emu(6.95), y: emu(3.05), w: emu(2.15), h: emu(1.68) }
                ]
              : [
                  { x: emu(4.65), y: emu(1.18), w: emu(1.38), h: emu(1.7) },
                  { x: emu(6.1), y: emu(1.18), w: emu(1.38), h: emu(1.7) },
                  { x: emu(7.55), y: emu(1.18), w: emu(1.55), h: emu(1.7) },
                  { x: emu(4.65), y: emu(3.05), w: emu(2.15), h: emu(1.68) },
                  { x: emu(6.95), y: emu(3.05), w: emu(2.15), h: emu(1.68) }
                ];

    images.forEach((image, index) => {
      const slot = slotsByCount[index];
      if (!slot?.w || !slot?.h) return;
      requests.push({
        createImage: {
          objectId: safeId(`img${index}`, reflection.reflectionId),
          url: image.url,
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: slot.w, unit: "EMU" },
              height: { magnitude: slot.h, unit: "EMU" }
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: slot.x,
              translateY: slot.y,
              unit: "EMU"
            }
          }
        }
      });
    });
  }

  const batchResponse = await googleRequest(
    `${GOOGLE_SLIDES_PRESENTATIONS}/${deckId}:batchUpdate`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ requests })
    }
  );

  if (!batchResponse.ok) {
    throw new Error("We couldn't add one of your reflections to Slides. Please try again.");
  }

  const mapEntry: SlidesReflectionMapEntry = {
    slideId,
    titleShapeId,
    bodyShapeId
  };

  return mapEntry;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("google_access_token")?.value;
    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          message: "Your Google connection has expired. Please reconnect Google Drive first."
        },
        { status: 401 }
      );
    }

    const body = (await request.json()) as SyncRequestBody;
    if (!isValidPayload(body.payload)) {
      return NextResponse.json(
        {
          ok: false,
          message: "We couldn't read this sync request. Please try again."
        },
        { status: 400 }
      );
    }

    const payload = body.payload;
    const forceNewDeck = body.forceNewDeck === true;
    const existing = forceNewDeck ? null : body.integration ?? null;
    const reflectionSlideMap = { ...(existing?.reflectionSlideMap ?? {}) };

    let deckId = existing?.deckId ?? "";
    let deckUrl = existing?.deckUrl ?? "";

    const createdNewDeck = !deckId;
    if (createdNewDeck) {
      const created = await createDeck(token, payload.portfolio.title);
      deckId = created.deckId;
      deckUrl = created.deckUrl;
      await addCoverSlide(token, deckId, payload, created.defaultSlideId);
      await addNarrativeSlide(token, deckId, payload);
    }

    let addedSlides = 0;
    for (const reflection of payload.reflections) {
      if (reflectionSlideMap[reflection.reflectionId]) continue;
      const mapEntry = await appendReflectionSlide(token, deckId, reflection);
      reflectionSlideMap[reflection.reflectionId] = mapEntry;
      addedSlides += 1;
    }

    const integration: SlidesDeckIntegration = {
      deckId,
      deckUrl,
      reflectionSlideMap
    };

    return NextResponse.json({
      ok: true,
      message: createdNewDeck
        ? `New Slides deck created. Added ${addedSlides} reflection slide(s).`
        : addedSlides
          ? `Synced successfully. Added ${addedSlides} new slide(s).`
          : "No new slides to add. Deck is already up to date.",
      integration
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error.";
    return NextResponse.json(
      {
        ok: false,
        message
      },
      { status: 500 }
    );
  }
}
