/**
 * Single source of truth for build-time configuration.
 *
 * Every `import.meta.env` read in the app goes through here. In a production build a
 * missing API URL is a deployment error, so we fail loudly instead of silently calling
 * http://localhost:8000 from a user's browser.
 */

const isProd = import.meta.env.PROD;

function read(name: string, fallback?: string): string {
  const value = (import.meta.env[name] as string | undefined)?.trim();
  if (value) return value.replace(/\/+$/, "");
  if (isProd && fallback === undefined) {
    throw new Error(
      `Missing required environment variable ${name}. Set it in Vercel → Project → Settings → Environment Variables.`,
    );
  }
  return fallback ?? "";
}

export const env = {
  /** Base URL of the backend API, including the `/api` prefix. */
  apiBaseUrl: read("VITE_API_BASE_URL", isProd ? undefined : "http://localhost:8000/api"),
  /** Optional: chatbot webhook. The widget hides itself when unset. */
  chatbotWebhookUrl: read("VITE_CHATBOT_WEBHOOK_URL", ""),
  /** Optional: Sentry DSN for the browser. */
  sentryDsn: read("VITE_SENTRY_DSN", ""),
  isProd,
} as const;
