import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { Container } from "@/components/ui";
import { logout } from "./actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const LINKS = [
  ["/admin", "Overview"],
  ["/admin/featured", "Featured products"],
  ["/admin/store-copy", "Store copy"],
  ["/admin/transcripts", "Transcripts"],
  ["/admin/aberrations", "Aberrations"],
  ["/admin/like", "If you like…"],
  ["/admin/settings", "Settings"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <Container className="py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <nav aria-label="Admin" className="flex flex-wrap gap-1">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="display text-xl px-3 py-1.5 hover:text-yellow">
              {label}
            </Link>
          ))}
        </nav>
        {session?.user && (
          <form action={logout} className="flex items-center gap-3 text-sm text-muted">
            <span>{session.user.email}</span>
            <button type="submit" className="underline hover:text-yellow">
              Sign out
            </button>
          </form>
        )}
      </div>
      <div className="mt-8">{children}</div>
    </Container>
  );
}
