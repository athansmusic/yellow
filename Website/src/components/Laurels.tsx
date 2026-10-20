import Image from "next/image";
import { awards } from "@/lib/awards";

export function Laurels({ className = "" }: { className?: string }) {
  return (
    <ul aria-label="Festival laurels and awards" className={`grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-6 items-center ${className}`}>
      {awards.map((a) => {
        const img = (
          <Image src={`/laurels/${a.file}.png`} alt={`${a.festival}: ${[a.result, a.year].filter(Boolean).join(", ")}`} title={`${a.festival}: ${a.result}`} width={160} height={90} className="w-full max-w-[9rem] h-auto opacity-80 transition-opacity group-hover:opacity-100" />
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
