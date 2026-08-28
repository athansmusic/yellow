"use client";

import { useEffect, useRef } from "react";

/**
 * SupportingCast membership widget.
 *
 * This deliberately does NOT restyle the widget. The previous version carried ~200 lines of
 * !important overrides repainting its cards, buttons and fields dark, class by class. That was
 * unwinnable: the widget is built for a light background (white cards, #222 text, its own Tailwind
 * build), it renders several views, and any override set only covers the views and class names that
 * were checked on the day. Views that were never opened rendered unreadable, in both directions.
 *
 * So the widget gets the light surface it was designed for, framed as a panel inside the dark page.
 * The only rules below are structural — corners and font, neither of which can make text invisible.
 * Nothing here depends on knowing their DOM, so a change on their end cannot silently break it.
 */
export function SupportingCastWidget() {
  const hostRef = useRef<HTMLDivElement>(null);

  // The widget script scans for its mount when it executes, and React hydration must never see the
  // foreign DOM it injects (error #418 wiped the whole widget when the cached script won the race).
  // So the mount div is created OUTSIDE React's tree, and the script is added only after the mount
  // exists — fresh each time, so client-side navigation back to this page re-initializes it.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || host.querySelector("#supportingcast-widget")) return;
    const mount = document.createElement("div");
    mount.id = "supportingcast-widget";
    mount.setAttribute("data-initial-view", "shop");
    mount.setAttribute("data-menu-visible", "false");
    mount.setAttribute(
      "data-publishable-key",
      "wpk_I8kt6WweVJg8cAvL8AtzisBdsdlW9T7eH6zEY38R5ubOaIxrQa6yqYV7BOS24w5sSk5FKSgLbbsDTnq7tmv5lR3vELNcRUlCbvN",
    );
    host.appendChild(mount);
    document.querySelector('script[src*="sc-widget.js"]')?.remove();
    const script = document.createElement("script");
    script.src = "https://hushstudios.supportingcast.fm/js/sc-widget.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
/* Structural only. No colour rules — the widget supplies its own, and it is on a light ground. */
#supportingcast-widget { display: block; font-family: var(--font-body); }
#supportingcast-widget *,
#supportingcast-widget *::before,
#supportingcast-widget *::after { border-radius: 0 !important; }
`,
        }}
      />
      {/* The paper panel the widget was designed to sit on, framed to belong to the dark page. */}
      <div className="bg-paper text-ink border border-line p-5 sm:p-8">
        <div ref={hostRef} />
      </div>
    </>
  );
}
