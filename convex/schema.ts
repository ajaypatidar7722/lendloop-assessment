import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  automationKindValidator,
  automationStatusValidator,
  categoryValidator,
  conditionValidator,
  deliveryStatusValidator,
  isoDateValidator,
  loanStatusValidator,
  roleValidator,
} from "./lib/validators";

export default defineSchema({
  // One row per Clerk user, created on first sign-in by users.store.
  // `role` lives here (not in Clerk) so authorization is decided where the data is.
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    // Clerk's first name as entered (may contain spaces, e.g. "Mary Ann").
    // Optional so rows created before it existed stay valid; see displayFirstName.
    firstName: v.optional(v.string()),
    email: v.string(),
    role: roleValidator,
    trustedLender: v.boolean(),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_email", ["email"]),

  // Soft-deleted via removedAt so loan history keeps pointing at a real tool.
  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
    description: v.string(),
    removedAt: v.optional(v.number()),
    removedBy: v.optional(v.id("users")),
  })
    .index("by_removedAt_and_category", ["removedAt", "category"])
    .index("by_ownerId_and_removedAt", ["ownerId", "removedAt"]),

  loans: defineTable({
    toolId: v.id("tools"),
    ownerId: v.id("users"), // denormalized from the tool for "incoming requests" lookups
    borrowerId: v.id("users"),
    startDate: isoDateValidator,
    endDate: isoDateValidator,
    status: loanStatusValidator,
    decidedAt: v.optional(v.number()),
    returnedAt: v.optional(v.number()),
  })
    .index("by_toolId_and_status", ["toolId", "status"])
    .index("by_ownerId_and_status", ["ownerId", "status"])
    .index("by_borrowerId_and_status", ["borrowerId", "status"])
    .index("by_status_and_endDate", ["status", "endDate"]),

  // What n8n did for a loan (notification sent, reminder sent/failed).
  // idempotencyKey is unique by construction: write-backs upsert on it.
  automationEvents: defineTable({
    loanId: v.id("loans"),
    kind: automationKindValidator,
    status: automationStatusValidator,
    idempotencyKey: v.string(),
    detail: v.optional(v.string()),
    occurredAt: v.number(),
  })
    .index("by_idempotencyKey", ["idempotencyKey"])
    .index("by_loanId", ["loanId"]),

  // Transactional outbox for Convex → n8n webhooks. `body` is the exact JSON
  // that gets signed, so every retry sends byte-identical content.
  webhookDeliveries: defineTable({
    eventId: v.string(),
    eventType: v.string(),
    loanId: v.id("loans"),
    body: v.string(),
    attempts: v.number(),
    status: deliveryStatusValidator,
    lastError: v.optional(v.string()),
    nextAttemptAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
  })
    .index("by_eventId", ["eventId"])
    .index("by_status", ["status"])
    .index("by_loanId_and_status", ["loanId", "status"]),

  // Reported by the n8n error workflow; executionId makes retries idempotent.
  workflowErrors: defineTable({
    workflowName: v.string(),
    executionId: v.string(),
    nodeName: v.optional(v.string()),
    message: v.string(),
    occurredAt: v.number(),
  }).index("by_executionId", ["executionId"]),
});
