import { NextRequest, NextResponse } from "next/server";

function isAllowedImageHost(hostname: string) {
  return (
    hostname === "firebasestorage.googleapis.com" ||
    hostname.endsWith(".firebasestorage.app")
  );
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url");
  if (!source) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(source);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  if (!isAllowedImageHost(parsed.hostname)) {
    return new NextResponse("Host not allowed", { status: 403 });
  }

  try {
    const upstream = await fetch(parsed.toString());
    if (!upstream.ok) {
      return new NextResponse("Failed to fetch image", { status: upstream.status });
    }

    const bytes = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";

    return new NextResponse(bytes, {
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600"
      }
    });
  } catch {
    return new NextResponse("Proxy request failed", { status: 502 });
  }
}
