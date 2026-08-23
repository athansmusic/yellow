"use server";

import { redirect } from "next/navigation";
import { auth, isAdminEmail, signIn, signOut } from "@/auth";
import { getDoc, setDoc, LIKE_KINDS, type Aberration, type LikeKind, type LikePage, type SeasonStatus, type StoreCopy } from "@/lib/content";
import { slugify } from "@/lib/feed";

async function requireAdmin() {
  const s = await auth();
  if (!isAdminEmail(s?.user?.email)) throw new Error("Not signed in as an admin");
  return s!;
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const lines = (fd: FormData, k: string) =>
  str(fd, k)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

export async function login(fd: FormData) {
  await signIn("google", { redirectTo: str(fd, "next") || "/admin" });
}

export async function logout() {
  await signOut({ redirectTo: "/admin/login" });
}

// ── Site settings ─────────────────────────────────────────────────────────
export async function saveSettings(fd: FormData) {
  await requireAdmin();
  const status = str(fd, "seasonStatus") as SeasonStatus;
  await setDoc("settings", {
    seasonStatus: (["airing", "finale", "break", "finished"] as const).includes(status) ? status : "airing",
    seasonLabel: str(fd, "seasonLabel") || "Season 1",
    seasonNote: str(fd, "seasonNote"),
    promoEnabled: fd.get("promoEnabled") === "on",
    promoCode: str(fd, "promoCode").toUpperCase(),
    hiddenPages: fd.getAll("hide").map(String).filter((h) => h.startsWith("/")),
    promoText: str(fd, "promoText") || "An email whenever an episode drops, plus the occasional update. Sign up and get 10% off store orders of $25 or more.",
  });
  redirect("/admin/settings?saved=1");
}

// ── Featured products (home rail) ────────────────────────────────────────
export async function saveFeatured(fd: FormData) {
  await requireAdmin();
  // Checked slugs with their order numbers; ties keep the catalog order
  const picked = fd
    .getAll("slug")
    .map(String)
    .map((slug) => ({ slug, order: Number(fd.get(`order:${slug}`)) || 999 }))
    .sort((a, b) => a.order - b.order)
    .slice(0, 4)
    .map((x) => x.slug);
  await setDoc("featured", { slugs: picked });
  redirect("/admin/featured?saved=1");
}

// ── Aberrations ──────────────────────────────────────────────────────────
export async function saveAberration(fd: FormData) {
  await requireAdmin();
  const original = str(fd, "original");
  const name = str(fd, "name");
  if (!name || !str(fd, "episodeCode") || !str(fd, "teaser")) throw new Error("Name, episode code, and teaser are required");
  const slug = slugify(str(fd, "slug") || name);
  const a: Aberration = {
    slug,
    name,
    episodeCode: str(fd, "episodeCode"),
    designation: str(fd, "designation") || "Pending",
    teaser: str(fd, "teaser"),
    entry: str(fd, "entry"),
    notes: str(fd, "notes") || undefined,
    handling: str(fd, "handling") || undefined,
    firstSeen: str(fd, "firstSeen") || undefined,
    related: lines(fd, "related"),
    alsoIn: lines(fd, "alsoIn"),
    aliases: lines(fd, "aliases"),
    threat: Math.min(5, Math.max(0, Number(fd.get("threat")) || 0)) || undefined,
    image: str(fd, "image") || undefined,
  };
  const all = await getDoc("aberrations");
  const rest = all.filter((x) => x.slug !== original && x.slug !== slug);
  await setDoc("aberrations", [...rest, a]);
  redirect(`/admin/aberrations/${slug}?saved=1`);
}

export async function deleteAberration(fd: FormData) {
  await requireAdmin();
  const slug = str(fd, "slug");
  const all = await getDoc("aberrations");
  await setDoc("aberrations", all.filter((x) => x.slug !== slug));
  redirect("/admin/aberrations?deleted=1");
}

// ── If you like… pages ───────────────────────────────────────────────────
export async function saveLike(fd: FormData) {
  await requireAdmin();
  const original = str(fd, "original");
  const name = str(fd, "name");
  if (!name || !str(fd, "description")) throw new Error("Name and description are required");
  const slug = slugify(str(fd, "slug") || name);
  const faqQ = fd.getAll("faqQ").map(String), faqA = fd.getAll("faqA").map(String);
  const quoteText = str(fd, "quoteText");
  const l: LikePage = {
    slug,
    name,
    kind: (LIKE_KINDS as readonly string[]).includes(str(fd, "kind")) ? (str(fd, "kind") as LikeKind) : "podcast",
    startEpisode: str(fd, "startEpisode") || undefined,
    title: str(fd, "title") || `Podcasts like ${name}`,
    description: str(fd, "description"),
    about: str(fd, "about"),
    same: lines(fd, "same"),
    different: lines(fd, "different"),
    quote: quoteText ? { text: quoteText, who: str(fd, "quoteWho"), role: str(fd, "quoteRole") } : undefined,
    start: str(fd, "start"),
    facts: lines(fd, "facts")
      .map((row) => row.split("|").map((x) => x.trim()))
      .filter((c) => c.length >= 3 && c[0])
      .map(([label, theirs, ours]) => ({ label, theirs, ours })),
    faq: faqQ.map((q, i) => ({ q: q.trim(), a: (faqA[i] ?? "").trim() })).filter((x) => x.q && x.a),
  };
  const all = await getDoc("like");
  const rest = all.filter((x) => x.slug !== original && x.slug !== slug);
  await setDoc("like", [...rest, l]);
  redirect(`/admin/like/${slug}?saved=1`);
}

export async function deleteLike(fd: FormData) {
  await requireAdmin();
  const slug = str(fd, "slug");
  const all = await getDoc("like");
  await setDoc("like", all.filter((x) => x.slug !== slug));
  redirect("/admin/like?deleted=1");
}

// ── Store copy (owner-written product descriptions) ─────────────────────────
export async function saveStoreCopy(fd: FormData) {
  await requireAdmin();
  const copy: StoreCopy = {};
  for (const [key, value] of fd.entries()) {
    const m = key.match(/^(desc|artist|artistUrl):(.+)$/);
    if (!m) continue;
    const [, field, slug] = m;
    const v = String(value).trim();
    if (!v) continue;
    const entry = (copy[slug] ??= {});
    if (field === "desc") entry.description = v;
    else if (field === "artist") entry.artist = v;
    else if (field === "artistUrl") entry.artistUrl = v;
  }
  await setDoc("storeCopy", copy);
  redirect("/admin/store-copy?saved=1");
}
