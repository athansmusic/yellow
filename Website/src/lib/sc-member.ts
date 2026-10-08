import "server-only";

/**
 * Is this Supporting Cast token a real member's?
 *
 * Asked directly rather than through Curtain on purpose: this runs in the checkout path, and a
 * purchase must not fail because the CRM is having a bad day. Supporting Cast is the authority
 * either way.
 *
 * Never called with anything the browser claims about itself — only with the token it holds, which
 * only Supporting Cast can interpret.
 */
const SC_USER = "https://widget-api.supportingcast.fm/user";

/** Publishable by design: identifies the network, grants nothing, already ships in client code. */
const PK =
  "wpk_I8kt6WweVJg8cAvL8AtzisBdsdlW9T7eH6zEY38R5ubOaIxrQa6yqYV7BOS24w5sSk5FKSgLbbsDTnq7tmv5lR3vELNcRUlCbvN";

export async function isMember(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(SC_USER, {
      headers: {
        "Supportingcast-Widget-Publishable-Key": PK,
        "Supportingcast-Widget-Access-Token": token,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      // A slow answer must not hold up a checkout. Not a member for these purposes is the safe
      // failure: the customer still buys the thing, at the price everyone else pays.
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return false;
    const j = (await res.json()) as Record<string, unknown>;
    const u = (j.user ?? j.data ?? j) as Record<string, unknown>;
    return typeof (u.uuid ?? u.id ?? u.email) === "string";
  } catch {
    return false;
  }
}
