"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { NewsletterForm } from "./NewsletterForm";
import { Close } from "./Icons";

const SEEN_KEY = "alerts-popup-seen";
const DONE_KEY = "alerts-subscribed";
const COOLDOWN_DAYS = 30;

/**
 * Episode-alerts sign-up that appears once a visitor has scrolled a good way down (or lingered),
 * at most once a month, never after they've subscribed, and never on store checkout or admin pages.
 * When a promo code is set in Site settings, subscribing reveals it.
 */
export function AlertsPopup({ promoText }: { promoText?: string }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    if (/^\/(admin|checkout|cart|privacy|store-terms)/.test(pathname)) return;
    // ?alerts=1 forces it open (for checking copy and the code reveal)
    if (new URLSearchParams(window.location.search).has("alerts")) {
      setOpen(true);
      return;
    }
    try {
      if (localStorage.getItem(DONE_KEY)) return;
      const seen = Number(localStorage.getItem(SEEN_KEY) ?? 0);
      if (Date.now() - seen < COOLDOWN_DAYS * 86400_000) return;
    } catch {
      return;
    }
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      localStorage.setItem(SEEN_KEY, String(Date.now()));
      setOpen(true);
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max > 0.45) fire();
    };
    const timer = setTimeout(fire, 40_000);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const close = () => setOpen(false);

  return (
    <dialog ref={ref} onClose={close} onClick={(e) => e.target === ref.current && close()} className="backdrop:bg-black/80 bg-ink-2 text-paper border border-line p-0 m-auto w-[min(94vw,34rem)] shadow-[0_30px_80px_rgba(0,0,0,.8)]" aria-labelledby="alerts-title">
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Episode alerts</p>
            <h2 id="alerts-title" className="display text-4xl mt-1">
              {code ? "You're in." : "Know when it drops"}
            </h2>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="p-2 -m-2 text-muted hover:text-paper">
            <Close width={22} height={22} />
          </button>
        </div>

        {code ? (
          <div className="mt-5">
            <p className="text-paper/85">Your store code: 10% off orders of $25 or more.</p>
            <p className="mt-3 display text-4xl text-yellow tracking-wider select-all">{code}</p>
            <p className="mt-2 text-xs text-muted">Enter it in the promo code box at checkout.</p>
            <a href="/store" className="btn btn-yellow mt-5">
              Go to the store
            </a>
          </div>
        ) : (
          <>
            <p className="mt-3 text-paper/85">{promoText ? promoText : "An email whenever an episode drops, plus the occasional update. Sign up and get 10% off store orders of $25 or more. Unsubscribe any time."}</p>
            <div className="mt-5">
              <NewsletterForm
                compact
                source="website-popup"
                onSuccess={(promoCode) => {
                  localStorage.setItem(DONE_KEY, "1");
                  if (promoCode) setCode(promoCode);
                  else setTimeout(close, 1800);
                }}
              />
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
