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

async function appendReflectionSlide(
  token: string,
  deckId: string,
  reflection: SlidesExportPayload["reflections"][number]
) {
  const slideId = safeId("slide", reflection.reflectionId);
  const titleShapeId = safeId("title", reflection.reflectionId);
  const bodyShapeId = safeId("body", reflection.reflectionId);
  const imageId = safeId("img", reflection.reflectionId);

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

  const firstImage = reflection.images?.[0];
  if (firstImage?.url) {
    requests.push({
      createImage: {
        objectId: imageId,
        url: firstImage.url,
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: 2800000, unit: "EMU" },
            height: { magnitude: 1800000, unit: "EMU" }
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: 3500000,
            translateY: 2600000,
            unit: "EMU"
          }
        }
      }
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
    const existing = body.integration ?? null;
    const reflectionSlideMap = { ...(existing?.reflectionSlideMap ?? {}) };

    let deckId = existing?.deckId ?? "";
    let deckUrl = existing?.deckUrl ?? "";

    if (!deckId) {
      const created = await createDeck(token, payload.portfolio.title);
      deckId = created.deckId;
      deckUrl = created.deckUrl;
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
      message: addedSlides
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
