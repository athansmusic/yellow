import Image from "next/image";
import Link from "next/link";
import { getDoc, type Contributors } from "@/lib/content";
import { slugify } from "@/lib/feed";
import cast from "@/data/cast.json";
import writers from "@/data/writers.json";
import overrides from "@/data/store-overrides.json";
import { addContributorArt, removeContributorArt, saveContributorBio, toggleContributorHidden } from "../actions";
import { Saved } from "../ui";

export const dynamic = "force-dynamic";

type Person = { slug: string; name: string; roles: string[]; note: string };

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

export default async function ContributorsAdmin({ searchParams }: { searchParams: Promise<{ p?: string; saved?: string; removed?: string }> }) {
  const { p, saved, removed } = await searchParams;
  const doc = await getDoc("contributors").catch(() => ({}) as Contributors);
  const people = roster();
  const selected = people.find((x) => x.slug === p);
  const entry = selected ? doc[selected.slug] : undefined;
  const art = entry?.art ?? [];
  // Descriptions are for writers; artists are credited by their work alone
  const wantsBio = !!selected && !(selected.roles.length === 1 && selected.roles[0] === "Artist");

  return (
    <div>
      <p className="eyebrow">People</p>
      <h1 className="display text-5xl mt-2">Contributors</h1>
      <p className="mt-3 max-w-prose text-paper/85">
        Guest writers and artists. Add the raw art pieces for each person and they appear on their page. Writers can carry a description; artists are credited by the work itself.
      </p>
      {saved && <Saved>Saved.</Saved>}
      {removed && <Saved>Removed.</Saved>}

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

              <form action={addContributorArt} className="mt-5 border border-line p-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <input type="hidden" name="slug" value={selected.slug} />
                <label className="block">
                  <span className="eyebrow">Add a piece</span>
                  <input type="file" name="artFile" required accept="image/png,image/jpeg,image/webp,image/avif" className="field !py-2 mt-1 file:mr-3 file:border-0 file:bg-yellow file:text-ink file:px-3 file:py-1 file:font-semibold" />
                  <input type="text" name="title" placeholder="Title (optional)" className="field mt-2" />
                </label>
                <button type="submit" className="btn btn-yellow">
                  Upload
                </button>
              </form>
            </section>

            {/* Description (not for artists) */}
            {wantsBio && (
              <form action={saveContributorBio} className="border border-line p-4">
                <input type="hidden" name="slug" value={selected.slug} />
                <label className="block">
                  <span className="eyebrow">Description</span>
                  <span className="block text-xs text-muted mt-0.5">Your words. Blank leaves the page showing STATEMENT WITHHELD.</span>
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
