"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LISTEN, LISTEN_BUTTONS, MORE_NAV as MORE_NAV_ALL, NAV as NAV_ALL, SOCIAL } from "@/lib/site";
import { COLLECTIONS, TAXONOMY } from "@/lib/storeTaxonomy";
import { useCart } from "@/lib/cart";
import { useMember } from "@/lib/member";
import { useUnread } from "@/lib/unread";
import { BellMenu } from "@/components/BellMenu";
import { Cart, Close, Discord, Menu, Patreon, ICONS } from "./Icons";
import { SearchButton, openSearch } from "./SiteSearch";

/** Internal link, except routes that redirect off-site (Next would try to prefetch the redirect). */
function NavA({ href, children, ...rest }: { href: string; children: React.ReactNode; className?: string; "aria-current"?: "page" }) {
  // /discord and /ks are redirects to external sites: plain anchors, new tab
  return href === "/discord" || href === "/ks" ? <a href={href} target="_blank" rel="noreferrer" {...rest}>{children}</a> : <Link href={href} {...rest}>{children}</Link>;
}

/** `soon` badges the link; `teaser` means it still has a page worth visiting. */
type MenuLink = { label: string; href: string; soon?: boolean; teaser?: boolean };
type MenuGroup = { title?: string; links: readonly MenuLink[] };

/** Hover/click menus for the main nav. Keys are the NAV hrefs. */
const MENUS: Record<string, MenuGroup[]> = {
  "/episodes": [
    {
      title: "Shows",
      links: [
        { label: "REDACTED", href: "/episodes?show=redacted" },
        { label: "Postmortem", href: "/episodes?show=postmortem" },
        { label: "The Seven Planes", href: "/episodes?show=t7p" },
        { label: "CORRUPTED", href: "/corrupted", soon: true, teaser: true },
      ],
    },
    { title: "Also", links: [{ label: "Where to listen", href: "/where" }] },
  ],
  "/store": [
    ...TAXONOMY.map((c) => ({ title: c.label, links: [{ label: `All ${c.label}`, href: `/store?c=${c.id}` }, ...c.subs.map((s) => ({ label: s.label, href: `/store?c=${c.id}&t=${s.id}` }))] })),
    { title: "Collections", links: [...COLLECTIONS.map((c) => ({ label: c.label, href: `/store?col=${c.id}` })), { label: "Store FAQ & shipping", href: "/store-faq" }] },
  ],
};

