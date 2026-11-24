import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { env, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { EVENT_ID_HEADER, nowSeconds, sign, SIGNATURE_HEADER, TIMESTAMP_HEADER } from "./lib/hmac";
import schema from "./schema";

// Outbound delivery for the transactional outbox (see lib/notify.ts).
// Actions aren't transactional, so all state changes happen in the small
// internal mutations below; the action only signs, sends and reports back.

/** Waits before attempts 2, 3 and 4. After the 4th failure the delivery is marked failed. */
const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000];
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ERROR_LENGTH = 500;

export const deliver = internalAction({
  args: { deliveryId: v.id("webhookDeliveries") },
  returns: v.null(),
  handler: async (ctx, { deliveryId }) => {
    const delivery: Doc<"webhookDeliveries"> | null = await ctx.runQuery(
      internal.webhooks.getDelivery,
      { deliveryId },
    );
    if (delivery === null || delivery.status !== "pending") return null;

    // Any failure, including a thrown error, goes through recordFailure, so a
    // delivery can't get stuck in "pending" without a retry scheduled.
    let error: string | null = null;
    try {
      const url = env.N8N_NOTIFY_WEBHOOK_URL;
      const secret = env.LENDLOOP_OUTBOUND_SECRET;
      if (!url || !secret) {
        error = "N8N_NOTIFY_WEBHOOK_URL or LENDLOOP_OUTBOUND_SECRET is not set in Convex env.";
      } else {
        const timestamp = nowSeconds();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              [EVENT_ID_HEADER]: delivery.eventId,
              [TIMESTAMP_HEADER]: timestamp,
              [SIGNATURE_HEADER]: await sign(secret, timestamp, delivery.body),
            },
            body: delivery.body,
            signal: controller.signal,
          });
          if (!res.ok) error = `n8n responded ${res.status} ${res.statusText}`.trim();
        } finally {
          clearTimeout(timer);
        }
      }
    } catch (e) {
      error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }

    if (error === null) {
      await ctx.runMutation(internal.webhooks.markDelivered, { deliveryId });
    } else {
      await ctx.runMutation(internal.webhooks.recordFailure, {
        deliveryId,
        error: error.slice(0, MAX_ERROR_LENGTH),
      });
    }
    return null;
  },
});

export const getDelivery = internalQuery({
  args: { deliveryId: v.id("webhookDeliveries") },
  returns: v.union(v.null(), schema.doc("webhookDeliveries")),
  handler: async (ctx, { deliveryId }) => await ctx.db.get("webhookDeliveries", deliveryId),
});

export const markDelivered = internalMutation({
  args: { deliveryId: v.id("webhookDeliveries") },
  returns: v.null(),
  handler: async (ctx, { deliveryId }) => {
    const delivery = await ctx.db.get("webhookDeliveries", deliveryId);
    if (delivery === null || delivery.status !== "pending") return null;
    await ctx.db.patch("webhookDeliveries", deliveryId, {
      status: "delivered",
      attempts: delivery.attempts + 1,
      deliveredAt: Date.now(),
      lastError: undefined,
      nextAttemptAt: undefined,
    });
    return null;
  },
});

/** Counts the attempt, then schedules the next one or gives up and marks it failed. */
export const recordFailure = internalMutation({
  args: { deliveryId: v.id("webhookDeliveries"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, { deliveryId, error }) => {
    const delivery = await ctx.db.get("webhookDeliveries", deliveryId);
    if (delivery === null || delivery.status !== "pending") return null;
    const attempts = delivery.attempts + 1;
    const wait = BACKOFF_MS[attempts - 1];

    if (wait === undefined) {
      await ctx.db.patch("webhookDeliveries", deliveryId, {
        status: "failed",
        attempts,
        lastError: error,
        nextAttemptAt: undefined,
      });
      console.error(`[webhooks] ${delivery.eventId} failed after ${attempts} attempts: ${error}`);
      return null;
    }

    await ctx.db.patch("webhookDeliveries", deliveryId, {
      attempts,
      lastError: error,
      nextAttemptAt: Date.now() + wait,
    });
    await ctx.scheduler.runAfter(wait, internal.webhooks.deliver, { deliveryId });
    console.warn(`[webhooks] ${delivery.eventId} attempt ${attempts} failed, retrying: ${error}`);
    return null;
  },
});
