import { EXTERNAL } from "@/lib/site";

export type Stats = { totalPlays?: number; dailyAverage?: number; hoursConsumed?: number; followers?: number; discordMembers?: number; avgViewers?: number; lastUpdated?: string };

const num = (v: string) => parseFloat(String(v).replace(/,/g, "").replace(/[^0-9.-]/g, "")) || 0;

/** Split one CSV row, honoring double quotes (numbers in the sheet are written as "1,439,852"). */
export function parseRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i <= line.length; i++) {
    const c = line[i];
    if (c === '"') q = !q;
    else if ((c === "," || c === undefined) && !q) {
      out.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  return out;
}

/** Shape of the RedactedStats public feed (aggregate-only, updated daily,
 * settled numbers with a 4-day delay). */
type Feed = {
  updated_at: string;
  daily: { date: string; acast?: number; spotify?: number; apple?: number; youtube?: number; youtube_pm?: number; total: number }[];
  totals: { acast: number; spotify: number; apple: number; youtube: number; youtube_pm: number; all_platforms: number };
  followers?: { spotify?: number | null; apple?: number | null; as_of?: string | null };
  hours?: { alltime?: { total?: number | null }; last30d?: { total?: number | null }; as_of?: string | null };
  demographics?: {
    as_of: string;
    age: Record<string, number>;
    gender: Record<string, number>;
    countries: { name: string; count: number }[];
    country_total: number;
  } | null;
  ratings?: Record<string, { average: number; count: number | null; as_of: string }>;
  acast_apps?: { apps: string[]; totals: Record<string, number> };
};

async function getFeed(): Promise<Feed | null> {
  try {
    const res = await fetch(EXTERNAL.statsFeed, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as Feed;
  } catch {
    return null;
  }
}

export async function getStats(): Promise<Stats> {
  const s: Stats = {};
  // The automated feed is authoritative; the legacy sheet still supplies the
  // couple of values it doesn't track; the Discord worker is live.
  const [feed, sheet, discord] = await Promise.allSettled([
    getFeed(),
    fetch(EXTERNAL.partnerStatsCsv, { next: { revalidate: 3600 } }).then((r) => r.text()),
    fetch(EXTERNAL.discordCountApi, { next: { revalidate: 3600 } }).then((r) => r.json() as Promise<{ members?: number }>),
  ]);
  if (sheet.status === "fulfilled") {
    for (const line of sheet.value.split(/\r?\n/)) {
      const [k = "", v = ""] = parseRow(line);
      if (/total plays/i.test(k)) s.totalPlays = num(v);
      else if (/daily average/i.test(k)) s.dailyAverage = num(v);
      else if (/hours consumed/i.test(k)) s.hoursConsumed = num(v);
      else if (/followers/i.test(k)) s.followers = num(v);
      else if (/discord members/i.test(k)) s.discordMembers = num(v);
      else if (/avg viewers/i.test(k)) s.avgViewers = num(v);
      else if (/last updated/i.test(k)) s.lastUpdated = v;
    }
  }
  if (feed.status === "fulfilled" && feed.value) {
    const f = feed.value;
    s.totalPlays = f.totals.all_platforms;
    if (f.daily.length) s.dailyAverage = Math.round(f.totals.all_platforms / f.daily.length);
    const fol = (f.followers?.spotify ?? 0) + (f.followers?.apple ?? 0);
    if (fol > 0) s.followers = fol;
    // All-time listening/watch hours (Spotify + Apple + YouTube; Acast/RSS has no duration data)
    if (f.hours?.alltime?.total) s.hoursConsumed = Math.round(f.hours.alltime.total);
    s.lastUpdated = new Date(f.updated_at).toLocaleDateString("en-US", { month: "long" }) + " " + new Date(f.updated_at).getFullYear();
  }
  if (discord.status === "fulfilled" && discord.value?.members) s.discordMembers = discord.value.members;
  return s;
}

export type Audience = {
  /** Top 4 listening sources + "Other", as [name, percent] */
  platforms: [string, number][];
  /** Top regions as [country, "NN.N%"] */
  regions: [string, string][];
  /** Demo tiles as [label, value, note] */
  demos: [string, string, string][];
  asOf: string;
};

// Listening apps that are counted as their own platform, not under Acast
const PLATFORM_APPS = new Set(["Spotify", "Apple Podcasts", "YouTube"]);
const AGE_18_44 = ["18-22", "23-27", "28-34", "35-44"];

/** Live audience data from the automated feed; null if unavailable (callers keep a static fallback). */
export async function getAudience(): Promise<Audience | null> {
  const f = await getFeed();
  if (!f?.demographics || !f.acast_apps) return null;

  // Platform breakdown: the four headline platforms plus every other Acast
  // listening app, top 4 shown, everything else folded into "Other".
  const entries: [string, number][] = [
    ["Spotify", f.totals.spotify],
    ["Apple Podcasts", f.totals.apple],
    ["YouTube", f.totals.youtube + f.totals.youtube_pm],
    ...Object.entries(f.acast_apps.totals).filter(([name]) => !PLATFORM_APPS.has(name)) as [string, number][],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  const grand = entries.reduce((a, [, v]) => a + v, 0);
  const top = entries.slice(0, 4);
  const other = grand - top.reduce((a, [, v]) => a + v, 0);
  const pct = (v: number) => Math.round((v / grand) * 1000) / 10;
  const platforms: [string, number][] = [...top.map(([n, v]) => [n, pct(v)] as [string, number]), ["Other", pct(other)]];

  const d = f.demographics;
  const regions: [string, string][] = d.countries.slice(0, 5).map((c) => [c.name, `${((c.count / d.country_total) * 100).toFixed(1)}%`]);

  const ageTotal = Object.values(d.age).reduce((a, v) => a + v, 0);
  const genderTotal = Object.values(d.gender).reduce((a, v) => a + v, 0);
  const agePct = (buckets: string[]) => (buckets.reduce((a, b) => a + (d.age[b] ?? 0), 0) / ageTotal) * 100;
  const peak = Object.entries(d.age).sort((a, b) => b[1] - a[1])[0];
  const gPct = (g: string) => ((d.gender[g] ?? 0) / genderTotal) * 100;
  const demos: [string, string, string][] = [
    ["Core age range", "18 to 44", `${agePct(AGE_18_44).toFixed(0)}% of listeners`],
    ["Peak bracket", peak ? peak[0].replace("60-150", "60+") : "n/a", peak ? `${((peak[1] / ageTotal) * 100).toFixed(1)}% of audience` : ""],
    ["Male", `${gPct("MALE").toFixed(1)}%`, "Spotify listener data"],
    ["Female", `${gPct("FEMALE").toFixed(1)}%`, "Spotify listener data"],
    ["Non-binary", `${gPct("NON_BINARY").toFixed(1)}%`, "Spotify listener data"],
  ];

  return { platforms, regions, demos, asOf: d.as_of };
}

export type PlaysSeries = { dates: string[]; apple: number[]; spotify: number[]; acast: number[]; youtube: number[] };

/** Daily plays by platform from the automated feed. YouTube includes the PM
 * playlist; Acast is every other listening app (RSS). */
export async function getDailyPlays(): Promise<PlaysSeries | null> {
  const feed = await getFeed();
  if (!feed || feed.daily.length < 2) return null;
  const d = feed.daily;
  return {
    dates: d.map((r) => r.date),
    apple: d.map((r) => r.apple ?? 0),
    spotify: d.map((r) => r.spotify ?? 0),
    acast: d.map((r) => r.acast ?? 0),
    youtube: d.map((r) => (r.youtube ?? 0) + (r.youtube_pm ?? 0)),
  };
}
