import Image from "next/image";
import { awards, isWin, type Award } from "@/lib/awards";

const alt = (a: Award) => `${a.festival}: ${[a.result, a.year].filter(Boolean).join(", ")}`;

/** "Film 25 ArtFF, Vienna Film Art Gallery" reads "Film 25 ArtFF"; a parenthetical like "(SIFF)" goes too. */
const shortName = (festival: string) => festival.split(",")[0].replace(/\s*\(.*?\)\s*/g, " ").trim();

function MaybeLink({ url, className, children }: { url?: string; className?: string; children: React.ReactNode }) {
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <div className={className}>{children}</div>
  );
}

/**
 * `only="wins"` is the trophy case: each win in its own hairline cell with a caption under the laurel.
 * `only="rest"` is every nomination and selection, smaller and quieter. No `only` is the plain full grid.
 */
export function Laurels({ className = "", only }: { className?: string; only?: "wins" | "rest" }) {
  if (only === "wins") {
    return (
      <ul aria-label="Festival and award wins" className={`grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border border-white/10 ${className}`}>
        {awards.filter(isWin).map((a) => (
          <li key={a.file} className="bg-ink">
            <MaybeLink url={a.url} className="group flex h-full flex-col items-center px-4 py-7 text-center transition-colors hover:bg-white/[0.04]">
              <Image src={`/laurels/${a.file}.png`} alt={alt(a)} width={160} height={160} className="h-28 sm:h-36 w-auto transition-transform duration-300 group-hover:scale-105" />
              <span className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-paper/90">{shortName(a.festival)}</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-yellow">{a.result}</span>
            </MaybeLink>
          </li>
        ))}
      </ul>
    );
  }

  const list = only === "rest" ? awards.filter((a) => !isWin(a)) : awards;
  return (
    <ul aria-label="Festival laurels and awards" className={`grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-6 items-center ${className}`}>
      {list.map((a) => (
        <li key={a.file} className="flex justify-center">
          <MaybeLink url={a.url} className="group flex justify-center">
            <Image src={`/laurels/${a.file}.png`} alt={alt(a)} title={`${a.festival}: ${a.result}`} width={160} height={90} className="w-full max-w-[9rem] h-auto opacity-70 transition-opacity group-hover:opacity-100" />
          </MaybeLink>
        </li>
      ))}
    </ul>
  );
}
