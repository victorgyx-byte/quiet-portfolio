import { NextRequest, NextResponse } from "next/server";
import type { SlidesExportPayload } from "@/types/slides-export";

function isValidPayload(payload: unknown): payload is SlidesExportPayload {
  if (!payload || typeof payload !== "object") return false;
  const data = payload as Record<string, unknown>;

  if (data.version !== "slides-export-v1") return false;
  if (typeof data.generatedAt !== "string") return false;
  if (!data.student || typeof data.student !== "object") return false;
  if (!data.portfolio || typeof data.portfolio !== "object") return false;
  if (!Array.isArray(data.reflections)) return false;

  return true;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    if (!isValidPayload(payload)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid slides export payload shape."
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Slides export payload validated (mock mode).",
      nextStage: "Connect Google OAuth and Slides API create/update calls.",
      receivedReflections: payload.reflections.length
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Could not parse request body."
      },
      { status: 400 }
    );
  }
}
