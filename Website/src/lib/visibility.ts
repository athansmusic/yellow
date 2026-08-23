import "server-only";
import { notFound } from "next/navigation";
import { getDoc } from "./content";

/** Pages the owner can hide from Admin → Settings. Hidden pages 404, leave every menu, and drop out of the sitemap. */
export const HIDEABLE: { href: string; label: string; note?: string }[] = [
  { href: "/fan-art", label: "Fan art" },
  { href: "/aberrations", label: "Aberrations", note: "also every dossier" },
  { href: "/like", label: "If you like…", note: "also every comparison page" },
  { href: "/where", label: "Where to listen" },
  { href: "/cast", label: "Cast", note: "also every cast page" },
  { href: "/store", label: "Store", note: "also products, cart, checkout" },
  { href: "/partner", label: "Partner / media kit" },
  { href: "/assets", label: "Brand assets" },
  { href: "/supporter-wall", label: "Supporter wall" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

export async function hiddenPages(): Promise<string[]> {
  const s = await getDoc("settings").catch(() => null);
  return s?.hiddenPages ?? [];
}

/** True when `path` (or the section it belongs to) is hidden. */
export function isHiddenPath(path: string, hidden: string[]) {
  const p = path.split("?")[0];
  return hidden.some((h) => p === h || p.startsWith(h + "/") || (h === "/store" && (p === "/cart" || p.startsWith("/checkout"))));
}

/** Call at the top of a hideable page (and its children): 404s when hidden. */
export async function assertVisible(path: string) {
  if (isHiddenPath(path, await hiddenPages())) notFound();
}
