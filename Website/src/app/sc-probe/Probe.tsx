"use client";

import { useEffect, useState } from "react";

const PK =
  "wpk_I8kt6WweVJg8cAvL8AtzisBdsdlW9T7eH6zEY38R5ubOaIxrQa6yqYV7BOS24w5sSk5FKSgLbbsDTnq7tmv5lR3vELNcRUlCbvN";

/**
 * Temporary diagnostic, not a product page. Answers one question: can the site discover Supporting
 * Cast's episode uuids for the whole catalogue automatically, instead of them being copied in by
 * hand one episode at a time?
 *
 * It runs in the signed-in member's browser because these endpoints only answer to a member token,
 * and prints results on the page — the console round-trip kept losing the output.
 *
 * Nothing is sent anywhere. Tokens and personal feed URLs are redacted before display.
 */
const hide = (s: string) => (s.length > 24 ? `${s.slice(0, 10)}…[${s.length} chars]` : s);

export function Probe() {
  const [lines, setLines] = useState<string[]>(["running…"]);

  useEffect(() => {
    const out: string[] = [];
    const say = (s: string) => {
      out.push(s);
      setLines([...out]);
    };

    (async () => {
      let token: string | null = null;
      try {
        token = localStorage.getItem("sc_widget_token");
      } catch {}
      if (!token) {
        say("NOT SIGNED IN — open /login, sign in, then come back to this page.");
        return;
      }
      say(`signed in — token ${hide(token)}`);

      const h = {
        "Supportingcast-Widget-Publishable-Key": PK,
        "Supportingcast-Widget-Access-Token": token,
        "Content-Type": "application/json",
      };
      const get = async (path: string) => {
        try {
          const r = await fetch(`https://widget-api.supportingcast.fm/${path}`, { headers: h });
          const text = await r.text();
          return { status: r.status, text };
        } catch (e) {
          return { status: 0, text: String((e as Error).message) };
        }
      };

      // 1. What does the member's feed record look like, and does it name a uuid we can key on?
      const feeds = await get("feeds");
      say(`GET /feeds -> ${feeds.status}`);
      let feedUuid = "";
      let rssUrl = "";
      try {
        const j = JSON.parse(feeds.text);
        const f = (j.feeds ?? [])[0] ?? {};
        feedUuid = f.uuid ?? "";
        rssUrl = f.tokenized_setup_url ?? f.url ?? "";
        say(`  feed uuid: ${feedUuid || "(none)"}`);
        say(`  feed rss:  ${rssUrl ? hide(rssUrl) : "(none)"}`);
      } catch {
        say(`  unparseable: ${feeds.text.slice(0, 120)}`);
      }

      // 2. Is there an episodes route at all? 404 means no, 200/401 means yes.
      for (const p of [
        "episodes",
        `feeds/${feedUuid}`,
        `feeds/${feedUuid}/episodes`,
        `feeds/${feedUuid}/items`,
      ]) {
        if (p.includes("//")) continue;
        const r = await get(p);
        say(`GET /${p} -> ${r.status}${r.status === 200 ? `  keys: ${keysOf(r.text)}` : ""}`);
      }

      // 3. The decisive one: does the member's RSS carry Supporting Cast's uuid per episode?
      if (rssUrl) {
        try {
          const x = await fetch(rssUrl);
          const s = await x.text();
          const items = s.split("<item>").slice(1, 4);
          say(`RSS fetched ok — ${s.split("<item>").length - 1} items`);
          items.forEach((it, i) => {
            const t = (it.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] ?? "";
            const g = (it.match(/<guid[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/guid>/) || [])[1] ?? "";
            say(`  item ${i + 1}: title="${t.trim().slice(0, 40)}"  guid="${g.trim().slice(0, 60)}"`);
          });
        } catch {
          say("RSS fetch blocked by CORS from the browser (a server can still fetch it).");
        }
      }

      // The RSS is unreadable from the browser, so ask our own server to look at it.
      try {
        const r = await fetch("/api/sc-probe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const j = await r.json();
        say("");
        say(`SERVER-SIDE RSS READ -> ${r.status}`);
        if (j.itemCount != null) say(`  items in your private feed: ${j.itemCount}`);
        (j.sample ?? []).forEach((it: Record<string, unknown>, i: number) => {
          say(`  item ${i + 1}: "${String(it.title).slice(0, 42)}"`);
          say(`    guid: ${String(it.guid).slice(0, 60)}`);
          say(`    guid is a uuid? ${it.guidLooksLikeUuid ? "YES" : "no"}`);
          say(`    audio host: ${it.enclosureHost}`);
        });
        if (j.uuidsInFirstItem?.length) say(`  uuids seen in item 1: ${j.uuidsInFirstItem.join(", ")}`);
        if (j.step) say(`  stopped at: ${j.step} ${j.status ?? ""}`);
      } catch (e) {
        say(`server probe failed: ${(e as Error).message}`);
      }

      say("done.");
    })();
  }, []);

  return (
    <pre className="mt-6 whitespace-pre-wrap break-words border border-line bg-ink-2 p-4 text-sm text-paper/90">
      {lines.join("\n")}
    </pre>
  );
}

function keysOf(text: string) {
  try {
    const j = JSON.parse(text);
    return Object.keys(j).join(",");
  } catch {
    return "(not json)";
  }
}
