import { v } from "convex/values";
import { assertToolOwner } from "./lib/auth";
import { assertIsoDate } from "./lib/dates";
import { appError } from "./lib/errors";
import { authedMutation, authedQuery, publicQuery } from "./lib/functions";
import { declinePending, loansForTool } from "./lib/loanRules";
import { toolCardValidator, toToolCards } from "./lib/views";
import { categoryValidator, conditionValidator } from "./lib/validators";

const MAX_TOOLS = 200;

const toolInput = {
  name: v.string(),
  category: categoryValidator,
  condition: conditionValidator,
  description: v.string(),
};

function cleanText(input: { name: string; description: string }) {
  const name = input.name.trim();
  const description = input.description.trim();
  if (name.length < 2 || name.length > 80) {
    throw appError("INVALID", "Name must be between 2 and 80 characters.");
  }
  if (description.length > 500) {
    throw appError("INVALID", "Description must be 500 characters or fewer.");
  }
  return { name, description };
}

/**
 * Landing page, no sign-in needed. Data minimization: name and category only,
 * with no owner, description or availability.
 */
export const listPublic = publicQuery({
  args: {},
  returns: v.array(v.object({ _id: v.id("tools"), name: v.string(), category: categoryValidator })),
  handler: async (ctx) => {
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_removedAt_and_category", (q) => q.eq("removedAt", undefined))
      .take(MAX_TOOLS);
    return tools.map(({ _id, name, category }) => ({ _id, name, category }));
  },
});

/** All active tools with availability, optionally filtered by category. */
export const list = authedQuery({
  args: { today: v.string(), category: v.optional(categoryValidator) },
  returns: v.array(toolCardValidator),
  handler: async (ctx, { today, category }) => {
    assertIsoDate(today, "today");
    const tools =
      category === undefined
        ? await ctx.db
            .query("tools")
            .withIndex("by_removedAt_and_category", (q) => q.eq("removedAt", undefined))
            .take(MAX_TOOLS)
        : await ctx.db
            .query("tools")
            .withIndex("by_removedAt_and_category", (q) =>
              q.eq("removedAt", undefined).eq("category", category),
            )
            .take(MAX_TOOLS);
    return await toToolCards(ctx, tools, ctx.user._id, today);
  },
});

export const myListings = authedQuery({
  args: { today: v.string() },
  returns: v.array(toolCardValidator),
  handler: async (ctx, { today }) => {
    assertIsoDate(today, "today");
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_ownerId_and_removedAt", (q) =>
        q.eq("ownerId", ctx.user._id).eq("removedAt", undefined),
      )
      .order("desc")
      .take(MAX_TOOLS);
    return await toToolCards(ctx, tools, ctx.user._id, today);
  },
});

export const create = authedMutation({
  args: toolInput,
  returns: v.id("tools"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("tools", {
      ...args,
      ...cleanText(args),
      ownerId: ctx.user._id, // always the caller; never taken from args
    });
  },
});

export const update = authedMutation({
  args: { toolId: v.id("tools"), ...toolInput },
  returns: v.null(),
  handler: async (ctx, { toolId, ...fields }) => {
    await assertToolOwner(ctx, ctx.user, toolId);
    await ctx.db.patch("tools", toolId, { ...fields, ...cleanText(fields) });
    return null;
  },
});

/**
 * Owner removes their listing. Blocked while any loan is approved (current,
 * upcoming or overdue) so a borrower is never left with a vanished booking.
 * Pending requests are declined, and those borrowers get notified.
 */
export const remove = authedMutation({
  args: { toolId: v.id("tools") },
  returns: v.null(),
  handler: async (ctx, { toolId }) => {
    await assertToolOwner(ctx, ctx.user, toolId);
    const approved = await loansForTool(ctx, toolId, "approved");
    if (approved.length > 0) {
      throw appError(
        "CONFLICT",
        "This tool has an approved loan. Mark it returned before removing the listing.",
      );
    }
    await declinePending(ctx, toolId);
    await ctx.db.patch("tools", toolId, { removedAt: Date.now(), removedBy: ctx.user._id });
    return null;
  },
});
