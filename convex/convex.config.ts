import { defineApp } from "convex/server";
import { v } from "convex/values";

// Typed deployment env vars, read via `env` from ./_generated/server.
// Set them with `npx convex env set NAME value`; they never live in the repo.
const app = defineApp({
  env: {
    // Convex signs outbound webhooks with this; n8n verifies.
    LENDLOOP_OUTBOUND_SECRET: v.optional(v.string()),
    // n8n signs calls to convex/http.ts with this; Convex verifies.
    LENDLOOP_INBOUND_SECRET: v.optional(v.string()),
    // The n8n request-notification webhook (public tunnel URL + webhook path).
    N8N_NOTIFY_WEBHOOK_URL: v.optional(v.string()),
  },
});

export default app;
