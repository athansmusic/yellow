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

export async function getStats(): Promise<Stats> {
  const s: Stats = {};
  // Sheet and Discord worker are independent; fetch both at once
  const [sheet, discord] = await Promise.allSettled([
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
  // Live Discord member count; the sheet value is the fallback
  if (discord.status === "fulfilled" && discord.value?.members) s.discordMembers = discord.value.members;
  return s;
}

export type PlaysSeries = { dates: string[]; apple: number[]; spotify: number[]; pocket: number[]; others: number[] };

/** Daily plays by platform from the second sheet tab. Columns 0-6 are labels/totals; day values start at column 7. */
export async function getDailyPlays(): Promise<PlaysSeries | null> {
  try {
    const res = await fetch(EXTERNAL.partnerPlaysCsv, { next: { revalidate: 3600 } });
    const lines = (await res.text()).split(/\r?\n/).map(parseRow);
    const dateRow = lines[1] ?? [];
    const find = (name: string) => lines.find((r) => r[3]?.toLowerCase() === name.toLowerCase());
    const total = find("Total");
    const apple = find("Apple Podcasts");
    const spotify = find("Spotify");
    const pocket = find("Pocket Casts");
    if (!total || !apple || !spotify || !pocket) return null;

    // Last day with real data (the sheet is pre-filled with zeros for upcoming dates)
    let end = 7;
    for (let i = 7; i < total.length; i++) if (num(total[i]) > 0 && dateRow[i]) end = i + 1;

    // Dates are mixed "11/9" and "11/9/2025"; normalize to ISO, inferring the year when missing
    let year = 0;
    let lastMonth = 0;
    const dates: string[] = [];
    const keep: number[] = []; // column indexes with a parseable date
    for (let i = 7; i < end; i++) {
      const [m, d, y] = (dateRow[i] ?? "").split("/").map((x) => parseInt(x, 10));
      if (!m || !d) continue;
      if (y) year = y;
      else if (year && m < lastMonth) year += 1;
      lastMonth = m;
      dates.push(`${year || 2025}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
      keep.push(i);
    }
    const col = (r: string[]) => keep.map((i) => num(r[i]));
    const a = col(apple), s = col(spotify), p = col(pocket), t = col(total);
    const others = t.map((v, i) => Math.max(0, v - a[i] - s[i] - p[i]));
    return { dates, apple: a, spotify: s, pocket: p, others };
  } catch {
    return null;
  }
}
