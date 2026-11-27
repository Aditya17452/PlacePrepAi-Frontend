import { env } from "@/lib/env";

/**
 * Browser error reporting. Loaded lazily so it costs nothing when no DSN is configured.
 * PII is not sent: no default PII, and no request bodies or user emails are attached.
 */
export function initMonitoring(): void {
  if (!env.sentryDsn) return;
  void import("@sentry/react").then((Sentry) => {
    Sentry.init({
      dsn: env.sentryDsn,
      environment: env.isProd ? "production" : "development",
      sendDefaultPii: false,
      tracesSampleRate: 0.05,
    });
  });
}
