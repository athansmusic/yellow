import { Container } from "@/components/ui";

/**
 * Shown the instant an episode link is clicked, while the next page's data resolves.
 *
 * Mirrors the real header band's geometry — cover square, title block, button row — so the page
 * does not jump when it swaps in. Bars only; no spinner, because a skeleton that matches the
 * layout reads as "this is arriving" rather than "something is wrong".
 */
export default function Loading() {
  return (
    <article aria-busy="true">
      <span className="sr-only" role="status">
        Loading episode
      </span>

      <div className="relative overflow-hidden border-b border-line bg-ink-2/40">
        <Container className="relative py-8 sm:py-12">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="h-4 w-40 bg-paper/10 animate-pulse motion-reduce:animate-none" />
            <div className="flex gap-2">
              <div className="h-10 w-20 bg-paper/10 animate-pulse motion-reduce:animate-none" />
              <div className="h-10 w-24 bg-paper/10 animate-pulse motion-reduce:animate-none" />
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="size-40 sm:size-52 shrink-0 bg-paper/10 animate-pulse motion-reduce:animate-none" />
            <div className="min-w-0 flex-1">
              <div className="h-3 w-56 bg-paper/10 animate-pulse motion-reduce:animate-none" />
              <div className="mt-4 h-9 sm:h-12 w-4/5 bg-paper/10 animate-pulse motion-reduce:animate-none" />
              <div className="mt-3 h-9 sm:h-12 w-3/5 bg-paper/10 animate-pulse motion-reduce:animate-none" />
              <div className="mt-5 space-y-2 max-w-prose">
                <div className="h-4 w-full bg-paper/10 animate-pulse motion-reduce:animate-none" />
                <div className="h-4 w-11/12 bg-paper/10 animate-pulse motion-reduce:animate-none" />
              </div>
              <div className="mt-6 h-12 w-44 bg-paper/10 animate-pulse motion-reduce:animate-none" />
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-8">
        <div className="h-24 w-full bg-paper/[0.06] animate-pulse motion-reduce:animate-none" />
      </Container>
    </article>
  );
}
