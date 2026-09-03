import Link from "next/link";
import { getDocFresh } from "@/lib/content";

export default async function LikeAdmin({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const all = (await getDocFresh("like")).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Content</p>
          <h1 className="display text-5xl mt-2">If you like…</h1>
        </div>
        <Link href="/admin/like/new" className="btn btn-yellow">
          New page
        </Link>
      </div>
      {deleted && (
        <p role="status" className="mt-4 border border-yellow/60 bg-yellow/10 p-3 text-sm">
          Deleted.
        </p>
      )}
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {all.map((l) => (
          <li key={l.slug} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <Link href={`/admin/like/${l.slug}`} className="display text-2xl hover:text-yellow">
                {l.name}
              </Link>
              <p className="text-xs text-muted truncate">{l.title}</p>
            </div>
            <Link href={`/like/${l.slug}`} target="_blank" className="text-sm text-muted underline hover:text-yellow shrink-0">
              View
            </Link>
          </li>
        ))}
        {all.length === 0 && <li className="py-6 text-muted">None yet.</li>}
      </ul>
    </div>
  );
}
