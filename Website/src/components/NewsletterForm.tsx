"use client";

import { useState } from "react";
import Link from "next/link";

export function NewsletterForm({ compact = false, onSuccess, source = "website" }: { compact?: boolean; onSuccess?: () => void; source?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setState("busy");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: String(fd.get("first_name") ?? "").trim(),
          email: String(fd.get("email") ?? "").trim(),
          opted_in: fd.get("opted_in") === "on",
          marketing_opt_in: true,
          source,
        }),
      });
      if (res.ok) {
        setState("ok");
        setMsg("You're in! Keep an eye on your inbox.");
        form.reset();
        try {
          localStorage.setItem("alerts-subscribed", "1");
        } catch {}
        onSuccess?.();
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setState("err");
        setMsg(d.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setState("err");
      setMsg("Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3" noValidate={false}>
      <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
        <label className="grid gap-1 text-sm">
          <span>First name</span>
          <input name="first_name" required autoComplete="given-name" className="field" placeholder="Jacob" />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Email</span>
          <input name="email" type="email" required autoComplete="email" className="field" placeholder="you@example.com" />
        </label>
      </div>
      <label className="flex gap-3 items-start text-sm text-paper/85">
        <input name="opted_in" type="checkbox" required className="mt-1 size-4 accent-yellow shrink-0" />
        <span>By checking this box, I confirm that I am over 18 years of age and would like to receive REDACTED news, episode alerts, and occasional offers from REDACTED and our sponsors. You can unsubscribe at any time by clicking the link in the footer of our emails.</span>
      </label>
      <p className="text-xs text-muted max-w-prose">
        You can unsubscribe from these communications at any time. For more information on how to unsubscribe, our privacy practices, and how we are committed to protecting and respecting your privacy, please review our{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-yellow">
          Privacy Policy
        </Link>
        . By clicking subscribe, you consent to allow Redacted to store and process the personal information submitted above to provide you the content requested.
      </p>
      <div className="flex items-center gap-4 flex-wrap">
        <button type="submit" className="btn btn-yellow" disabled={state === "busy"}>
          {state === "busy" ? "Subscribing…" : "Subscribe"}
        </button>
        <p role="status" aria-live="polite" className={`text-sm ${state === "err" ? "text-red-2" : "text-yellow"}`}>
          {msg}
        </p>
      </div>
    </form>
  );
}
