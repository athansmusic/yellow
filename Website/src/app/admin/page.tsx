import Link from "next/link";
import { getDoc } from "@/lib/content";

export default async function AdminHome() {
  const [featured, aberrations, like, settings, storeCopy] = await Promise.all([getDoc("featured"), getDoc("aberrations"), getDoc("like"), getDoc("settings"), getDoc("storeCopy")]);
  const store = process.env.BLOB_READ_WRITE_TOKEN ? "Vercel Blob" : "local files in src/data";
  const storeCopyCount = Object.keys(storeCopy).length;
  const cards = [
    { href: "/admin/featured", t: "Featured products", d: `${featured.slugs.length} of 4 picked for the home page rail.` },
    { href: "/admin/store-copy", t: "Store copy", d: `${storeCopyCount} product${storeCopyCount === 1 ? "" : "s"} have custom copy.` },
    { href: "/admin/aberrations", t: "Aberrations", d: `${aberrations.length} file${aberrations.length === 1 ? "" : "s"}.` },
    { href: "/admin/like", t: "If you like…", d: `${like.length} comparison page${like.length === 1 ? "" : "s"}.` },
    { href: "/admin/settings", t: "Settings", d: `${settings.seasonLabel}: ${settings.seasonStatus}. Promo code ${settings.promoEnabled && settings.promoCode ? settings.promoCode : "off"}.` },
  ];
  return (
    <div>
      <p className="eyebrow">Overview</p>
      <h1 className="display text-5xl mt-2">Admin</h1>
      <p className="mt-3 text-sm text-muted">Edits save to {store} and show on the site within a minute.</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="block border border-line bg-ink-2 p-5 h-full hover:border-yellow">
              <p className="display text-2xl">{c.t}</p>
              <p className="mt-2 text-sm text-paper/80">{c.d}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
