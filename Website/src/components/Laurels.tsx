import Image from "next/image";
import awards from "@/data/awards.json";

export function Laurels({ className = "" }: { className?: string }) {
  return (
    <ul aria-label="Festival laurels and awards" className={`grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-6 items-center ${className}`}>
      {awards.map((a) => (
        <li key={a.file} className="flex justify-center">
          <Image src={`/laurels/${a.file}.png`} alt={`${a.festival}: ${a.result}, ${a.year}`} title={`${a.festival}: ${a.result}`} width={160} height={90} className="w-full max-w-[9rem] h-auto opacity-80" />
        </li>
      ))}
    </ul>
  );
}
