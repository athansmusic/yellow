import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { AlbumsFeed } from "@/components/AlbumsFeed";

/** Unlisted: the downloads are behind a membership check, so a search result would only mislead. */
export const metadata: Metadata = {
  title: "Albums",
  robots: { index: false, follow: false },
};

export default function AlbumsPage() {
  return (
    <Container className="py-16">
      <h1 className="display text-5xl sm:text-6xl leading-[0.95]">ALBUMS</h1>
      <p className="mt-4 max-w-prose text-muted">Music from the show, yours to keep.</p>
      <div className="mt-10">
        <AlbumsFeed />
      </div>
    </Container>
  );
}
