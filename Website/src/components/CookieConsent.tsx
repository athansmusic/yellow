"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Script from "next/script";

const KEY = "cookie-consent"; // "granted" | "denied"
const EVENT = "cookie-consent-change";

export function readConsent(): "granted" | "denied" | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

function writeConsent(v: "granted" | "denied") {
  try {
    localStorage.setItem(KEY, v);
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: v }));
}

/** Bottom bar asking for the analytics cookie. Shown once; the answer is remembered in this browser. */
export function CookieConsent() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (readConsent() === null) setShow(true);
  }, []);
  if (!show) return null;
  return (
    <div role="dialog" aria-live="polite" aria-label="Cookie notice" className="bottom-bar fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 backdrop-blur px-4 py-3">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <p className="text-paper/85 flex-1 min-w-[14rem]">
          We use one analytics cookie to count visits. Nothing is sold or shared.{" "}
          <Link href="/privacy#analytics" className="underline underline-offset-4 hover:text-yellow">
            Details
          </Link>
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => { writeConsent("denied"); setShow(false); }} className="btn btn-ghost !min-h-9 !text-base !px-3">
            No thanks
          </button>
          <button type="button" onClick={() => { writeConsent("granted"); setShow(false); }} className="btn btn-yellow !min-h-9 !text-base !px-3">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

/** GA4 loads only after consent, lazily, so the tag never competes with the page. */
export function Analytics({ gaId }: { gaId: string }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setOk(readConsent() === "granted");
    const on = (e: Event) => setOk((e as CustomEvent).detail === "granted");
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  if (!ok) return null;
  return (
    <>
      <Script id="ga-init" strategy="lazyOnload">
        {`window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${gaId}');`}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="lazyOnload" />
    </>
  );
}
