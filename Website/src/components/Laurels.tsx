import Image from "next/image";
import { awards, isWin } from "@/lib/awards";

/** `only="wins"` is the headline row (larger, full strength); `only="rest"` is everything else. */
export function Laurels({ className = "", only }: { className?: string; only?: "wins" | "rest" }) {
  const list = only === "wins" ? awards.filter(isWin) : only === "rest" ? awards.filter((a) => !isWin(a)) : awards;
  const wins = only === "wins";
  return (
    <ul aria-label={wins ? "Festival and award wins" : "Festival laurels and awards"} className={`grid grid-cols-4 ${wins ? "gap-x-4 sm:gap-x-8 gap-y-8" : "sm:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-6"} items-center ${className}`}>
      {list.map((a) => {
        const img = (
          <Image src={`/laurels/${a.file}.png`} alt={`${a.festival}: ${[a.result, a.year].filter(Boolean).join(", ")}`} title={`${a.festival}: ${a.result}`} width={160} height={90} className={`w-full h-auto transition-opacity group-hover:opacity-100 ${wins ? "max-w-[12.5rem]" : "max-w-[9rem] opacity-80"}`} />
        );
        return (
          <li key={a.file} className="flex justify-center">
            {a.url ? (
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="group flex justify-center">
                {img}
              </a>
            ) : (
              img
            )}
          </li>
        );
      })}
    </ul>
  );
}
