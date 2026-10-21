import { auth } from "@/auth";

/** Everything under /admin needs a signed-in Redacted account; the login page itself is open. */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin/login")) return;
  if (!req.auth?.user) {
    const url = new URL("/admin/login", req.url);
    url.searchParams.set("next", pathname);
    return Response.redirect(url);
  }
});

export const config = { matcher: ["/admin/:path*"] };
