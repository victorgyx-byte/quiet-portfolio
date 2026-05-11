import { NextRequest, NextResponse } from "next/server";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  const isLocalhost = request.nextUrl.hostname === "localhost";

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      new URL("/portfolio?google_connect=env_missing", request.url)
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get("google_oauth_state")?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      new URL("/portfolio?google_connect=invalid_state", request.url)
    );
  }

  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(
        new URL("/portfolio?google_connect=token_error", request.url)
      );
    }

    const tokens = (await tokenResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      token_type?: string;
    };

    const response = NextResponse.redirect(
      new URL("/portfolio?google_connect=success", request.url)
    );

    response.cookies.delete("google_oauth_state");
    response.cookies.set("google_connected", "true", {
      httpOnly: false,
      secure: !isLocalhost,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });

    // Stage 2 prep only: keep short-lived token metadata in cookies.
    // Stage 3 will move this into secure server-side storage bound to user identity.
    if (tokens.access_token) {
      response.cookies.set("google_access_token", tokens.access_token, {
        httpOnly: true,
        secure: !isLocalhost,
        sameSite: "lax",
        path: "/",
        maxAge: Math.max(60, tokens.expires_in ?? 3600)
      });
    }
    if (tokens.refresh_token) {
      response.cookies.set("google_refresh_token_present", "true", {
        httpOnly: false,
        secure: !isLocalhost,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30
      });
    }

    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/portfolio?google_connect=request_failed", request.url)
    );
  }
}
