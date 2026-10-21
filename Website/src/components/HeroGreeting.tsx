"use client";

import { useMember } from "@/lib/member";

/**
 * "WELCOME BACK, <NAME>" above the hero logo, for signed-in members only.
 *
 * useMember returns undefined until the token check has run, and this renders nothing in that
 * state — so the server HTML and the first client render agree, and a signed-out visitor never
 * sees a greeting flash. The name comes from Supporting Cast; if they gave us a token but no
 * usable name, the greeting stands without one rather than addressing someone as "Account".
 */
export function HeroGreeting() {
  const member = useMember();
  if (!member?.signedIn) return null;

  return (
    <p className="display text-3xl sm:text-4xl lg:text-5xl leading-[0.95] text-yellow mb-3 sm:mb-4">
      WELCOME BACK{member.name ? <>, {member.name.toUpperCase()}</> : null}
    </p>
  );
}
