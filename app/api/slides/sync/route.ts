import { NextRequest, NextResponse } from "next/server";
import type {
  SlidesDeckIntegration,
  SlidesExportPayload,
  SlidesReflectionMapEntry
} from "@/types/slides-export";

const GOOGLE_SLIDES_PRESENTATIONS = "https://slides.googleapis.com/v1/presentations";

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
  const data = (await response.json()) as { presentationId: string };
  return {
    deckId: data.presentationId,
    deckUrl: `https://docs.google.com/presentation/d/${data.presentationId}/edit`
  };
}

async function addCoverSlide(
  token: string,
  deckId: string,
  payload: SlidesExportPayload
) {
  const coverSlideId = "cover_slide";
  const coverTitleId = "cover_title";
  const coverBodyId = "cover_body";
  const subtitle = payload.portfolio.growthStatement.trim() || "Learning reflection";

  const requests: Record<string, unknown>[] = [
    {
      createSlide: {
        objectId: coverSlideId,
        insertionIndex: 0,
        slideLayoutReference: { predefinedLayout: "TITLE_AND_BODY" },
        placeholderIdMappings: [
          {
            layoutPlaceholder: { type: "TITLE", index: 0 },
            objectId: coverTitleId
          },
          {
            layoutPlaceholder: { type: "BODY", index: 0 },
            objectId: coverBodyId
          }
        ]
      }
    },
    {
      insertText: {
        objectId: coverTitleId,
        insertionIndex: 0,
        text: payload.portfolio.title
      }
    },
    {
      insertText: {
        objectId: coverBodyId,
        insertionIndex: 0,
        text: `${payload.student.name}\n\n${subtitle}`
      }
    }
  ];

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
  const requests: Record<string, unknown>[] = [
    {
      createSlide: {
        objectId: slideId,
        slideLayoutReference: { predefinedLayout: "TITLE_AND_BODY" },
        placeholderIdMappings: [
          {
            layoutPlaceholder: { type: "TITLE", index: 0 },
            objectId: titleId
          },
          {
            layoutPlaceholder: { type: "BODY", index: 0 },
            objectId: bodyId
          }
        ]
      }
    },
    {
      insertText: {
        objectId: titleId,
        insertionIndex: 0,
        text: "Portfolio meaning"
      }
    },
    {
      insertText: {
        objectId: bodyId,
        insertionIndex: 0,
        text: lines.join("\n\n")
      }
    }
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

  const bodyText = `${reflection.body}\n\n${reflection.competency} | ${reflection.category} | ${reflection.createdAt || "Recent"}`;

  const requests: Record<string, unknown>[] = [
    {
      createSlide: {
        objectId: slideId,
        slideLayoutReference: { predefinedLayout: "TITLE_AND_BODY" },
        placeholderIdMappings: [
          {
            layoutPlaceholder: { type: "TITLE", index: 0 },
            objectId: titleShapeId
          },
          {
            layoutPlaceholder: { type: "BODY", index: 0 },
            objectId: bodyShapeId
          }
        ]
      }
    },
    {
      insertText: {
        objectId: titleShapeId,
        insertionIndex: 0,
        text: reflection.title
      }
    },
    {
      insertText: {
        objectId: bodyShapeId,
        insertionIndex: 0,
        text: bodyText
      }
    }
  ];

  const images = (reflection.images ?? []).slice(0, 5);
  if (images.length > 0) {
    const slotsByCount: Array<{ x: number; y: number; w: number; h: number }> =
      images.length === 1
        ? [{ x: 3500000, y: 2500000, w: 4200000, h: 2300000 }]
        : images.length === 2
          ? [
              { x: 3500000, y: 2100000, w: 2000000, h: 2000000 },
              { x: 5700000, y: 2100000, w: 2000000, h: 2000000 }
            ]
          : images.length === 3
            ? [
                { x: 3500000, y: 1800000, w: 2000000, h: 1600000 },
                { x: 5700000, y: 1800000, w: 2000000, h: 1600000 },
                { x: 4600000, y: 3600000, w: 2000000, h: 1600000 }
              ]
            : images.length === 4
              ? [
                  { x: 3500000, y: 1700000, w: 2000000, h: 1500000 },
                  { x: 5700000, y: 1700000, w: 2000000, h: 1500000 },
                  { x: 3500000, y: 3400000, w: 2000000, h: 1500000 },
                  { x: 5700000, y: 3400000, w: 2000000, h: 1500000 }
                ]
              : [
                  { x: 3500000, y: 1500000, w: 2000000, h: 1300000 },
                  { x: 5700000, y: 1500000, w: 2000000, h: 1300000 },
                  { x: 3500000, y: 3000000, w: 2000000, h: 1300000 },
                  { x: 5700000, y: 3000000, w: 2000000, h: 1300000 },
                  { x: 4600000, y: 4500000, w: 2000000, h: 1300000 }
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
      await addCoverSlide(token, deckId, payload);
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
