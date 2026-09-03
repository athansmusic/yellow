import Link from "next/link";
import { notFound } from "next/navigation";
import { getDocFresh, LIKE_KINDS, type LikePage } from "@/lib/content";
import { Field, Saved } from "../../ui";
import { deleteLike, saveLike } from "../../actions";

export default async function EditLike({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ saved?: string; from?: string }> }) {
  const { slug } = await params;
  const { saved, from } = await searchParams;
  const all = await getDocFresh("like");
  const isNew = slug === "new";
  // "Start from" copies an existing page's fields into the new form (slug and name cleared so it can't overwrite the original)
  const template = isNew && from ? all.find((x) => x.slug === from) : undefined;
  const l: Partial<LikePage> = isNew ? (template ? { ...template, slug: "", name: "", title: "" } : {}) : (all.find((x) => x.slug === slug) ?? notFound());
  const example = all.find((x) => x.slug === "the-magnus-archives") ?? all[0];
  const faq = [...(l.faq ?? []), ...Array(Math.max(0, 4 - (l.faq?.length ?? 0))).fill({ q: "", a: "" })];

  return (
    <div className="max-w-3xl">
      <Link href="/admin/like" className="text-sm text-muted hover:text-yellow">
        ← If you like…
      </Link>
      <h1 className="display text-5xl mt-2">{isNew ? "New page" : l.name}</h1>
      {saved && <Saved>Saved. Live at /like/{slug} within a minute.</Saved>}

      {isNew && example && !template && (
        <details className="mt-6 group border border-line bg-ink-2">
          <summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-4">
            <span>
              <span className="display text-xl block">See a finished example</span>
              <span className="text-xs text-muted">{example.name}, filled in field by field.</span>
            </span>
            <span aria-hidden className="text-yellow text-2xl leading-none transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="px-4 pb-5 grid gap-4 text-sm border-t border-line pt-4">
            <Ex label="Show name">{example.name}</Ex>
            <Ex label="Page title">{example.title}</Ex>
            <Ex label="Description">{example.description}</Ex>
            <Ex label="What the other show is">{example.about}</Ex>
            <Ex label="In common (one per line)">{example.same.join("\n")}</Ex>
            <Ex label="Different (one per line)">{example.different.join("\n")}</Ex>
            {example.quote && <Ex label="Quote">{`${example.quote.text}\n${example.quote.who}, ${example.quote.role}`}</Ex>}
            <Ex label="Where to start">{example.start}</Ex>
            <Ex label="Questions">{example.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n")}</Ex>
            <p>
              <Link href={`/admin/like/new?from=${example.slug}`} className="btn btn-ghost !min-h-10 !text-base">
                Start from this example
              </Link>
            </p>
          </div>
        </details>
      )}
      {template && <p className="mt-4 text-sm text-muted">Started from {template.name}. Change every field that mentions it.</p>}

      <form action={saveLike} className="mt-8 grid gap-5">
        <input type="hidden" name="original" value={l.slug ?? ""} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Show name" name="name" defaultValue={l.name} required hint="As it appears on screen" />
          <Field label="URL slug" name="slug" defaultValue={l.slug} hint="Leave blank to make one from the name" />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">
            <span className="eyebrow">What it is</span>
            <select name="kind" defaultValue={l.kind ?? "podcast"} className="field">
              {LIKE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <Field label="Start with (episode code)" name="startEpisode" defaultValue={l.startEpisode} hint="e.g. S1 E1" />
          <Field label="Page title (for search)" name="title" defaultValue={l.title} hint="Blank = Podcasts like <name>" />
        </div>
        <Field label="Description (one or two sentences; also the Google snippet)" name="description" defaultValue={l.description} required rows={2} />
        <Field label="What the other show is" name="about" defaultValue={l.about} rows={3} />
        <Field label="What REDACTED has in common (one point per line)" name="same" defaultValue={(l.same ?? []).join("\n")} rows={5} />
        <Field label="What's different (one point per line)" name="different" defaultValue={(l.different ?? []).join("\n")} rows={5} />
        <fieldset className="grid gap-3 border border-line p-4">
          <legend className="eyebrow px-1">Quote (optional)</legend>
          <Field label="Text" name="quoteText" defaultValue={l.quote?.text} rows={2} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Who" name="quoteWho" defaultValue={l.quote?.who} />
            <Field label="Role" name="quoteRole" defaultValue={l.quote?.role} hint="creator of …, outlet" />
          </div>
        </fieldset>
        <Field label="Where to start" name="start" defaultValue={l.start} rows={2} />
        <Field label="Side by side (one row per line: label | theirs | ours)" name="facts" defaultValue={(l.facts ?? []).map((f) => `${f.label} | ${f.theirs} | ${f.ours}`).join("\n")} rows={6} hint="e.g. Format | Statements read to tape | Full-cast procedural" />
        <fieldset className="grid gap-3 border border-line p-4">
          <legend className="eyebrow px-1">Questions (blank rows are ignored)</legend>
          {faq.map((f, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr]">
              <input name="faqQ" defaultValue={f.q} placeholder="Question" aria-label={`Question ${i + 1}`} className="field" />
              <input name="faqA" defaultValue={f.a} placeholder="Answer" aria-label={`Answer ${i + 1}`} className="field" />
            </div>
          ))}
        </fieldset>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn btn-yellow">
            Save
          </button>
          {!isNew && (
            <Link href={`/like/${l.slug}`} target="_blank" className="text-sm text-muted underline hover:text-yellow">
              View page
            </Link>
          )}
        </div>
      </form>

      {!isNew && (
        <form action={deleteLike} className="mt-10 border-t border-line pt-6">
          <input type="hidden" name="slug" value={l.slug} />
          <button type="submit" className="text-sm text-red-2 underline hover:text-paper">
            Delete this page
          </button>
        </form>
      )}
    </div>
  );
}

function Ex({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <p className="whitespace-pre-line text-paper/85">{children}</p>
    </div>
  );
}
