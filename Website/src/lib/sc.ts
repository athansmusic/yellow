/**
 * Supporting Cast's widget API, called directly.
 *
 * Their own embed makes these calls from this origin already, so there is nothing to proxy: the
 * API allows the browser through, and the token in localStorage is the member's own. Going direct
 * keeps the page fast and means a saved field is confirmed by the same response their widget gets.
 *
 * The shape below was read from their bundle rather than their docs, which do not cover it. If a
 * call starts failing, that is the first place to look.
 */

/** Publishable by design: it identifies the network, grants nothing, and ships in client code. */
export const SC_PK =
  "wpk_I8kt6WweVJg8cAvL8AtzisBdsdlW9T7eH6zEY38R5ubOaIxrQa6yqYV7BOS24w5sSk5FKSgLbbsDTnq7tmv5lR3vELNcRUlCbvN";

const API = "https://widget-api.supportingcast.fm";

/** Their user object, camelCase, as their widget reads it. */
export type ScNotifications = { posts?: boolean; newEpisodes?: boolean };

/** One line of what a plan includes. Their markdown is plain text in practice. */
export type ScBenefit = { id: number; position: number; benefit_md: string };

/**
 * A membership, as their user object describes it.
 *
 * Only the fields this site renders are named. Theirs carries a good deal more — stripe ids, price
 * ids, pending-change bookkeeping — none of which belongs on a page a member reads.
 */
export type ScSubscription = {
  active: boolean;
  status: string;
  auto_renew: boolean;
  name: string;
  price_description: string;
  price_amount: number;
  interval: string;
  is_free: boolean;
  is_trialing: boolean;
  is_gift: boolean;
  gifter_name: string | null;
  gift_expires_at_formatted: string | null;
  ends_at_formatted: string | null;
  benefits_prefix_md: string | null;
  benefit_items: ScBenefit[] | null;
  // Null on a comped or gifted membership — nothing is being charged, so nothing renews.
  stripe_subscription_id: string | null;
};

/**
 * The card on file.
 *
 * Null for anyone not being charged, and its populated shape has not been seen from here, so every
 * field is optional and the display copes with all of them missing.
 */
export type ScPaymentMethod = {
  brand?: string;
  last4?: string;
  exp_month?: number | string;
  exp_year?: number | string;
  card?: { brand?: string; last4?: string; exp_month?: number | string; exp_year?: number | string };
} | null;

export type ScUser = {
  uuid: string | null;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl: string;
  accountPageRestricted: boolean;
  // Their default user object carries this as an empty array and the populated one as an object,
  // so it is read through notificationsOf rather than trusted to be either.
  notifications?: ScNotifications | unknown[];
  subscriptions?: ScSubscription[] | null;
  paymentMethod?: ScPaymentMethod;
};

/**
 * Whether it worked comes from the status line, not the body.
 *
 * Reading success out of the response shape was a mistake worth recording: a write that answered
 * with only a message — no user object — was taken for a refusal, so a save that had genuinely
 * landed left the field showing its old value and reported an error. The status says plainly what
 * their body only implies.
 */
export type ScResult<T> = { ok: boolean; status: number; data: T & { message?: string } };

async function call<T>(
  path: string,
  method: "GET" | "PUT",
  token: string,
  body?: unknown,
): Promise<ScResult<T>> {
  const res = await fetch(`${API}/${path}`, {
    method,
    headers: {
      "Supportingcast-Widget-Publishable-Key": SC_PK,
      "Supportingcast-Widget-Access-Token": token,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    // Re-reading straight after a write is the whole point of these calls; a cached body would
    // hand back the value we just changed and make a successful save look like it did nothing.
    cache: "no-store",
  });

  let data = {} as T & { message?: string };
  if (res.status !== 204) {
    try {
      data = (await res.json()) as T & { message?: string };
    } catch {
      // 429s and gateway errors are not always JSON; the status still tells the caller enough.
    }
  }

  // 429 is the one worth naming: their API allows 60 requests a minute, and past that even the
  // preflight fails, which the browser then reports as a CORS error.
  if (res.status === 429) data.message ||= "Supporting Cast is rate limiting us. Wait a moment.";

  return { ok: res.ok, status: res.status, data };
}

export const scGetUser = (token: string) => call<ScUser>("user", "GET", token);

/** Send only what changed — a full object would overwrite fields this page does not show. */
export const scPutUser = (
  token: string,
  patch: Partial<Pick<ScUser, "displayName" | "email">> & { notifications?: ScNotifications },
) => call<ScUser>("user", "PUT", token, patch);

/** Their empty state is an array, their populated one an object. Both mean "nothing set" here. */
export function notificationsOf(user: ScUser | null): ScNotifications {
  const n = user?.notifications;
  return n && !Array.isArray(n) ? (n as ScNotifications) : {};
}

export const scPutAvatar = (token: string, dataUrl: string) =>
  call<{ success?: boolean; url?: string }>("avatar", "PUT", token, { upload: dataUrl });

/**
 * A photo straight off a phone is several megabytes and takes seconds to upload as base64 — their
 * own widget takes nearly three. Drawn down to 512px first, which is larger than anywhere it is
 * ever displayed.
 */
export function shrinkToDataUrl(file: File, max = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("could not read that file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("that file is not an image"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** The membership to show. Members hold one in practice; the active one wins if that changes. */
export function activeSubscription(user: ScUser | null): ScSubscription | null {
  const subs = user?.subscriptions;
  if (!Array.isArray(subs) || subs.length === 0) return null;
  return subs.find((s) => s.active) ?? subs[0];
}

/** Brand and last four, however their payload happens to nest them. */
export function cardOf(pm: ScPaymentMethod): { brand: string; last4: string; expires: string } | null {
  if (!pm) return null;
  const c = pm.card ?? pm;
  const last4 = c.last4;
  if (!last4) return null;
  const month = c.exp_month ? String(c.exp_month).padStart(2, "0") : null;
  const year = c.exp_year ? String(c.exp_year).slice(-2) : null;
  return {
    brand: c.brand ? c.brand.replace(/\b\w/g, (m) => m.toUpperCase()) : "Card",
    last4: String(last4),
    expires: month && year ? `${month}/${year}` : "",
  };
}
