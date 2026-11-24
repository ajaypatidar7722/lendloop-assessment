/**
 * Calls a Convex n8n endpoint signed exactly like n8n does, for testing
 * convex/http.ts without n8n. Reads CONVEX_SITE_URL and LENDLOOP_INBOUND_SECRET
 * from n8n/.env, so no secret is ever typed on the command line.
 *
 *   node scripts/sign-and-send.mts GET  /n8n/overdue-loans
 *   node scripts/sign-and-send.mts POST /n8n/workflow-errors '{"workflowName":"test","executionId":"1","message":"boom"}'
 *   node scripts/sign-and-send.mts GET  /n8n/overdue-loans --bad-signature   # expect 401
 *   node scripts/sign-and-send.mts GET  /n8n/overdue-loans --stale           # expect 401
 *
 * Needs Node 22.18+ (runs TypeScript directly).
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

function readEnv(path: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match?.[1] && match[2] !== undefined) vars[match[1]] = match[2];
  }
  return vars;
}

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const [method = "GET", path, body = ""] = args.filter((a) => !a.startsWith("--"));
if (!path) {
  console.error(
    "Usage: node scripts/sign-and-send.mts <GET|POST> <path> [json] [--bad-signature] [--stale]",
  );
  process.exit(1);
}

const env = readEnv("n8n/.env");
const siteUrl = env.CONVEX_SITE_URL?.replace(/\/$/, "");
const secret = env.LENDLOOP_INBOUND_SECRET;
if (!siteUrl || !secret) {
  console.error("CONVEX_SITE_URL and LENDLOOP_INBOUND_SECRET must be set in n8n/.env");
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000) - (flags.has("--stale") ? 600 : 0);
const timestamp = String(now);
const signature = flags.has("--bad-signature")
  ? "0".repeat(64)
  : createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

const res = await fetch(`${siteUrl}${path}`, {
  method,
  headers: {
    "Content-Type": "application/json",
    "X-LendLoop-Timestamp": timestamp,
    "X-LendLoop-Signature": signature,
  },
  body: method === "GET" ? undefined : body,
});
console.log(res.status, res.statusText);
console.log(await res.text());
