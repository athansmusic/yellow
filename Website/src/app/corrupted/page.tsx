import type { Metadata } from "next";
import Image from "next/image";
import { CorruptedSignup, FileStatus, Grain, RedactedSlots, Stamp, TearDefs, Trailer } from "./parts";

/**
 * CORRUPTED: the spin-off's own landing page. Deliberately not the show's design language, and
 * deliberately unpublished: no nav entry, no sitemap, noindex, reachable only by URL until launch.
 *
 * Palette comes straight off the key art: ground #8c161f, marks in the art's black. The id on the
 * root is load-bearing — globals.css keys the red header/footer treatment off `body:has(#corrupted)`.
 */
export const metadata: Metadata = {
  title: "CORRUPTED",
  description: "A horror anthology set in the REDACTED universe.",
  alternates: { canonical: "/corrupted" },
  robots: { index: false, follow: false },
  openGraph: { siteName: "REDACTED", title: "CORRUPTED" },
};

export default function CorruptedPage() {
  return (
    <div id="corrupted" className="relative z-10 bg-[#8c161f] text-[#0a0708]">
      <TearDefs />
      <Grain />

      {/* Hero: the key art, with the type sat under the figure rather than across it */}
      <section className="relative z-10 min-h-[92svh] flex items-end overflow-hidden">
        <Image src="/corrupted/hero.jpg" alt="" fill priority sizes="100vw" className="object-cover object-top" />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(140,22,31,0)_35%,rgba(140,22,31,.72)_68%,#8c161f_100%)]" />

        <div className="relative mx-auto w-full max-w-5xl px-5 pb-14 text-center">
          <FileStatus />
          <Image src="/corrupted/wordmark-black.png" alt="CORRUPTED" width={1843} height={384} priority className="mt-6 w-full max-w-3xl mx-auto h-auto" />
          <p className="mt-7 mx-auto max-w-2xl text-[17px] font-medium leading-relaxed text-[#0a0708]">
            A horror anthology set in the REDACTED universe.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a href="#notify" className="inline-block bg-[#0a0708] text-[#f6ecee] px-7 py-4 text-xs font-bold uppercase tracking-[.2em] hover:bg-[#f6ecee] hover:text-[#0a0708] transition-colors">
              Notify me when it drops
            </a>
            <a href="#trailer" className="inline-block border-2 border-[#0a0708] px-7 py-4 text-xs font-bold uppercase tracking-[.2em] text-[#0a0708] hover:bg-[#0a0708] hover:text-[#f6ecee] transition-colors">
              Trailer
            </a>
          </div>
          <p className="mt-7">
            <Stamp>More info soon</Stamp>
          </p>
        </div>
      </section>

      {/* The series */}
      <section className="relative z-10">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <Stamp>The series</Stamp>
          <h2 className="mt-6 display leading-[0.85] text-[clamp(3rem,11vw,8rem)] text-[#0a0708]">
            What is
            <br />
            CORRUPTED?
          </h2>
          <div className="mt-10 max-w-2xl text-[17px] font-medium leading-relaxed text-[#0a0708]">
            <p>
              CORRUPTED is an in-universe horror anthology series exploring a new aberration or case each month, set in either the modern day or somewhere in history. Some stories introduce entirely original threats; others expand on aberrations from the main show. And sometimes, the horror stems from familiar legends and stories
            </p>
          </div>
        </div>
      </section>

      {/* Confirmed cast */}
      <section className="relative z-10 border-t-2 border-[#0a0708]">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <h2 className="display leading-[0.85] text-[clamp(2.5rem,9vw,6.5rem)] text-[#0a0708]">Confirmed cast</h2>
          <RedactedSlots />
          <a href="#notify" className="inline-block mt-10">
            <Stamp>Get cast reveals first</Stamp>
          </a>
        </div>
      </section>

      {/* Trailer */}
      <section id="trailer" className="relative z-10 border-t-2 border-[#0a0708] scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <h2 className="display leading-[0.85] text-[clamp(2.5rem,9vw,6.5rem)] text-[#0a0708]">Trailer</h2>
          <Trailer />
        </div>
      </section>

      {/* Standby: the page closes on black so the form has somewhere solid to sit. The pb/-mb
          fills the mt-24 the site footer carries, which would otherwise show the show's texture. */}
      <section id="notify" className="relative z-10 bg-[#0a0708] scroll-mt-20 pb-24 -mb-24">
        <div className="mx-auto max-w-3xl px-5 py-24">
          <p className="text-[11px] font-bold uppercase tracking-[.28em] text-[#a21d2d]">Standby</p>
          <CorruptedSignup />
        </div>
      </section>
    </div>
  );
}
