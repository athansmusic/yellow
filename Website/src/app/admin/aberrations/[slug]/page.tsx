import Link from "next/link";
import { notFound } from "next/navigation";
import { getDoc, type Aberration } from "@/lib/content";
import { getEpisodes } from "@/lib/feed";
import { Field, Saved } from "../../ui";
import { deleteAberration, saveAberration } from "../../actions";

export default async function EditAberration({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { slug } = await params;
  const { saved } = await searchParams;
  const all = await getDoc("aberrations");
  const isNew = slug === "new";
  const a: Partial<Aberration> = isNew ? {} : (all.find((x) => x.slug === slug) ?? notFound());
  const { episodes } = await getEpisodes().catch(() => ({ episodes: [] }));
  const draft = (s?: string) => (s?.startsWith("REPLACE ME") ? "" : (s ?? ""));

  return (
    <div className="max-w-3xl">
      <Link href="/admin/aberrations" className="text-sm text-muted hover:text-yellow">
        ← Aberrations
      </Link>
      <h1 className="display text-5xl mt-2">{isNew ? "New aberration" : a.name}</h1>
      {saved && <Saved>Saved. Live at /aberrations/{slug} within a minute.</Saved>}

      <form action={saveAberration} className="mt-8 grid gap-5">
        <input type="hidden" name="original" value={a.slug ?? ""} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" name="name" defaultValue={a.name} required hint="As the Unit refers to it, e.g. The Nightfisher" />
          <Field label="URL slug" name="slug" defaultValue={a.slug} hint="Leave blank to make one from the name" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="eyebrow">Episode</span>
            <select name="episodeCode" defaultValue={a.episodeCode ?? ""} required className="field">
              <option value="" disabled>
                Pick an episode
              </option>
              {episodes.map((e) => (
                <option key={e.guid} value={e.code}>
                  {e.code}: {e.shortTitle}
                </option>
              ))}
            </select>
          </label>
          <Field label="Also appears in (episode codes, one per line)" name="alsoIn" defaultValue={(a.alsoIn ?? []).join("\n")} rows={2} hint="e.g. S1 E14" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Designation" name="designation" defaultValue={a.designation} required hint="ATPSC-0034, Pending, Unknown, or a note" />
          <label className="grid gap-1 text-sm">
            <span className="eyebrow">Threat (internal, never shown)</span>
            <input type="number" name="threat" min={1} max={5} defaultValue={a.threat ?? ""} className="field" />
          </label>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Also known as (one per line)" name="aliases" defaultValue={(a.aliases ?? []).join("\n")} rows={2} />
          <Field label="Image path" name="image" defaultValue={a.image} hint="e.g. /aberrations/nightfisher.jpg (drop the file in public/aberrations)" />
        </div>
        <Field label="Teaser (spoiler-free, one sentence)" name="teaser" defaultValue={a.teaser} required rows={2} />
        <Field label="Description (spoilers; blank line between paragraphs)" name="entry" defaultValue={draft(a.entry)} rows={8} />
        <Field label="Notes (spoilers)" name="notes" defaultValue={a.notes} rows={5} />
        <Field label="Handling (one line)" name="handling" defaultValue={draft(a.handling)} />
        <Field label="First seen (optional)" name="firstSeen" defaultValue={draft(a.firstSeen)} />
        <Field label="Related aberration slugs (one per line)" name="related" defaultValue={(a.related ?? []).join("\n")} rows={3} />
        <div className="flex items-center gap-3">
          <button type="submit" className="btn btn-yellow">
            Save
          </button>
          {!isNew && (
            <Link href={`/aberrations/${a.slug}`} target="_blank" className="text-sm text-muted underline hover:text-yellow">
              View page
            </Link>
          )}
        </div>
      </form>

      {!isNew && (
        <form action={deleteAberration} className="mt-10 border-t border-line pt-6">
          <input type="hidden" name="slug" value={a.slug} />
          <button type="submit" className="text-sm text-red-2 underline hover:text-paper">
            Delete this aberration
          </button>
        </form>
      )}
    </div>
  );
}
