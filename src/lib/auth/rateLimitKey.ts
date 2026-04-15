type BuildAuthRateLimitKeyInput = {
  route: "auth-cookie" | "auth-verify";
  method: "POST" | "DELETE";
  clientId: string;
  uid?: string | null;
};

export function buildAuthRateLimitKey({
  route,
  method,
  clientId,
  uid,
}: BuildAuthRateLimitKeyInput): string {
  return `${route}:${method}:${clientId}${uid ? `:uid:${uid}` : ""}`;
}
