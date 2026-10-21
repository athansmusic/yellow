"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    ScWidget?: { init: () => void };
  }
}

/**
 * SupportingCast membership widget, framed the way the design comp calls for: a light card inset
 * into a dark panel, rather than the widget repainted dark.
 *
 * This deliberately does NOT restyle the widget's internals. The previous version carried ~200
 * lines of !important overrides recolouring its cards, buttons and fields class by class. That was
 * unwinnable — the widget is built for a light ground (white cards, #222 text, its own Tailwind
 * build) and renders several views, so any override set only covers the views and class names that
 * were checked on the day. Views nobody opened rendered unreadable, in both directions.
 *
 * Supporting Cast documents no theming API at all; every embed attribute is behavioural. So the
 * only durable answer is to give it the surface it expects and frame that surface instead.
 */
export function SupportingCastWidget() {
  const hostRef = useRef<HTMLDivElement>(null);

  // React hydration must never see the DOM the widget injects (error #418 wiped the whole widget
  // when the cached script won the race), so the mount lives OUTSIDE React's tree.
  //
  // Auto-init fires on window.load. The script is appended after that, so on a warm cache the
  // widget could initialise before its mount existed — or not at all, which is why it intermittently
  // rendered nothing. data-autoinit="false" plus an explicit init() removes the race entirely.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || host.querySelector("#supportingcast-widget")) return;

    const mount = document.createElement("div");
    mount.id = "supportingcast-widget";
    mount.setAttribute("data-initial-view", "shop");
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
/* Structural only. No colour rules — the widget supplies its own and now sits on a light ground,
   so nothing here is capable of making its text invisible in any view. */
#supportingcast-widget { display: block; font-family: var(--font-body); }
#supportingcast-widget *,
#supportingcast-widget *::before,
#supportingcast-widget *::after { border-radius: 0 !important; }
`,
        }}
      />
      {/* Dark frame, hatched inset, light card — the comp's treatment. */}
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
