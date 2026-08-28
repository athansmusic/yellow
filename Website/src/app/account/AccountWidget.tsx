"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    ScWidget?: { init: () => void };
  }
}

/**
 * SupportingCast account view — the member-facing side of the same embed the join page uses, and
 * framed identically: a light card inset in a dark panel.
 *
 * Deliberately no colour overrides, for a stronger reason than on the join page. This view is
 * behind a member login, so its login, settings and feed-setup screens cannot be loaded or checked
 * from here at all. Hand-theming screens nobody can see is what put white text on white panels on
 * the join page. The widget is built for a light ground; giving it one makes every screen legible
 * without needing to have seen it.
 */
export function AccountWidget() {
  const hostRef = useRef<HTMLDivElement>(null);

  // Two hard-won rules, same as the join page: the mount lives outside React's tree, because
  // hydration seeing the widget's injected DOM wiped it (error #418); and auto-init is disabled,
  // because it fires on window.load while the script is appended after it — a race the widget
  // sometimes lost, rendering nothing at all.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || host.querySelector("#supportingcast-widget")) return;

    const mount = document.createElement("div");
    mount.id = "supportingcast-widget";
    mount.setAttribute("data-initial-view", "account");
    mount.setAttribute("data-menu-visible", "false");
    mount.setAttribute("data-autoinit", "false");
    mount.setAttribute(
      "data-publishable-key",
      "wpk_I8kt6WweVJg8cAvL8AtzisBdsdlW9T7eH6zEY38R5ubOaIxrQa6yqYV7BOS24w5sSk5FKSgLbbsDTnq7tmv5lR3vELNcRUlCbvN",
    );
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
    script.src = "https://hushstudios.supportingcast.fm/js/sc-widget.js";
    script.async = true;
    script.onload = start;
    document.body.appendChild(script);
  }, []);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
/* Structural only — no colour rules, so nothing here can make text invisible on a screen that
   cannot be previewed from outside a member login. */
#supportingcast-widget { display: block; font-family: var(--font-body); }
#supportingcast-widget *,
#supportingcast-widget *::before,
#supportingcast-widget *::after { border-radius: 0 !important; }
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
          <div className="bg-paper text-ink p-5 sm:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div ref={hostRef} />
          </div>
        </div>
      </div>
    </>
  );
}
