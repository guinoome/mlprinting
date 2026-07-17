/**
 * Logging framework — Ph1.md §9 (client logs, server logs, error tracking).
 *
 * A seam, not a vendor. Phase 1 writes structured JSON to the console; when an
 * error-tracking service is chosen it is wired into `report()` alone, and no
 * call site changes. Choosing that service is a paid-tool decision and needs
 * approval first (V1 §11) — hence the deliberately boring default.
 */

type Level = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

const isServer = typeof window === "undefined";

/**
 * Keys whose values never reach a log line. Logs travel to places credentials
 * must not: consoles, aggregators, support tickets.
 */
const REDACTED_KEYS = [
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "secret",
  "authorization",
  "cookie",
];

function redact(context: LogContext): LogContext {
  const safe: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    safe[key] = REDACTED_KEYS.some((k) =>
      key.toLowerCase().includes(k.toLowerCase()),
    )
      ? "[redacted]"
      : value;
  }
  return safe;
}

function emit(level: Level, message: string, context: LogContext = {}) {
  // Debug lines are noise in production and useful nowhere else.
  if (level === "debug" && process.env.NODE_ENV === "production") return;

  const entry = {
    level,
    message,
    source: isServer ? "server" : "client",
    timestamp: new Date().toISOString(),
    ...redact(context),
  };

  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: LogContext) =>
    emit("debug", message, context),
  info: (message: string, context?: LogContext) =>
    emit("info", message, context),
  warn: (message: string, context?: LogContext) =>
    emit("warn", message, context),
  error: (message: string, context?: LogContext) =>
    emit("error", message, context),

  /**
   * Error tracking. Takes the thrown value rather than a message because
   * `catch` gives `unknown`, and the stack is the part worth keeping.
   */
  report(error: unknown, context: LogContext = {}) {
    const normalised =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { name: "NonError", message: String(error) };

    emit("error", normalised.message, { ...context, error: normalised });
    // Error-tracking service goes here once one is approved.
  },
};
