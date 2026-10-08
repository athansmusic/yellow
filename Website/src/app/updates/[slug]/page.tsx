import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { UpdatesFeed } from "@/components/UpdatesFeed";

/**
 * One update. The title is not in the metadata because the post is members-only — the page cannot
 * know who is asking at render time, and a share card giving away members' copy would undo the gate.
 */
export const metadata: Metadata = {
  title: "Updates",
  robots: { index: false, follow: false },
};

export default async function UpdatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Container className="py-16">
      <UpdatesFeed slug={slug} />
    </Container>
  );
}
