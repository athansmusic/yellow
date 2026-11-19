import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/site";
import release from "@/data/signal-release.json";
import { Container } from "@/components/ui";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";
import { assertVisible } from "@/lib/visibility";

const PATH = `/press/${release.slug}`;
const IMAGE = "/press/10212026_REDACTED_SignalAwards_Landscape.png";
const PDF = "/press/10212026_REDACTED_SignalAwards_PressRelease.pdf";

export const metadata: Metadata = {
  title: "REDACTED wins Silver and Listener's Choice at the Signal Awards",
  description: "REDACTED, the horror comedy audio drama from Hush Studios on the Rusty Quill Network, won Silver and Listener's Choice for Scripted Fiction at the 5th Annual Signal Awards. Read the full press release.",
  alternates: { canonical: PATH },
  openGraph: { title: "REDACTED wins Silver and Listener's Choice at the Signal Awards", description: "Silver and Listener's Choice for Scripted Fiction, 5th Annual Signal Awards.", images: [{ url: IMAGE, width: 1920, height: 1080 }], type: "article" },
};

type Seg = { t: string; b?: boolean; i?: boolean; href?: string };
type Block = { k: "p"; s: Seg[] } | { k: "h"; t: string };

function Inline({ s }: { s: Seg }) {
  let node: React.ReactNode = s.t;
  if (s.b) node = <strong className="font-semibold text-paper">{node}</strong>;
  if (s.i) node = <em>{node}</em>;
  if (s.href) {
    node = (
      <a href={s.href} className="text-yellow underline underline-offset-4 hover:text-paper">
        {node}
      </a>
    );
  }
  return <>{node}</>;
}

export default async function SignalReleasePage() {
  await assertVisible(PATH);
  const blocks = release.blocks as Block[];

  return (
    <Container className="py-12 sm:py-16 max-w-3xl">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: SITE.url }, { name: "Press", url: `${SITE.url}/press` }, { name: "Signal Awards 2026", url: `${SITE.url}${PATH}` }])} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: "REDACTED wins Silver and Listener's Choice for Scripted Fiction at the 5th Annual Signal Awards",
          datePublished: release.date,
          image: `${SITE.url}${IMAGE}`,
          author: { "@type": "Organization", name: "Hush Studios", url: SITE.studio.url },
          publisher: { "@type": "Organization", name: "Hush Studios", url: SITE.studio.url },
          mainEntityOfPage: `${SITE.url}${PATH}`,
        }}
      />

      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow">
        <Link href="/press" className="hover:text-paper">
          Press
        </Link>{" "}
        · Press release
      </p>
      <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-paper/60">For immediate release</p>
      <h1 className="mt-3 font-extrabold uppercase text-3xl sm:text-4xl leading-[1.1] tracking-tight text-balance">{release.headline}</h1>
      <span className="block mt-5 h-0.5 w-8 bg-yellow" aria-hidden />

      <Image src={IMAGE} alt="REDACTED show art with the 2026 Signal Awards Silver Winner and Listener's Choice badges" width={1920} height={1080} priority className="mt-8 w-full h-auto border border-white/10" />

      <dl className="mt-8 text-sm text-paper/70">
        <div className="flex gap-3">
          <dt className="font-semibold uppercase tracking-[0.14em] text-[11px] text-paper/50 pt-0.5">Contact</dt>
          <dd>
            {release.contact[0]}
            <br />
            <a href={`mailto:${release.contact[1]}`} className="text-yellow underline underline-offset-4">
              {release.contact[1]}
            </a>
          </dd>
        </div>
      </dl>

      <div className="mt-8 grid gap-5 text-[16px] leading-relaxed text-paper/85">
        {blocks.map((b, i) =>
          b.k === "h" ? (
            <h2 key={i} className="mt-6 text-[12px] font-bold uppercase tracking-[0.18em] text-yellow">
              {b.t}
            </h2>
          ) : (
            <p key={i}>
              {b.s.map((s, j) => (
                <Inline key={j} s={s} />
              ))}
            </p>
          ),
        )}
      </div>

      <p className="mt-10 text-center text-paper/40">###</p>

      <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-white/10 pt-8">
        <a href={PDF} download className="btn btn-yellow">
          Download the release (PDF)
        </a>
        <Link href="/press#images" className="btn btn-ghost">
          Press images
        </Link>
      </div>
    </Container>
  );
}
