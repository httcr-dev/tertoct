type LogLevel = "info" | "warn" | "error";

type LogContext = {
  route: string;
  action: string;
  uid?: string | null;
  errorCode?: string;
  status?: number;
  details?: Record<string, unknown>;
};

const statusEvents = new Map<string, number[]>();
const ALERT_WINDOW_MS = 5 * 60 * 1000;
const ALERT_THRESHOLD = 20;

export function logServerEvent(level: LogLevel, context: LogContext): void {
  const payload = {
    route: context.route,
    action: context.action,
    uid: context.uid ?? null,
    errorCode: context.errorCode ?? null,
    status: context.status ?? null,
    ...(context.details ? { details: context.details } : {}),
  };

  if (level === "error") {
    console.error("[OBS]", payload);
    return;
  }
  if (level === "warn") {
    console.warn("[OBS]", payload);
    return;
  }
  console.info("[OBS]", payload);
}

export function captureServerError(error: unknown, context: LogContext): void {
  logServerEvent("error", {
    ...context,
    details: {
      ...(context.details ?? {}),
      message: error instanceof Error ? error.message : "Unknown error",
    },
  });
}

export function trackStatusAnomaly(route: string, status: number): void {
  if (!(status >= 500 || status === 401 || status === 403)) return;

  const key = `${route}:${status}`;
  const now = Date.now();
  const recent = (statusEvents.get(key) ?? []).filter((t) => now - t <= ALERT_WINDOW_MS);
  recent.push(now);
  statusEvents.set(key, recent);

  if (recent.length === ALERT_THRESHOLD) {
    logServerEvent("warn", {
      route,
      action: "status-anomaly",
      status,
      errorCode: "HTTP_SPIKE",
      details: { eventsInWindow: recent.length, windowMs: ALERT_WINDOW_MS },
    });
  }
}
