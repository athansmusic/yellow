import Image from "next/image";
import Link from "next/link";
import { getDoc, SOCIAL_KEYS, type Contributors } from "@/lib/content";
import { slugify } from "@/lib/feed";
import cast from "@/data/cast.json";
import writers from "@/data/writers.json";
import overrides from "@/data/store-overrides.json";
import { attachContributorArt, attachContributorPhoto, removeContributorArt, saveContributorBio, toggleContributorHidden, removeContributorPhoto, addContributorWork, removeContributorWork, saveContributorSocials } from "../actions";
import { Saved } from "../ui";
import { BlobUpload } from "@/components/admin/BlobUpload";

export const dynamic = "force-dynamic";

type Person = { slug: string; name: string; roles: string[]; note: string };

const SOCIAL_LABELS_PLACEHOLDER: Record<string, string> = { website: "Website", instagram: "Instagram", tiktok: "TikTok", twitter: "Twitter / X", youtube: "YouTube", imdb: "IMDb" };

/** Everyone who makes the show: cast, guest writers, store artists. A person can hold several roles. */
function roster(): Person[] {
  const map = new Map<string, Person>();
  const add = (name: string, role: string, note: string) => {
    const slug = slugify(name);
    const p = map.get(slug) ?? { slug, name, roles: [], note: "" };
    if (!p.roles.includes(role)) p.roles.push(role);
    if (note && !p.note) p.note = note;
    map.set(slug, p);
  };
  for (const c of cast as { actor: string; slug: string; character: string }[]) add(c.actor, "Cast", c.character);
  for (const w of writers as { name: string; credit: string }[]) add(w.name, "Guest writer", w.credit);
  const byName = (overrides as { byName: Record<string, { artist?: string }> }).byName;
  const counts: Record<string, number> = {};
  for (const ov of Object.values(byName)) if (ov.artist) counts[ov.artist] = (counts[ov.artist] ?? 0) + 1;
  for (const [artist, n] of Object.entries(counts)) add(artist, "Artist", `${n} product${n === 1 ? "" : "s"}`);
  // Only people with a contributor page: writers and artists. Cast-only folks live on /cast.
  return [...map.values()].filter((x) => x.roles.some((r) => r !== "Cast")).sort((a, b) => a.name.localeCompare(b.name));
}

