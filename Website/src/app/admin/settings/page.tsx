import { getDoc } from "@/lib/content";
import { Field, Saved } from "../ui";
import { HIDEABLE } from "@/lib/visibility";
import { saveSettings } from "../actions";

const STATUSES = [
  ["airing", "Airing: new episodes on the regular schedule"],
  ["finale", "Finale week: last episode of the season is next"],
  ["break", "Between seasons: next season confirmed, date TBD"],
  ["finished", "Finished: the show has ended"],
] as const;

export default async function SettingsAdmin({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const s = await getDoc("settings");
  return (
    <div className="max-w-2xl">
      <p className="eyebrow">Site</p>
      <h1 className="display text-5xl mt-2">Settings</h1>
      {saved && <Saved>Saved. Live within a minute.</Saved>}
      <form action={saveSettings} className="mt-8 grid gap-8">
        <fieldset className="grid gap-4 border border-line p-5">
          <legend className="eyebrow px-1">Season status (home page badge and countdown)</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Season label" name="seasonLabel" defaultValue={s.seasonLabel} hint="e.g. Season 1" />
            <label className="grid gap-1 text-sm">
              <span className="eyebrow">Status</span>
              <select name="seasonStatus" defaultValue={s.seasonStatus} className="field">
                {STATUSES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Field label="Note (optional, shown under the badge)" name="seasonNote" defaultValue={s.seasonNote} hint="e.g. Season 2 confirmed. Date soon." />
          <div className="grid gap-4 sm:grid-cols-2 border-t border-line pt-4">
            <Field label="Next season label" name="nextSeasonLabel" defaultValue={s.nextSeasonLabel ?? "Season 2"} hint="Used in the Between seasons countdown" />
            <label className="grid gap-1 text-sm">
              <span className="eyebrow">Next season date and time (optional)</span>
              <input type="datetime-local" name="nextSeasonDate" defaultValue={s.nextSeasonDate ?? ""} className="field" />
              <span className="text-xs text-muted">Leave blank for no countdown. With a date set and status Between seasons, the home page shows a big [REDACTED] returns in countdown.</span>
            </label>
          </div>
        </fieldset>

        <fieldset className="grid gap-4 border border-line p-5">
          <legend className="eyebrow px-1">Episode-alerts pop-up</legend>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="promoEnabled" defaultChecked={s.promoEnabled} className="size-5 accent-yellow" />
            Offer a store discount code after someone subscribes
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Promo code" name="promoCode" defaultValue={s.promoCode} hint="Must also exist in Stripe (Products → Coupons → promotion code)" />
            <Field label="Pop-up text" name="promoText" defaultValue={s.promoText} />
          </div>
        </fieldset>

        <fieldset className="border border-line p-5">
          <legend className="eyebrow px-2">Pages</legend>
          <p className="text-sm text-muted">Tick a page to hide it. Hidden pages return a 404, disappear from every menu and the footer, and leave the sitemap. Untick to bring it back.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {HIDEABLE.map((h) => (
              <li key={h.href}>
                <label className="flex items-start gap-3 border border-line bg-ink-2/70 p-3 text-sm cursor-pointer">
                  <input type="checkbox" name="hide" value={h.href} defaultChecked={(s.hiddenPages ?? []).includes(h.href)} className="mt-0.5 size-5 accent-yellow" />
                  <span>
                    <span className="font-semibold">Hide {h.label}</span>
                    <span className="block text-xs text-muted">{h.href}{h.note ? ` · ${h.note}` : ""}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <div>
          <button type="submit" className="btn btn-yellow">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
