import { permanentRedirect } from "next/navigation";

/** Old Discord notifications linked /postmortem/<slug>; everything lives under /episodes now. */
export default async function LegacyPostmortem({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/episodes/${slug.startsWith("postmortem-") ? slug : `postmortem-${slug}`}`);
}