export default async function ContributorsAdmin({ searchParams }: { searchParams: Promise<{ p?: string; saved?: string; removed?: string; err?: string }> }) {
  const { p, saved, removed, err } = await searchParams;
  const doc = await getDoc("contributors").catch(() => ({}) as Contributors);
  const people = roster();
  const selected = people.find((x) => x.slug === p);
  const entry = selected ? doc[selected.slug] : undefined;
  const art = entry?.art ?? [];
  const wantsBio = !!selected;

  return (
    <div>
      <p className="eyebrow">People</p>
      <h1 className="display text-5xl mt-2">Contributors</h1>
      <p className="mt-3 max-w-prose text-paper/85">
        Guest writers and artists. Add the raw art pieces for each person and a description, and they appear on their page.
      </p>
      {saved && <Saved>Saved.</Saved>}
      {removed && <Saved>Removed.</Saved>}
      {err && <p className="mt-4 border border-red bg-red/10 px-4 py-3 text-sm text-paper">{err}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,18rem)_1fr] items-start">
        {/* Roster */}
        <ul className="border border-line divide-y divide-line max-h-[70vh] overflow-y-auto">
          {people.map((x) => {
            const n = doc[x.slug]?.art?.length ?? 0;
            return (
              <li key={x.slug}>
                <Link href={`/admin/contributors?p=${encodeURIComponent(x.slug)}`} className={`block px-3 py-2.5 text-sm hover:bg-ink-2 ${x.slug === p ? "bg-ink-2 text-yellow" : ""}`}>
                  <span className="font-semibold">{x.name}</span>
                  <span className="block text-xs text-muted">
                    {x.roles.join(" · ")}
                    {n > 0 ? ` · ${n} art` : ""}
                    {doc[x.slug]?.hidden ? " · hidden" : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Editor */}
        {!selected ? (
          <p className="text-muted">Pick someone to manage their art.</p>
        ) : (
          <div className="grid gap-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="display text-3xl">{selected.name}</h2>
                <p className="text-sm text-muted mt-1">
                  {selected.roles.join(" · ")}
                  {selected.note ? ` · ${selected.note}` : ""}
                </p>
              </div>
              <form action={toggleContributorHidden}>
                <input type="hidden" name="slug" value={selected.slug} />
                <button type="submit" className={`btn ${entry?.hidden ? "btn-yellow" : "border border-line hover:border-yellow"}`}>
                  {entry?.hidden ? "Show on site" : "Hide from site"}
                </button>
                <span className="block text-xs text-muted mt-1 text-right">{entry?.hidden ? "Hidden: their page 404s and they leave the directory." : "Visible on the contributors page."}</span>
              </form>
            </div>

            {/* Profile photo */}
            <section className="border border-line p-4 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
              <span className="relative block w-28 aspect-[3/4] border border-line bg-ink overflow-hidden">
                {entry?.photo ? (
                  <Image src={entry.photo} alt="" fill sizes="112px" className="object-cover object-top" />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-muted text-xs uppercase tracking-wider text-center px-2">No photo</span>
                )}
              </span>
              <div>
                <p className="eyebrow">Profile photo</p>
                <p className="text-xs text-muted mt-0.5">Shown as their ID photo. Without one the page reads NO PHOTO ON FILE.</p>
                <div className="mt-2">
                  <BlobUpload slug={selected.slug} kind="photo" action={attachContributorPhoto} label={entry?.photo ? "Replace" : "Upload"} />
                </div>
                {entry?.photo && (
                  <form action={removeContributorPhoto} className="mt-2">
                    <input type="hidden" name="slug" value={selected.slug} />
                    <button type="submit" className="text-xs text-muted underline underline-offset-4 hover:text-red">
                      Remove photo
                    </button>
                  </form>
                )}
              </div>
            </section>

            {/* Art */}
            <section>
              <p className="eyebrow mb-3">Art pieces {art.length > 0 && <span className="text-muted">({art.length})</span>}</p>
              {art.length > 0 ? (
                <ul className="grid gap-3 sm:grid-cols-3">
                  {art.map((a) => (
                    <li key={a.id} className="border border-line bg-ink-2/70">
                      <span className="relative block aspect-square bg-ink">
                        <Image src={a.url} alt={a.title || ""} fill sizes="220px" className="object-contain" />
                      </span>
                      <span className="block p-2">
                        <span className="block text-xs text-paper/90 truncate">{a.title || "Untitled"}</span>
                        <form action={removeContributorArt} className="mt-1">
                          <input type="hidden" name="slug" value={selected.slug} />
                          <input type="hidden" name="id" value={a.id} />
                          <button type="submit" className="text-[11px] text-muted underline underline-offset-4 hover:text-red">
                            Remove
                          </button>
                        </form>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No art yet.</p>
              )}

              <div className="mt-5 border border-line p-4">
                <p className="eyebrow mb-2">Add a piece</p>
                <BlobUpload slug={selected.slug} kind="art" action={attachContributorArt} withTitle label="Upload" />
              </div>
            </section>

            {/* Other work */}
            <section>
              <p className="eyebrow mb-3">Other work</p>
              {(entry?.works ?? []).length > 0 ? (
                <ul className="grid gap-2 mb-4">
                  {(entry?.works ?? []).map((w) => (
                    <li key={w.id} className="flex items-baseline justify-between gap-4 border border-line bg-ink-2/70 p-3">
                      <span className="min-w-0">
                        <span className="display text-lg block leading-none">{w.title}</span>
                        {w.note && <span className="block text-xs text-muted mt-1">{w.note}</span>}
                        {w.url && <span className="block text-xs text-yellow mt-1 truncate">{w.url}</span>}
                      </span>
                      <form action={removeContributorWork} className="shrink-0">
                        <input type="hidden" name="slug" value={selected.slug} />
                        <input type="hidden" name="id" value={w.id} />
                        <button type="submit" className="text-[11px] text-muted underline underline-offset-4 hover:text-red">
                          Remove
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted mb-4">Nothing yet.</p>
              )}
              <form action={addContributorWork} className="border border-line p-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <input type="hidden" name="slug" value={selected.slug} />
                <label className="block">
                  <span className="text-xs text-muted">Title</span>
                  <input type="text" name="workTitle" required placeholder="Malevolent" className="field mt-1" />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">Note (optional)</span>
                  <input type="text" name="workNote" placeholder="Creator. Arthur Lester." className="field mt-1" />
                </label>
                <button type="submit" className="btn btn-yellow">
                  Add
                </button>
                <label className="block sm:col-span-3">
                  <span className="text-xs text-muted">Link (optional)</span>
                  <input type="url" name="workUrl" placeholder="https://" className="field mt-1" />
                </label>
              </form>
            </section>

            {/* Socials */}
            <form action={saveContributorSocials} className="border border-line p-4">
              <p className="eyebrow">Find them</p>
              <p className="text-xs text-muted mt-0.5">Full URLs. Anything left blank is not shown.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="slug" value={selected.slug} />
                {SOCIAL_KEYS.map((k) => (
                  <label key={k} className="block">
                    <span className="text-xs text-muted">{SOCIAL_LABELS_PLACEHOLDER[k]}</span>
                    <input type="url" name={`social:${k}`} defaultValue={entry?.socials?.[k] ?? ""} placeholder="https://" className="field mt-1" />
                  </label>
                ))}
              </div>
              <button type="submit" className="btn btn-yellow mt-4">
                Save links
              </button>
            </form>

            {/* Description (not for artists) */}
            {wantsBio && (
              <form action={saveContributorBio} className="border border-line p-4">
                <input type="hidden" name="slug" value={selected.slug} />
                <label className="block">
                  <span className="eyebrow">Description</span>
                  <span className="block text-xs text-muted mt-0.5">Your words. Blank leaves the page showing [ REDACTED ].</span>
                  <textarea name="bio" defaultValue={entry?.bio ?? ""} rows={5} className="field mt-2 w-full" />
                </label>
                <button type="submit" className="btn btn-yellow mt-3">
                  Save description
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
