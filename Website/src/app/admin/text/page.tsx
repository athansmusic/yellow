import { getDoc } from "@/lib/content";
import { SITE_TEXT, type SiteTextId } from "@/lib/site-text";
import { saveSiteText } from "../actions";
import { Saved } from "../ui";

export const dynamic = "force-dynamic";

/** Override any registered piece of static site copy. Blank = the original (styled) text. */
export default async function TextAdmin({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const overrides = await getDoc("siteText").catch(() => ({}) as Record<string, string>);
  const ids = Object.keys(SITE_TEXT) as SiteTextId[];
  const pages = [...new Set(ids.map((i) => SITE_TEXT[i].page))];

  return (
    <div>
      <p className="eyebrow">Site copy</p>
      <h1 className="display text-5xl mt-2">Static text</h1>
      <p className="mt-3 max-w-prose text-paper/85">
        These are the fixed lines on the site (the little pencils you see next to them while signed in link here). Type to replace one; overrides are plain text, so any bolding or links in the original are dropped. Clear the box and save to bring the original back.
      </p>
      {saved && <Saved>Saved.</Saved>}

      <form action={saveSiteText} className="mt-8 grid gap-10">
        {pages.map((page) => (
          <fieldset key={page} className="border border-line p-5 grid gap-5">
            <legend className="eyebrow px-2">{page}</legend>
            {ids
              .filter((i) => SITE_TEXT[i].page === page)
              .map((i) => (
                <label key={i} id={i} className="block scroll-mt-24">
                  <span className="text-sm font-semibold">{SITE_TEXT[i].label}</span>
                  <span className="block text-xs text-muted mt-0.5 line-clamp-2">Original: {SITE_TEXT[i].text}</span>
                  <textarea name={`t:${i}`} defaultValue={overrides[i] ?? ""} placeholder="Using the original" rows={3} className="mt-2 w-full border border-line bg-ink-2 p-3 text-paper placeholder:text-muted text-sm" />
                </label>
              ))}
          </fieldset>
        ))}
        <div>
          <button type="submit" className="btn btn-yellow">
            Save all
          </button>
        </div>
      </form>
    </div>
  );
}
