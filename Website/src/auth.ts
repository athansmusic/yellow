import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/** Who may use /admin: any Google account on the show's domain (Workspace). Override with ADMIN_EMAIL_DOMAIN or ADMIN_EMAILS (comma list). */
const DOMAIN = (process.env.ADMIN_EMAIL_DOMAIN ?? "theredactedunit.com").toLowerCase();
const EXTRA = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email?: string | null) {
  const e = (email ?? "").toLowerCase();
  return !!e && (e.endsWith(`@${DOMAIN}`) || EXTRA.includes(e));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [Google({ authorization: { params: { prompt: "select_account", hd: DOMAIN } } })],
  pages: { signIn: "/admin/login", error: "/admin/login" },
  session: { strategy: "jwt" },
  callbacks: {
    signIn: ({ profile }) => isAdminEmail(profile?.email),
    authorized: ({ auth }) => isAdminEmail(auth?.user?.email),
  },
});
