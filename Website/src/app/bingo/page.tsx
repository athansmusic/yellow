import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { Container } from "@/components/ui";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";
import { assertVisible } from "@/lib/visibility";
import BingoBuilder from "./BingoBuilder";

export const metadata: Metadata = {
  title: "Bingo",
  description: "Build a bingo card for the next episode. Fill 24 squares with your predictions, pick a show theme, and download the card as a PNG for the watch party.",
  alternates: { canonical: "/bingo" },
};

export default async function BingoPage() {
  await assertVisible("/bingo");
  return (
    <Container className="py-10 sm:py-16 max-w-6xl">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: SITE.url }, { name: "Bingo", url: `${SITE.url}/bingo` }])} />
      <p className="eyebrow">Play along</p>
      <h1 className="display text-5xl sm:text-7xl mt-2">Bingo card builder</h1>
      <p className="mt-4 text-lg text-paper/90 max-w-prose">
        Call your shots before the episode drops. Fill the squares with predictions, quotes you expect to hear, or bits the cast always does, then download the card and play along live. The center square is a freebie.
      </p>
      <BingoBuilder />
    </Container>
  );
}