function Dropdown({ id, open, setOpen, active, label, href, groups, pathname }: { id: string; open: boolean; setOpen: (o: boolean) => void; active: boolean; label: string; href?: string; groups: readonly MenuGroup[]; pathname: string }) {
  const wide = groups.length > 2;
  const cls = `display text-xl py-2 transition-colors ${active ? "text-yellow" : "text-paper hover:text-yellow"}`;
  return (
    <li className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <div className="flex items-center">
        {href ? (
          <Link href={href} aria-current={active ? "page" : undefined} className={`${cls} pl-3 pr-1`}>
            {label}
          </Link>
        ) : (
          <button type="button" onClick={() => setOpen(!open)} aria-haspopup="true" aria-expanded={open} aria-controls={`${id}-menu`} className={`${cls} pl-3 pr-1`}>
            {label}
          </button>
        )}
        <button type="button" onClick={() => setOpen(!open)} aria-haspopup="true" aria-expanded={open} aria-controls={`${id}-menu`} aria-label={`${label} menu`} className={`${cls} pl-1 pr-3`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
      <div id={`${id}-menu`} className={`absolute left-0 top-full bg-ink-2 border border-line shadow-[0_20px_40px_rgba(0,0,0,.6)] ${open ? "grid" : "hidden"} ${wide ? "grid-flow-col auto-cols-max gap-x-8 p-5" : "min-w-52 py-2"}`}>
        {groups.map((g, gi) => (
          <div key={g.title ?? gi}>
            {g.title && <p className="eyebrow px-4 pt-1 pb-2 whitespace-nowrap">{g.title}</p>}
            <ul>
              {g.links.map((l) => {
                const on = pathname === l.href;
                return (
                  <li key={l.href}>
                    {l.soon && !l.teaser ? (
                      <span className="block px-4 py-1.5 text-sm text-muted whitespace-nowrap">
                        {l.label} <span className="text-[10px] uppercase tracking-wider">soon</span>
                      </span>
                    ) : (
                      <Link href={l.href} className={`block px-4 py-1.5 text-sm whitespace-nowrap hover:bg-ink-3 hover:text-yellow ${on ? "text-yellow" : ""}`}>
                        {l.label}
                        {l.soon && <span className="text-[10px] uppercase tracking-wider text-muted"> soon</span>}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </li>
  );
}

export function Header({ hidden = [] }: { hidden?: string[] }) {
  const NAV = NAV_ALL.filter((n) => !hidden.includes(n.href));
  const MORE_NAV = MORE_NAV_ALL.filter((n) => !hidden.includes(n.href));
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { count, ready, justAdded } = useCart();
  const member = useMember();
  // Only ever fetched for a signed-in member; a signed-out visitor makes no request and has no bell.
  const unread = useUnread(member?.signedIn);
  const panelRef = useRef<HTMLDivElement>(null);
  // The header's backdrop-blur makes it the containing block for fixed children, so the drawer portals to <body>.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Phones: slide the bar away on scroll-down, bring it back on scroll-up, so reading gets the full screen.
  const [hideBar, setHideBar] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        if (y < 80) setHideBar(false);
        else if (Math.abs(y - last) > 8) setHideBar(y > last);
        last = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Drawer: close on route change and on Escape; lock scroll while open
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const [menu, setMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Dropdowns: close on route change, outside click, or Escape
  useEffect(() => setMenu(null), [pathname]);
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => !navRef.current?.contains(e.target as Node) && setMenu(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const inStore = pathname.startsWith("/store") || pathname.startsWith("/cart") || pathname.startsWith("/checkout");

  return (
    <header className={`sticky top-0 z-50 bg-ink/95 backdrop-blur border-b border-line transition-transform duration-200 ${hideBar && !open ? "max-lg:-translate-y-full" : ""}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center shrink-0" aria-label="REDACTED home">
          <Image src="/brand/logo-nav-hd.png" alt="" width={351} height={96} priority unoptimized className="h-8 w-auto" />
        </Link>

        <nav ref={navRef} aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => {
              const active = pathname.startsWith(n.href);
              const groups = MENUS[n.href];
              if (!groups) {
                return (
                  <li key={n.href}>
                    <NavA href={n.href} aria-current={active ? "page" : undefined} className={`display text-xl px-3 py-2 block transition-colors ${active ? "text-yellow" : "text-paper hover:text-yellow"}`}>
                      {n.label}
                    </NavA>
                  </li>
                );
              }
              const id = n.href.slice(1);
              return (
                <Dropdown key={n.href} id={id} open={menu === id} setOpen={(o) => setMenu(o ? id : null)} active={active} label={n.label} href={n.href} groups={groups} pathname={pathname} />
              );
            })}
            <Dropdown id="more" open={menu === "more"} setOpen={(o) => setMenu(o ? "more" : null)} active={MORE_NAV.some((n) => pathname.startsWith(n.href))} label="More" groups={[{ links: MORE_NAV }]} pathname={pathname} />
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          {/* Discord in blurple so it stands out from the rest of the bar */}
          <a href="/discord" target="_blank" rel="noreferrer" className="hidden lg:inline-flex items-center gap-2 display text-xl px-3 py-1.5 bg-[#5865F2] text-white border border-[#5865F2] hover:bg-[#4752C4] hover:border-[#4752C4] transition-colors">
            <Discord width={16} height={16} /> Discord
          </a>
          {/* Signed-in members see themselves here instead of the Patreon prompt: it is the only
              place on the site that tells you your membership is actually live. */}
          {member?.signedIn ? (
            /* Hover (and keyboard focus) opens the member menu. Rendered only inside this branch,
               so nothing here can leak to a signed-out visitor. Pure CSS rather than the nav's
               click-driven Dropdown: there is no page behind the badge to click through to, and a
               menu that needs no state cannot get stuck open on route changes. */
            <div className="relative hidden lg:flex items-center gap-2 mr-2 group">
              <BellMenu />
              <Link
                href="/account"
                aria-haspopup="true"
                className="inline-flex items-center gap-2 display text-xl px-3 py-1.5 text-yellow border border-yellow/70 group-hover:bg-yellow group-hover:text-ink group-focus-within:bg-yellow group-focus-within:text-ink transition-colors max-w-48"
              >
                <span className="truncate">{member.name ?? "Account"}</span>
              </Link>
              <div className="absolute right-0 top-full min-w-44 bg-ink-2 border border-line shadow-[0_20px_40px_rgba(0,0,0,.6)] hidden group-hover:block group-focus-within:block">
                <Link href="/account" className="block px-4 py-2 text-[15px] text-paper/85 hover:text-yellow hover:bg-ink-3">
                  Account
                </Link>
                <Link href="/feeds" className="block px-4 py-2 text-[15px] text-paper/85 hover:text-yellow hover:bg-ink-3">
                  Feeds
                </Link>
              </div>
            </div>
          ) : (
            <a href={LISTEN.patreon} target="_blank" rel="noreferrer" className="hidden lg:inline-flex items-center gap-2 display text-xl px-3 py-1.5 mr-2 text-yellow border border-yellow/70 hover:bg-yellow hover:text-ink transition-colors">
              <Patreon width={16} height={16} /> Patreon
            </a>
          )}

          {/* The bell again for phones, where the desktop bar is hidden — a notification you have to
              open a drawer to discover is not really a notification. Signed-in only, same as above. */}
          {member?.signedIn && (
            <div className="lg:hidden">
              <BellMenu />
            </div>
          )}

          <SearchButton className="p-2 text-paper hover:text-yellow" />
          <Link
            href="/cart"
            aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
            className={`relative p-2 -mr-1 ${inStore || count ? "text-yellow" : "text-paper"} hover:text-yellow`}
          >
            <Cart width={24} height={24} />
            {ready && count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 grid place-items-center rounded-full bg-red text-white text-[11px] font-bold tabular">
                {count}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Open menu"
            className="lg:hidden p-2 text-paper hover:text-yellow"
          >
            <Menu width={26} height={26} />
          </button>
        </div>
      </div>

      {/* Added-to-cart toast */}
      <div aria-live="polite" className="sr-only">
        {justAdded ? `${justAdded.name} added to cart` : ""}
      </div>
      {justAdded && (
        <div className="absolute right-4 top-[4.25rem] z-50 w-[min(22rem,calc(100vw-2rem))] bg-ink-2 border border-yellow p-3 flex gap-3 items-center shadow-xl">
          {justAdded.image && <Image src={justAdded.image} alt="" width={56} height={56} className="w-14 h-14 object-cover bg-ink" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{justAdded.name}</p>
            <p className="text-xs text-muted truncate">{justAdded.variantLabel ?? "Added to cart"}</p>
          </div>
          <Link href="/cart" className="btn btn-yellow !min-h-9 !px-3 !text-base">
            Cart
          </Link>
        </div>
      )}

      {/* Mobile drawer (portaled to body, see `mounted`) */}
      {mounted &&
        createPortal(
      <div
        id="mobile-nav"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`lg:hidden fixed inset-0 z-50 transition ${open ? "visible" : "invisible"}`}
      >
        <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className={`absolute inset-0 bg-black/70 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} />
        <div
          className={`absolute right-0 top-0 h-full w-[min(22rem,88vw)] bg-ink-2 border-l border-line flex flex-col transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="h-16 px-4 flex items-center justify-between border-b border-line">
            <Image src="/brand/logo-nav.avif" alt="REDACTED" width={150} height={40} className="h-7 w-auto" />
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="p-2 hover:text-yellow">
              <Close width={24} height={24} />
            </button>
          </div>
          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-4 py-4">
            {/* Listen now */}
            <div className="border border-yellow/60 bg-yellow/5 p-3">
              <Link href="/episodes" className="btn btn-yellow w-full !min-h-11 !text-xl">
                Listen now
              </Link>
              <div className="mt-3 flex items-center justify-between gap-1">
                {LISTEN_BUTTONS.map((l) => {
                  const I = ICONS[l.icon];
                  return (
                    <a key={l.name} href={l.href} target="_blank" rel="noreferrer" aria-label={`Listen on ${l.name}`} className="on-dark flex-1 grid place-items-center h-10 border border-line hover:border-yellow hover:text-yellow">
                      <I width={18} height={18} />
                    </a>
                  );
                })}
                <Link href="/where" className="flex-1 grid place-items-center h-10 text-[10px] font-bold uppercase tracking-wider border border-line hover:border-yellow hover:text-yellow">
                  All
                </Link>
              </div>
            </div>

            <div className="mt-4 -mx-2">
              {NAV.map((n) => {
                const active = pathname.startsWith(n.href);
                return (
                  <NavA key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={`display block text-3xl px-2 py-2.5 ${active ? "text-yellow" : "text-paper"} hover:text-yellow`}>
                    {n.label}
                  </NavA>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setTimeout(openSearch, 250);
                }}
                className="display block w-full text-left text-3xl px-2 py-2.5 text-paper hover:text-yellow"
              >
                Search
              </button>
              <Link href="/cart" className={`display block text-3xl px-2 py-2.5 ${pathname.startsWith("/cart") ? "text-yellow" : "text-paper"} hover:text-yellow`}>
                Cart{ready && count > 0 ? ` (${count})` : ""}
              </Link>
            </div>

            <p className="eyebrow pt-5 pb-2">More</p>
            <div className="grid grid-cols-2 gap-x-4">
              {MORE_NAV.map((n) => {
                const active = n.href.includes("?") ? false : pathname.startsWith(n.href);
                return (
                  <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={`block text-[15px] py-2 ${active ? "text-yellow" : "text-paper/85"} hover:text-yellow`}>
                    {n.label}
                  </Link>
                );
              })}
              <Link href="/assets" className="block text-[15px] py-2 text-paper/85 hover:text-yellow">
                Brand assets
              </Link>
            </div>

            {/* The drawer is the only nav on small screens, so the member links belong here too —
                and, like the badge, only for someone actually signed in. */}
            {member?.signedIn && (
              <div className="mt-5 pt-4 border-t border-line grid gap-1">
                <Link href="/account" className="block text-[15px] py-2 text-paper/85 hover:text-yellow">
                  Account
                </Link>
                <Link href="/feeds" className="block text-[15px] py-2 text-paper/85 hover:text-yellow">
                  Feeds
                </Link>
                <Link href="/account#comments" className="flex items-center gap-2 text-[15px] py-2 text-paper/85 hover:text-yellow">
                  Replies
                  {unread > 0 && (
                    <span className="min-w-5 bg-yellow px-1.5 text-center text-[11px] font-bold leading-5 text-ink tabular">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <a href="/discord" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 display text-xl px-4 py-2 border border-[#5865F2] text-[#8b9dff] hover:bg-[#5865F2] hover:text-white">
                <Discord width={16} height={16} /> Discord
              </a>
              {/* Same swap the desktop bar makes: a signed-in member is shown themselves, not an
                  invitation to subscribe somewhere they already have. */}
              {member?.signedIn ? (
                <Link href="/account" className="inline-flex items-center gap-2 display text-xl px-4 py-2 border border-yellow/70 text-yellow hover:bg-yellow hover:text-ink max-w-[15rem]">
                  <span className="truncate">{member.name ?? "Account"}</span>
                </Link>
              ) : (
              <a href={LISTEN.patreon} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 display text-xl px-4 py-2 border border-yellow/70 text-yellow hover:bg-yellow hover:text-ink">
                <Patreon width={16} height={16} /> Patreon
              </a>
              )}
            </div>
          </nav>
          <div className="px-2 py-3 border-t border-line flex flex-wrap gap-1">
            {SOCIAL.map((s) => {
              const I = ICONS[s.icon];
              return (
                <a key={s.name} href={s.href} target="_blank" rel="noreferrer" aria-label={s.name} className="p-3 text-muted hover:text-yellow">
                  <I width={22} height={22} />
                </a>
              );
            })}
          </div>
        </div>
      </div>,
          document.body,
        )}
    </header>
  );
}
