import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// UX only: redirects signed-out users away from private pages.
// Real authorization (roles, ownership) is enforced in Convex functions.
const isProtectedRoute = createRouteMatcher(["/app(.*)", "/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
