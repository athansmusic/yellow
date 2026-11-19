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
    const wins = awards.filter(isWin);
    // The hairlines are the grid's own background showing through the gaps, so an unfilled cell on the
    // last row would read as a grey block. Blank cells pad each row to full width at both column counts.
    // Three across on phones, six from tablet up; the laurel prints the result, so the caption is just the festival.
    const padLg = (6 - (wins.length % 6)) % 6;
    const padSm = (3 - (wins.length % 3)) % 3;
    return (
      <ul aria-label="Festival and award wins" className={`grid grid-cols-3 md:grid-cols-6 gap-px bg-white/10 border border-white/10 ${className}`}>
        {wins.map((a) => (
          <li key={a.file} className="bg-ink">
            <MaybeLink url={a.url} className="group flex h-full flex-col items-center px-2 py-4 text-center transition-colors hover:bg-white/[0.04]">
              <Image src={`/laurels/${a.file}.png`} alt={alt(a)} title={`${a.festival}: ${a.result}`} width={160} height={160} className="h-24 lg:h-40 w-auto transition-transform duration-300 group-hover:scale-105" />
              <span className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-paper/90">{shortName(a.festival)}</span>
            </MaybeLink>
          </li>
        ))}
        {padSm > 0 && <li aria-hidden className="bg-ink md:hidden" style={{ gridColumn: `span ${padSm}` }} />}
        {padLg > 0 && <li aria-hidden className="hidden bg-ink md:block" style={{ gridColumn: `span ${padLg}` }} />}
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
