import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { UpdatesFeed } from "@/components/UpdatesFeed";

/**
 * Updates — posts for members. Unlisted like /account and /feeds: noindex and out of the sitemap,
 * because the content is behind a membership check and a search result promising it would lie.
 */
export const metadata: Metadata = {
  title: "Updates",
  robots: { index: false, follow: false },
};

/**
 * ?tag= arrives from the chips on a post, so following one lands on the list already narrowed.
 * Read here rather than with useSearchParams, which would need a Suspense boundary to say the
 * same thing.
 */
export default async function UpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  return (
    <Container className="py-16">
      <h1 className="display text-5xl sm:text-6xl leading-[0.95]">UPDATES</h1>
      <p className="mt-4 max-w-prose text-muted">Notes, extras and news for members.</p>
      <div className="mt-10">
        <UpdatesFeed initialTag={tag} />
      </div>
    </Container>
  );
}
