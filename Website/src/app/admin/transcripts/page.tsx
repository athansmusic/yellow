import Link from "next/link";
import { getAllItems } from "@/lib/feed";
import { curtainCode, hasLockedTranscript } from "@/lib/curtain";

export const dynamic = "force-dynamic";

/** Which episodes have a transcript locked in Curtain (cached 1 h per episode; Curtain can bust it via /api/revalidate). */
export default async function TranscriptsAdmin() {
  const all = (await getAllItems().catch(() => [])).filter((e) => e.kind === "episode");
  const rows = await Promise.all(all.map(async (e) => ({ e, done: await hasLockedTranscript(e.code) })));
  const done = rows.filter((r) => r.done).length;
  const groups: [string, typeof rows][] = [
    ["Episodes", rows],
  ];

  return (
    <div>
      <p className="eyebrow">Transcripts</p>
      <h1 className="display text-5xl mt-2">
        {done} of {rows.length} done
      </h1>
      <p className="mt-3 max-w-prose text-paper/85">
        Done means the transcript is <strong>locked in Curtain</strong>. Lock it there and the episode page here shows the full transcript (and tells Google) within the hour, or instantly once Curtain pings the site. Missing ones link to the episode in Curtain.
      </p>

      {groups.map(([label, list]) =>
        list.length ? (
          <section key={label} className="mt-8">
            <h2 className="display text-2xl mb-2">
              {label} <span className="text-muted text-base tabular">{list.filter((r) => r.done).length}/{list.length}</span>
            </h2>
            <ul className="divide-y divide-line border-y border-line">
              {list.map(({ e, done }) => (
                <li key={e.slug} className="py-2.5 flex items-center gap-3 text-sm">
                  <span className={`shrink-0 w-16 text-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 border ${done ? "border-yellow text-yellow" : "border-line text-muted"}`}>{done ? "Done" : "Missing"}</span>
                  <Link href={`/episodes/${e.slug}`} className="min-w-0 flex-1 truncate hover:text-yellow">
                    {e.title}
                  </Link>
                  <a href={done ? `https://www.tru.show/transcripts/redacted/${curtainCode(e.code)}` : "https://www.opencurtain.app/transcripts"} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-muted underline underline-offset-4 hover:text-yellow">
                    {done ? "tru.show" : "Curtain"}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  );
}
