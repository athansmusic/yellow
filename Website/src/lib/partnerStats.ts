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
