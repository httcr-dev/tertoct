import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const AUTH_COOKIE_NAME = "authToken";

export function getAuthCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax avoids edge cases after cross-site OAuth redirects on some mobile browsers;
    // CSRF risk is low here because the session value is a short-lived Firebase idToken in JSON, not form credentials.
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour (matches Firebase idToken lifespan)
  };
}
