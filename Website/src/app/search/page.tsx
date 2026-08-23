import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { SearchPanel } from "@/components/SiteSearch";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

/** Full-page fallback for the search overlay (shared links, no-JS-at-first-paint, etc.). */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return (
    <Container className="py-10 sm:py-16 max-w-3xl">
      <p className="eyebrow">Search</p>
      <h1 className="display text-5xl mt-1 mb-6">Find anything</h1>
      <SearchPanel initial={q.slice(0, 80)} />
    </Container>
  );
}
