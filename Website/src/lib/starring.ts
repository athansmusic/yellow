import cast from "@/data/cast.json";

/**
 * "Jamie Petronis as Jacob Kane" resolved to the person and the part.
 *
 * Shared because two places render the same cast list from the same strings: the episode page, and
 * /api/early for an episode whose cast is withheld until Supporting Cast vouches for the reader.
 * Resolving it in one place is what keeps those two lists identical.
 */
export type StarringEntry = {
  actor: string;
  role?: string;
  member?: { slug: string; actor: string } | null;
  guestLink?: string;
};

const GUEST_ACTOR_LINKS: Record<string, string> = {
  pixelvixx: "https://www.twitch.tv/pixelvixx",
};

/** Actors credited under a different name than their cast entry. */
const CAST_ALIASES: Record<string, string> = { johnathanmagno: "athan" };

const norm = (x: string) => x.toLowerCase().replace(/[^a-z]/g, "");

export function guestLinkFor(actor: string) {
  return GUEST_ACTOR_LINKS[norm(actor)];
}

export function castFor(actor: string) {
  const a = norm(actor);
  return (
    cast.find((c) => norm(c.actor) === a) ??
    cast.find((c) => c.slug === CAST_ALIASES[a]) ??
    cast.find((c) => a.startsWith(norm(c.actor)) || norm(c.actor).startsWith(a))
  );
}

export function resolveStarring(lines: string[]): StarringEntry[] {
  return lines.map((s) => {
    const [actor, role] = s.split(/\s+as\s+/i);
    const a = actor.trim();
    const m = castFor(a);
    return { actor: a, role: role?.trim(), member: m ? { slug: m.slug, actor: m.actor } : null, guestLink: guestLinkFor(a) };
  });
}
