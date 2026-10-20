"use client";

import { useRef, useState } from "react";

const field = "w-full bg-white/[0.04] border border-white/15 px-4 py-3 text-[15px] text-paper placeholder:text-paper/35 focus:border-yellow focus:outline-none";
const label = "block text-[10px] font-bold uppercase tracking-[0.18em] text-paper/60 mb-1.5";

export function PartnerForm({ email }: { email: string }) {
  const opened = useRef(Date.now());
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    const f = new FormData(e.currentTarget);
    setState("sending");
    setError("");
    try {
      const r = await fetch("/api/partner-inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(f), t: opened.current }),
      });
      const data = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(data.error ?? "Something went wrong.");
      setState("sent");
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="mx-auto mt-10 max-w-xl border border-yellow/50 bg-yellow/[0.04] p-8 text-center">
        <p className="display text-3xl text-yellow">Message sent</p>
        <p className="mt-3 text-[15px] text-paper/75">Thanks. It went straight to Athan, and you&apos;ll hear back from us by email.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-10 max-w-xl text-left grid gap-4">
      {/* Honeypot: invisible to people, filled in by bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pf-name" className={label}>
            Your name
          </label>
          <input id="pf-name" name="name" required maxLength={120} autoComplete="name" className={field} />
        </div>
        <div>
          <label htmlFor="pf-email" className={label}>
            Email
          </label>
          <input id="pf-email" name="email" type="email" required maxLength={200} autoComplete="email" className={field} />
        </div>
      </div>
      <div>
        <label htmlFor="pf-company" className={label}>
          Company <span className="normal-case tracking-normal text-paper/40">(optional)</span>
        </label>
        <input id="pf-company" name="company" maxLength={160} autoComplete="organization" className={field} />
      </div>
      <div>
        <label htmlFor="pf-message" className={label}>
          Description
        </label>
        <textarea id="pf-message" name="message" required rows={5} maxLength={4000} placeholder="Tell us about your brand or project and what you have in mind." className={`${field} resize-y`} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      <button type="submit" disabled={state === "sending"} className="btn btn-yellow justify-self-start disabled:opacity-60">
        {state === "sending" ? "Sending…" : "Send message"}
      </button>
      <p className="text-xs text-paper/45">
        Prefer email? <a href={`mailto:${email}?subject=Partnership`} className="underline hover:text-yellow">{email}</a>
      </p>
    </form>
  );
}
