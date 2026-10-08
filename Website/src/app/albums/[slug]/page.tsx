import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { AlbumsFeed } from "@/components/AlbumsFeed";

export const metadata: Metadata = {
  title: "Albums",
  robots: { index: false, follow: false },
};

export default async function AlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Container className="py-16">
      <AlbumsFeed slug={slug} />
    </Container>
  );
}
