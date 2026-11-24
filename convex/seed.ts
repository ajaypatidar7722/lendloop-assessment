import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Category, Condition } from "./lib/validators";

/**
 * Demo data for local development. Internal only, run from the CLI:
 *   npx convex run seed:demo
 * Safe to run repeatedly: it does nothing if the demo users already exist.
 *
 * Demo users have fake token identifiers ("seed|…"), so nobody can sign in as
 * them; they exist to own tools and borrow things. Their emails use the
 * reserved .test domain, so mail can only ever land in Mailpit.
 */

const DEMO_USERS = [
  { key: "alice", name: "Alice Lender", email: "alice@lendloop.test" },
  { key: "bob", name: "Bob Borrower", email: "bob@lendloop.test" },
  { key: "carol", name: "Carol Gardener", email: "carol@lendloop.test" },
] as const;

type DemoKey = (typeof DEMO_USERS)[number]["key"];

const DEMO_TOOLS: {
  owner: DemoKey;
  name: string;
  category: Category;
  condition: Condition;
  description: string;
}[] = [
  {
    owner: "alice",
    name: "Cordless drill",
    category: "power_tools",
    condition: "good",
    description: "18V with two batteries and a basic bit set.",
  },
  {
    owner: "alice",
    name: "Circular saw",
    category: "power_tools",
    condition: "like_new",
    description: "7¼-inch blade. Safety glasses included.",
  },
  {
    owner: "alice",
    name: "Camping tent (4-person)",
    category: "camping",
    condition: "fair",
    description: "Waterproof, one small patch on the rain fly.",
  },
  {
    owner: "carol",
    name: "Hedge trimmer",
    category: "garden",
    condition: "good",
    description: "Electric, 24-inch blade. Extension cord not included.",
  },
  {
    owner: "carol",
    name: "Stand mixer",
    category: "kitchen",
    condition: "like_new",
    description: "5-quart bowl with whisk, paddle and dough hook.",
  },
  {
    owner: "bob",
    name: "Pressure washer",
    category: "cleaning",
    condition: "worn",
    description: "Works fine, hose is a bit stiff.",
  },
];

/** "YYYY-MM-DD" for today (UTC) shifted by `days`. */
function isoDate(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function insertUser(ctx: MutationCtx, user: (typeof DEMO_USERS)[number]) {
  return await ctx.db.insert("users", {
    tokenIdentifier: `seed|${user.key}`,
    name: user.name,
    email: user.email,
    role: "user",
    trustedLender: false,
  });
}

export const demo = internalMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const already = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", "seed|alice"))
      .unique();
    if (already !== null) return "Demo data already present; nothing to do.";

    const userIds = {} as Record<DemoKey, Id<"users">>;
    for (const user of DEMO_USERS) userIds[user.key] = await insertUser(ctx, user);
    await ctx.db.patch("users", userIds.alice, { trustedLender: true });

    const toolIds: Id<"tools">[] = [];
    for (const { owner, ...tool } of DEMO_TOOLS) {
      toolIds.push(await ctx.db.insert("tools", { ...tool, ownerId: userIds[owner] }));
    }
    const [drill, saw, , trimmer] = toolIds;
    if (!drill || !saw || !trimmer) throw new Error("seed: tool inserts missing");

    // Overdue: Bob borrowed Alice's drill and should have returned it 3 days ago.
    // This is what the daily n8n reminder workflow will pick up.
    await ctx.db.insert("loans", {
      toolId: drill,
      ownerId: userIds.alice,
      borrowerId: userIds.bob,
      startDate: isoDate(-10),
      endDate: isoDate(-3),
      status: "approved",
      decidedAt: Date.now() - 11 * 86_400_000,
    });

    // Pending: Carol wants Alice's saw next week (shows up in "Incoming requests").
    await ctx.db.insert("loans", {
      toolId: saw,
      ownerId: userIds.alice,
      borrowerId: userIds.carol,
      startDate: isoDate(7),
      endDate: isoDate(9),
      status: "pending",
    });

    // History: Bob borrowed Carol's trimmer and returned it.
    await ctx.db.insert("loans", {
      toolId: trimmer,
      ownerId: userIds.carol,
      borrowerId: userIds.bob,
      startDate: isoDate(-20),
      endDate: isoDate(-15),
      status: "returned",
      decidedAt: Date.now() - 21 * 86_400_000,
      returnedAt: Date.now() - 15 * 86_400_000,
    });

    return `Seeded ${DEMO_USERS.length} users, ${toolIds.length} tools and 3 loans (1 overdue).`;
  },
});
