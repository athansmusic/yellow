"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    ScWidget?: { init: () => void };
  }
}

const SC_WIDGET_JS = "https://hushstudios.supportingcast.fm/js/sc-widget.js";
/** Publishable by design — it identifies the network, grants nothing, and is already client-side. */
const PK =
  "wpk_I8kt6WweVJg8cAvL8AtzisBdsdlW9T7eH6zEY38R5ubOaIxrQa6yqYV7BOS24w5sSk5FKSgLbbsDTnq7tmv5lR3vELNcRUlCbvN";

/** The screens of their embed we route to. `setup` is their name for the feed / add-to-app page. */
export type ScView = "login" | "account" | "setup";

/**
 * Headings whose sections this page already owns, so the embed should not show them twice.
 *
 * Matched on their visible text because their markup carries no ids or section hooks. If they
 * rename a heading the match stops working and the duplicate section reappears — visibly wrong
 * rather than silently broken, which is the right way round for cosmetic surgery on somebody
 * else's DOM.
 */
export const SC_SECTIONS = {
  general: "General",
  avatar: "Avatar",
  notifications: "Notification Settings",
  subscription: "Subscription",
  payment: "Payment Details",
} as const;

/**
 * One mount for Supporting Cast's embed, pointed at whichever of their screens a route wants.
 *
 * Sign-in, account and feed setup were three near-identical copies of this file that differed only
 * in one attribute, so a fix to any of them had to be made three times.
 *
 * Deliberately no colour rules beyond squaring the corners. These screens sit behind a member
 * login and cannot be loaded or checked from outside one, and hand-theming screens nobody can see
 * is what put white text on white panels on the join page. The widget is built for a light ground,
 * so it gets one: a light card inset in a dark panel, matching the join page.
 */
export function ScWidget({ view, hide = [] }: { view: ScView; hide?: string[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  // The prop is written inline at the call site, so its identity changes every render; the effect
  // below keys off the contents instead of rebuilding its observer each time.
  const hideKey = hide.join("|");

  // Two hard-won rules, same as the join page: the mount lives outside React's tree, because
  // hydration seeing the widget's injected DOM wiped it (error #418); and auto-init is disabled,
  // because it fires on window.load while the script is appended after it — a race the widget
  // sometimes lost, rendering nothing at all.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || host.querySelector("#supportingcast-widget")) return;

    const mount = document.createElement("div");
    mount.id = "supportingcast-widget";
    mount.setAttribute("data-initial-view", view);
    mount.setAttribute("data-menu-visible", "false");
    mount.setAttribute("data-autoinit", "false");
    mount.setAttribute("data-publishable-key", PK);
    // The whole integration hinges on this one attribute. Their widget only sends redirect_url
    // with auth/request when it is set, and without it Supporting Cast points the emailed link at
    // their own domain — so the token is written to THEIR origin, and localStorage being
    // per-origin, this site can never see that anyone signed in.
    mount.setAttribute("data-redirect-url", `${window.location.origin}/account`);
    if (view === "setup") mount.setAttribute("data-setup-list-subfeeds", "true");
    host.appendChild(mount);

    const start = () => {
      try {
        window.ScWidget?.init();
      } catch {
        /* the widget logs its own failures */
      }
    };

    const existing = document.querySelector<HTMLScriptElement>('script[src*="sc-widget.js"]');
    if (existing && window.ScWidget) {
      start();
      return;
    }
    existing?.remove();
    const script = document.createElement("script");
    script.src = SC_WIDGET_JS;
    script.async = true;
    script.onload = start;
    document.body.appendChild(script);
  }, [view]);

  /*
   * Hide the sections this page renders itself.
   *
   * The widget mounts asynchronously and re-renders on its own, so this watches rather than runs
   * once. Everything it does is display-only: nothing is removed, so a mis-hit is undone by
   * turning the prop off, and the widget never notices its own DOM was touched.
   */
  useEffect(() => {
    const host = hostRef.current;
    if (!host || hide.length === 0) return;

    const keep = [SC_SECTIONS.subscription, SC_SECTIONS.payment];

    const trim = () => {
      const headings = host.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6, legend");
      for (const h of Array.from(headings)) {
        const text = (h.textContent ?? "").trim();
        if (!hide.some((label) => text === label)) continue;

        // Climb to the largest ancestor that still holds only this section — stopping before one
        // that would take a section we are keeping with it.
        let node: HTMLElement = h;
        while (node.parentElement && node.parentElement !== host) {
          const parent = node.parentElement;
          const swallows = keep.some((k) => (parent.textContent ?? "").includes(k));
          if (swallows) break;
          node = parent;
        }

        if (node === h) {
          // Flat layout: the heading's siblings are the section. Hide up to the next heading.
          let sib = h.nextElementSibling as HTMLElement | null;
          h.style.display = "none";
          while (sib && !/^H[1-6]$|^LEGEND$/.test(sib.tagName)) {
            sib.style.display = "none";
            sib = sib.nextElementSibling as HTMLElement | null;
          }
        } else {
          node.style.display = "none";
        }
      }
    };

    trim();
    const observer = new MutationObserver(trim);
    observer.observe(host, { childList: true, subtree: true });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hideKey is the stable form of hide
  }, [hideKey]);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
/* Structural only — no colour rules, so nothing here can make text invisible on a screen that
   cannot be previewed from outside a member login. */
#supportingcast-widget { display: block; font-family: var(--font-body); max-width: 100%; }
#supportingcast-widget *,
#supportingcast-widget *::before,
#supportingcast-widget *::after { border-radius: 0 !important; }

/* Keep their layout inside our card on a phone.
   Their rows are built for a desktop-width panel: a field sized in absolute units with its
   control beside it. Below about 420px that row is wider than the card, so the field runs past
   the edge and the "Change" beside it lands on the page background outside the panel.
   min-width:0 lets a flex child shrink under its intrinsic width (without it a text input floors
   at roughly its size attribute), box-sizing keeps padded fields honest, and max-width caps
   anything sized absolutely. */
#supportingcast-widget * { min-width: 0; max-width: 100%; box-sizing: border-box; }
#supportingcast-widget input,
#supportingcast-widget select,
#supportingcast-widget textarea { width: 100%; }
/* Their controls are single words — "Change", "Save" — and min-width:0 above lets the cell holding
   one shrink until it breaks the word across two lines. Nothing is gained by wrapping a control:
   let it hold its width and take the space it needs. */
#supportingcast-widget a,
#supportingcast-widget button { white-space: nowrap; }
`,
        }}
      />
      {/* Same frame as the join page: hairline border, hatched inset, light card. */}
      <div className="border border-line bg-ink-2">
        <div
          className="p-4 sm:p-6"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(242,240,234,0.035) 0 2px, transparent 2px 8px)",
          }}
        >
          <div className="bg-paper text-ink p-5 sm:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-x-auto">
            <div ref={hostRef} />
          </div>
        </div>
      </div>
    </>
  );
}
