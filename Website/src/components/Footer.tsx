import Link from "next/link";
import Image from "next/image";
import { EXTERNAL, LISTEN, SITE, SOCIAL } from "@/lib/site";
import { ICONS } from "./Icons";

const LISTEN_LINKS = [
  { name: "Spotify", href: LISTEN.spotify },
  { name: "Apple Podcasts", href: LISTEN.apple },
  { name: "YouTube", href: LISTEN.youtube },
  { name: "RSS", href: LISTEN.rss },
  { name: "Patreon", href: LISTEN.patreon },
];

const SITE_LINKS = [
  { label: "Episodes", href: "/episodes" },
  { label: "Cast", href: "/cast" },
  { label: "Store", href: "/store" },
  { label: "Discord", href: "/discord" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Bingo", href: "/bingo" },
  { label: "Fan wiki", href: EXTERNAL.wiki },
];

function NavA({ href, children, ...rest }: { href: string; children: React.ReactNode; className?: string }) {
  return href.startsWith("http") ? <a href={href} target="_blank" rel="noreferrer" {...rest}>{children}</a> : href === "/discord" || href === "/ks" ? <a href={href} target="_blank" rel="noreferrer" {...rest}>{children}</a> : <Link href={href} {...rest}>{children}</Link>;
}

export function Footer({ hidden = [] }: { hidden?: string[] }) {
  const links = SITE_LINKS.filter((n) => !hidden.includes(n.href));
  const showPartner = !hidden.includes("/partner");
  return (
    <footer className="relative z-10 mt-24 border-t border-line bg-ink/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid gap-x-6 gap-y-10 grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_0.8fr_1.4fr]">
        <div className="col-span-2 lg:col-span-1">
          <Image src="/brand/logo-nav.avif" alt="REDACTED" width={180} height={48} className="h-9 w-auto" />
          <p className="mt-4 text-sm text-muted max-w-xs">A horror comedy audio drama. New episodes {SITE.schedule}.</p>
          <div className="mt-5 flex gap-1 -ml-2">
            {SOCIAL.map((s) => {
              const I = ICONS[s.icon];
              return (
                <a key={s.name} href={s.href} target="_blank" rel="noreferrer" aria-label={s.name} className="p-2 text-muted hover:text-yellow">
                  <I width={20} height={20} />
                </a>
              );
            })}
          </div>
          <a href={`mailto:${SITE.email}`} className="mt-5 inline-block text-sm text-paper hover:text-yellow underline underline-offset-4">
            {SITE.email}
          </a>
        </div>

        <FootCol title="Site">
          {links.map((n) => (
            <NavA key={n.href} href={n.href} className="hover:text-yellow">
              {n.label}
            </NavA>
          ))}
        </FootCol>

        <FootCol title="Listen">
          <Link href="/where" className="text-yellow hover:text-paper">
            All apps
          </Link>
          {LISTEN_LINKS.map((l) => (
            <a key={l.name} href={l.href} target="_blank" rel="noreferrer" className="hover:text-yellow">
              {l.name}
            </a>
          ))}
        </FootCol>

        {showPartner && (
        <div className="col-span-2 lg:col-span-1 border border-line bg-ink-2/70 p-5">
          <p className="eyebrow mb-1">Sponsors & press</p>
          <p className="display text-3xl leading-none">Partner with us</p>
          <p className="mt-2 text-sm text-muted">Host-read sponsorships, in-universe placements, and press resources.</p>
          <Link href="/partner" className="btn btn-yellow mt-4 !min-h-10 !text-lg">
            Partner with REDACTED
          </Link>
        </div>
        )}
      </div>

      <div className="border-t border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted">
          <div className="flex items-center gap-4">
            <a href={SITE.studio.url} target="_blank" rel="noreferrer" aria-label={SITE.studio.name} className="opacity-70 hover:opacity-100">
              <Image src="/brand/hush.avif" alt="" width={2000} height={2000} sizes="56px" className="h-7 w-auto" />
            </a>
            <a href={SITE.network.url} target="_blank" rel="noreferrer" aria-label={SITE.network.name} className="opacity-70 hover:opacity-100">
              <Image src="/brand/rustyquill.png" alt="" width={1446} height={158} sizes="120px" className="h-4 sm:h-5 w-auto max-w-[120px] object-contain" />
            </a>
          </div>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1 sm:ml-auto">
            <Link href="/privacy" className="hover:text-yellow">Privacy</Link>
            <Link href="/store-faq" className="hover:text-yellow">Store FAQ &amp; shipping</Link>
            <Link href="/store-terms" className="hover:text-yellow">Terms &amp; returns</Link>
            <Link href="/assets" className="hover:text-yellow">Brand assets</Link>
            <Link href="/supporter-wall" className="hover:text-yellow">Supporters</Link>
          </nav>
          <p>© {new Date().getFullYear()} Hush Studios</p>
        </div>
      </div>
    </footer>
  );
}

function FootCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav aria-label={title} className="grid content-start gap-2 text-sm">
      <p className="eyebrow mb-1">{title}</p>
      {children}
    </nav>
  );
}
