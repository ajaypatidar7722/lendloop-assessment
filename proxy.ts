import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// UX only: sends signed-in visitors from the landing page to /tools, and
// redirects signed-out users away from private pages.
// Real authorization (roles, ownership) is enforced in Convex functions.
// Keep in sync with the pages in app/(app)/ and app/admin/.
const isProtectedRoute = createRouteMatcher([
  "/tools(.*)",
  "/listings(.*)",
  "/requests(.*)",
  "/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // The landing page is for signed-out visitors; signed-in users go straight to the app.
  if (req.nextUrl.pathname === "/") {
    const { userId } = await auth();
    if (userId) return NextResponse.redirect(new URL("/tools", req.url));
  }
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
