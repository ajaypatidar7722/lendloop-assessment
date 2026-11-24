import type { AuthConfig } from "convex/server";

// Convex verifies every Clerk JWT itself: the issuer must match `domain`
// and the token audience must be "convex". Nothing about identity is
// trusted from the client.
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
