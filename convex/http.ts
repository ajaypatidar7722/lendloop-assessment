import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { env, httpAction, type ActionCtx } from "./_generated/server";
import { todayUtc } from "./lib/dates";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verify } from "./lib/hmac";

// Endpoints n8n calls (n8n → Convex). Served at `${CONVEX_SITE_URL}/n8n/...`.
//
// Every request must carry X-LendLoop-Timestamp + X-LendLoop-Signature, an
// HMAC-SHA256 over `${timestamp}.${rawBody}` with LENDLOOP_INBOUND_SECRET
// (a different secret from the outbound one). Unsigned, tampered, stale or
// oversized requests are rejected before any database access. Error bodies are
// deliberately generic.

const MAX_BODY_BYTES = 16 * 1024;
const MAX_TEXT = 1000;

const http = httpRouter();

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** Returns the raw body if the signature checks out, otherwise the error response to send. */
async function authenticate(req: Request): Promise<{ body: string } | { error: Response }> {
  const secret = env.LENDLOOP_INBOUND_SECRET;
  if (!secret) {
    console.error("[http] LENDLOOP_INBOUND_SECRET is not set; rejecting n8n request.");
    return { error: json(503, { error: "unavailable" }) };
  }
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return { error: json(413, { error: "too large" }) };
  const body = await req.text();
  if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) {
    return { error: json(413, { error: "too large" }) };
  }
  const ok = await verify(
    secret,
    req.headers.get(TIMESTAMP_HEADER),
    body,
    req.headers.get(SIGNATURE_HEADER),
  );
  return ok ? { body } : { error: json(401, { error: "unauthorized" }) };
}

/** Wraps a handler with signature verification and JSON-object parsing. */
function signedEndpoint(
  handler: (ctx: ActionCtx, body: Record<string, unknown>) => Promise<Response>,
) {
  return httpAction(async (ctx, req) => {
    const auth = await authenticate(req);
    if ("error" in auth) return auth.error;
    let parsed: unknown;
    try {
      parsed = auth.body === "" ? {} : JSON.parse(auth.body);
    } catch {
      return json(400, { error: "invalid body" });
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return json(400, { error: "invalid body" });
    }
    return await handler(ctx, parsed as Record<string, unknown>);
  });
}

// ── Body field helpers: narrow `unknown` input, return undefined if invalid ──

/** An identifier-like string: rejected (undefined) if missing, not a string, or too long. */
function text(body: Record<string, unknown>, key: string, max: number): string | undefined {
  const value = body[key];
  return typeof value === "string" && value.length > 0 && value.length <= max ? value : undefined;
}

/** Free text (error messages, details): truncated rather than rejected, so nothing is lost. */
function note(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  return typeof value === "string" && value.length > 0 ? value.slice(0, MAX_TEXT) : undefined;
}

function status(body: Record<string, unknown>): "sent" | "failed" | undefined {
  const value = body.status;
  return value === "sent" || value === "failed" ? value : undefined;
}

// ── Routes ───────────────────────────────────────────────────────────────────

/** Daily reminder workflow: today's overdue loans that haven't been reminded yet. */
http.route({
  path: "/n8n/overdue-loans",
  method: "GET",
  handler: signedEndpoint(async (ctx) => {
    const today = todayUtc();
    const loans = await ctx.runQuery(internal.automation.overdueLoans, { today });
    return json(200, { date: today, loans });
  }),
});

/** Write-back after each reminder email: idempotent on idempotencyKey. */
http.route({
  path: "/n8n/reminders",
  method: "POST",
  handler: signedEndpoint(async (ctx, body) => {
    const loanId = text(body, "loanId", 64);
    const idempotencyKey = text(body, "idempotencyKey", 200);
    const outcome = status(body);
    if (!loanId || !idempotencyKey || !outcome) return json(400, { error: "invalid body" });
    const result = await ctx.runMutation(internal.automation.recordReminder, {
      loanId,
      idempotencyKey,
      status: outcome,
      detail: note(body, "detail"),
    });
    return result.ok ? json(200, { outcome: result.outcome }) : json(404, { error: "not found" });
  }),
});

/** Request-notification workflow confirms it notified someone (or failed to). */
http.route({
  path: "/n8n/automation-events",
  method: "POST",
  handler: signedEndpoint(async (ctx, body) => {
    const eventId = text(body, "eventId", 200);
    const outcome = status(body);
    if (!eventId || !outcome) return json(400, { error: "invalid body" });
    const result = await ctx.runMutation(internal.automation.recordNotification, {
      eventId,
      status: outcome,
      detail: note(body, "detail"),
    });
    return result.ok ? json(200, { outcome: result.outcome }) : json(404, { error: "not found" });
  }),
});

/** Error workflow reports a failed n8n execution so it's visible in the app. */
http.route({
  path: "/n8n/workflow-errors",
  method: "POST",
  handler: signedEndpoint(async (ctx, body) => {
    const workflowName = text(body, "workflowName", 200);
    const executionId = text(body, "executionId", 100);
    if (!workflowName || !executionId) return json(400, { error: "invalid body" });
    const result = await ctx.runMutation(internal.automation.recordWorkflowError, {
      workflowName,
      executionId,
      message: note(body, "message") ?? "(no message)",
      nodeName: note(body, "nodeName"),
    });
    return json(200, result);
  }),
});

export default http;
