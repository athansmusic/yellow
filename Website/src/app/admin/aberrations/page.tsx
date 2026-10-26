import Link from "next/link";
import { getDoc } from "@/lib/content";

export default async function AberrationsAdmin({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const all = (await getDoc("aberrations")).sort((a, b) => a.episodeCode.localeCompare(b.episodeCode, undefined, { numeric: true }));
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Content</p>
          <h1 className="display text-5xl mt-2">Aberrations</h1>
        </div>
        <Link href="/admin/aberrations/new" className="btn btn-yellow">
          New aberration
        </Link>
      </div>
      {deleted && (
        <p role="status" className="mt-4 border border-yellow/60 bg-yellow/10 p-3 text-sm">
          Deleted.
        </p>
      )}
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {all.map((a) => (
          <li key={a.slug} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <Link href={`/admin/aberrations/${a.slug}`} className="display text-2xl hover:text-yellow">
                {a.name}
              </Link>
              <p className="text-xs text-muted">
                {a.episodeCode} · {a.designation}
                {a.entry.startsWith("REPLACE ME") && <span className="ml-2 text-yellow">report not written</span>}
              </p>
            </div>
            <Link href={`/aberrations/${a.slug}`} target="_blank" className="text-sm text-muted underline hover:text-yellow shrink-0">
              View
            </Link>
          </li>
        ))}
        {all.length === 0 && <li className="py-6 text-muted">None yet.</li>}
      </ul>
    </div>
  );
}
