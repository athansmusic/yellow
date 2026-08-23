"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";
import { SearchPanel } from "./SiteSearch";

const POPULAR: [string, string][] = [
  ["/episodes", "Episodes"],
  ["/where", "Where to listen"],
  ["/store", "Store"],
  ["/aberrations", "Aberrations"],
  ["/cast", "Cast"],
  ["/faq", "FAQ"],
];

/** Turns "/store/spatter-hoodie-light" into "spatter hoodie light" for the search box. */
function wordsFrom(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .slice(-1)[0]
    ?.replace(/[-_]+/g, " ")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/\b(s\d+e\d+|\d{3,})\b/gi, "")
    .trim() ?? "";
}

export function NotFoundClient() {
  const pathname = usePathname() ?? "";
  const q = wordsFrom(pathname);
  const subject = encodeURIComponent(`Broken link: ${SITE.url}${pathname}`);
  return (
    <>
      <p className="mt-4 text-paper/85">
        This page doesn&apos;t exist, or it&apos;s been classified.
        {pathname && (
          <>
            {" "}
            Nothing lives at <code className="text-muted">{pathname}</code>.
          </>
        )}
      </p>

      <div className="mt-8 text-left border border-line bg-ink-2/70 p-4 sm:p-5">
        <p className="eyebrow mb-2">Search the site</p>
        <SearchPanel initial={q} autoFocus={false} />
      </div>

      <div className="mt-8">
        <p className="eyebrow mb-3">Or try one of these</p>
        <ul className="flex flex-wrap justify-center gap-2">
          {POPULAR.map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="btn btn-ghost !min-h-10 !text-base !px-4">
                {label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/" className="btn btn-yellow !min-h-10 !text-base !px-4">
              Home
            </Link>
          </li>
        </ul>
      </div>

      <p className="mt-10 text-sm text-muted">
        Followed a link here from somewhere?{" "}
        <a href={`mailto:${SITE.email}?subject=${subject}`} className="underline underline-offset-4 hover:text-yellow">
          Tell us where
        </a>{" "}
        and we&apos;ll fix it.
      </p>
    </>
  );
}
