import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { assertIsoDate } from "./lib/dates";
import { appError } from "./lib/errors";
import { adminMutation, adminQuery } from "./lib/functions";
import { declinePending } from "./lib/loanRules";
import { userLoader } from "./lib/views";
import { loanStatusValidator, roleValidator } from "./lib/validators";

// Everything here requires role "admin", enforced by the adminQuery/adminMutation
// wrappers, not just by hiding the admin page in the UI.

const personValidator = v.object({ name: v.string(), email: v.string() });

const adminLoanValidator = v.object({
  _id: v.id("loans"),
  _creationTime: v.number(),
  toolName: v.string(),
  owner: personValidator,
  borrower: personValidator,
  status: loanStatusValidator,
  startDate: v.string(),
  endDate: v.string(),
  isOverdue: v.boolean(),
});

/** Every loan, newest first, or filtered by status (then ordered by end date). */
export const allLoans = adminQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    today: v.string(),
    status: v.optional(loanStatusValidator),
  },
  returns: paginationResultValidator(adminLoanValidator),
  handler: async (ctx, { paginationOpts, today, status }) => {
    assertIsoDate(today, "today");
    const result =
      status === undefined
        ? await ctx.db.query("loans").order("desc").paginate(paginationOpts)
        : await ctx.db
            .query("loans")
            .withIndex("by_status_and_endDate", (q) => q.eq("status", status))
            .paginate(paginationOpts);

    const getUser = userLoader(ctx);
    const person = async (id: Parameters<typeof getUser>[0]) => {
      const user = await getUser(id);
      return user ? { name: user.name, email: user.email } : { name: "Deleted user", email: "" };
    };

    const page = [];
    for (const loan of result.page) {
      const tool = await ctx.db.get("tools", loan.toolId);
      page.push({
        _id: loan._id,
        _creationTime: loan._creationTime,
        toolName: tool?.name ?? "Removed tool",
        owner: await person(loan.ownerId),
        borrower: await person(loan.borrowerId),
        status: loan.status,
        startDate: loan.startDate,
        endDate: loan.endDate,
        isOverdue: loan.status === "approved" && loan.endDate < today,
      });
    }
    return { ...result, page };
  },
});

/** For the Trusted Lender toggles on the admin page. */
export const listUsers = adminQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      email: v.string(),
      role: roleValidator,
      trustedLender: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(500);
    return users.map(({ _id, name, email, role, trustedLender }) => ({
      _id,
      name,
      email,
      role,
      trustedLender,
    }));
  },
});

/**
 * Moderation: an admin can remove any listing, even one that's on loan (the
 * loan record stays for history). Pending requests are declined. Soft delete
 * with removedBy keeps an audit trail of who removed it.
 */
export const removeTool = adminMutation({
  args: { toolId: v.id("tools") },
  returns: v.null(),
  handler: async (ctx, { toolId }) => {
    const tool = await ctx.db.get("tools", toolId);
    if (tool === null || tool.removedAt !== undefined)
      throw appError("NOT_FOUND", "Tool not found.");
    await declinePending(ctx, toolId);
    await ctx.db.patch("tools", toolId, { removedAt: Date.now(), removedBy: ctx.user._id });
    return null;
  },
});
