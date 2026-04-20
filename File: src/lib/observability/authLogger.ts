import { LogLevel, LogContext } from "./serverObservability";

export function logAuthEvent(context: LogContext, level: LogLevel = "info") {
  console.log(`[${level.toUpperCase()}] Auth Event - Route: ${context.route}, Action: ${context.action}`);
}
