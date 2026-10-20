import fs from "node:fs/promises";
import path from "node:path";
import React from "react";
import { Document, Font, Image, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { SITE } from "@/lib/site";
import { getAudience, getRatings, getStats } from "@/lib/partnerStats";
import { getDoc } from "@/lib/content";
import { seasonState } from "@/data/press";
import { awards } from "@/lib/awards";
import { short } from "@/lib/short";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * A one-page media kit for forwarding to someone who will not open a website. Built from the same
 * feed, season setting and award list as /partner, so it is never a stale snapshot, and cached for
 * the same hour the page is.
 */

const INK = "#090909";
const PANEL = "#171414";
const PAPER = "#F2F0EA";
const MUTED = "#8d8a84";
const YELLOW = "#FFF200";

const WINS = ["27", "28", "01", "02", "22", "23", "25", "26"];

const st = StyleSheet.create({
  page: { backgroundColor: INK, color: PAPER, padding: 34, fontFamily: "Helvetica", fontSize: 9, lineHeight: 1.4 },
  head: { flexDirection: "row", gap: 16, alignItems: "center" },
  art: { width: 92, height: 92 },
  eyebrow: { fontFamily: "Montserrat", fontWeight: 700, fontSize: 8, letterSpacing: 1.6, color: YELLOW, textTransform: "uppercase" },
  h1: { fontFamily: "Montserrat", fontWeight: 800, fontSize: 25, lineHeight: 1.05, marginTop: 3, textTransform: "uppercase" },
  sub: { marginTop: 5, color: PAPER, fontSize: 9.5 },
  state: { marginTop: 2, color: MUTED, fontSize: 8.5 },
  // space-evenly puts equal space before, between and after the stats, so the margins match whatever each label's width is.
  band: { marginTop: 16, backgroundColor: YELLOW, flexDirection: "row", justifyContent: "space-evenly", alignItems: "flex-start", paddingVertical: 12 },
  stat: { alignItems: "center" },
  statN: { fontFamily: "Montserrat", fontWeight: 800, fontSize: 19, lineHeight: 1.2, color: INK },
  statL: { marginTop: 4, textAlign: "center", lineHeight: 1.3, fontFamily: "Montserrat", fontWeight: 700, fontSize: 6.3, letterSpacing: 1, color: INK, textTransform: "uppercase" },
  asOf: { marginTop: 4, fontSize: 7, color: MUTED, textAlign: "right" },
  cols: { flexDirection: "row", gap: 18, marginTop: 12 },
  col: { flex: 1 },
  h2: { fontFamily: "Montserrat", fontWeight: 800, fontSize: 10.5, color: YELLOW, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: "#2c2828" },
  bold: { fontFamily: "Montserrat", fontWeight: 700 },
  barBg: { height: 3, backgroundColor: "#2c2828", marginTop: 2, marginBottom: 5 },
  bar: { height: 3, backgroundColor: YELLOW },
  panel: { backgroundColor: PANEL, padding: 9, marginBottom: 6 },
  panelT: { fontFamily: "Montserrat", fontWeight: 800, fontSize: 9, textTransform: "uppercase" },
  panelD: { marginTop: 2, color: "#c9c6bf", fontSize: 8.3 },
  quote: { fontSize: 8.6, color: "#dcd9d2" },
  who: { marginTop: 2, marginBottom: 7, fontFamily: "Montserrat", fontWeight: 700, fontSize: 7, letterSpacing: 0.8, color: YELLOW, textTransform: "uppercase" },
  foot: { position: "absolute", left: 34, right: 34, bottom: 26, borderTopWidth: 0.8, borderTopColor: YELLOW, paddingTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  mail: { fontFamily: "Montserrat", fontWeight: 800, fontSize: 12, color: YELLOW },
});

// Result lines like "Winner, Best Original Podcast" read better wrapped at a space than split mid-word.
Font.registerHyphenationCallback((word) => [word]);

async function loadFonts() {
  const dir = path.join(process.cwd(), "src/fonts");
  const [bold, extra] = await Promise.all([fs.readFile(path.join(dir, "Montserrat-Bold.ttf")), fs.readFile(path.join(dir, "Montserrat-ExtraBold.ttf"))]);
  Font.register({
    family: "Montserrat",
    fonts: [
      { src: `data:font/ttf;base64,${bold.toString("base64")}`, fontWeight: 700 },
      { src: `data:font/ttf;base64,${extra.toString("base64")}`, fontWeight: 800 },
    ],
  });
}

export async function GET() {
  const [stats, audience, ratings, settings] = await Promise.all([getStats(), getAudience(), getRatings(), getDoc("settings").catch(() => null)]);
  const [art] = await Promise.all([fs.readFile(path.join(process.cwd(), "public/press/REDACTED-show-art.jpg")), loadFonts()]);

  const when = stats.lastUpdated ?? "";
  const rating = [ratings?.spotify && `${ratings.spotify.average.toFixed(1)} Spotify`, ratings?.apple && `${ratings.apple.average.toFixed(1)} Apple`].filter(Boolean).join(" · ");
  const band: [string, string][] = [
    ["Total plays", typeof stats.totalPlays === "number" ? short(stats.totalPlays) : "n/a"],
    ["Hours listened", typeof stats.hoursConsumed === "number" ? Math.round(stats.hoursConsumed).toLocaleString("en-US") : "n/a"],
    ["Followers", typeof stats.followers === "number" ? stats.followers.toLocaleString("en-US") : "n/a"],
    ["Discord members", typeof stats.discordMembers === "number" ? stats.discordMembers.toLocaleString("en-US") : "n/a"],
  ];
  if (rating) band.push(["Rating\n(Spotify / Apple)", rating.replace(/ Spotify| Apple/g, "").replace(" · ", " / ")]);

  const wins = WINS.map((f) => awards.find((a) => a.file === f)).filter((a): a is NonNullable<typeof a> => !!a);
  const demo = (label: string) => audience?.demos.find(([k]) => k === label);

  const doc = (
    <Document title="REDACTED media kit" author="REDACTED" subject="Sponsorship and partnership one-pager">
      <Page size="LETTER" style={st.page}>
        <View style={st.head}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={{ data: art, format: "jpg" }} style={st.art} />
          <View style={{ flex: 1 }}>
            <Text style={st.eyebrow}>Media kit · Sponsorship</Text>
            <Text style={st.h1}>Advertise on REDACTED</Text>
            <Text style={st.sub}>A procedural horror comedy audio drama from Hush Studios, on the Rusty Quill Network. Created by Athan (The Grotto) and Jamie Petronis (The Cellar Letters).</Text>
            <Text style={st.state}>{seasonState(settings)}</Text>
          </View>
        </View>

        <View style={st.band}>
          {band.map(([k, v]) => (
            <View key={k} style={st.stat}>
              <Text style={st.statN}>{v}</Text>
              <Text style={st.statL}>{k}</Text>
            </View>
          ))}
        </View>
        {when ? <Text style={st.asOf}>Source: Acast, Spotify, Apple Podcasts and YouTube. As of {when}. Plays count downloads and streams across those platforms.</Text> : null}

        {audience && (
          <View style={st.cols}>
            <View style={st.col}>
              <Text style={st.h2}>Where they listen</Text>
              {audience.platforms.map(([name, pct]) => (
                <View key={name}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text>{name}</Text>
                    <Text style={st.bold}>{pct}%</Text>
                  </View>
                  <View style={st.barBg}>
                    <View style={[st.bar, { width: `${Math.min(pct, 100)}%` }]} />
                  </View>
                </View>
              ))}
            </View>
            <View style={st.col}>
              <Text style={st.h2}>Top regions</Text>
              {audience.regions.map(([c, p]) => (
                <View key={c} style={st.row}>
                  <Text>{c}</Text>
                  <Text style={st.bold}>{p}</Text>
                </View>
              ))}
            </View>
            <View style={st.col}>
              <Text style={st.h2}>Who they are</Text>
              {[demo("Core age range"), demo("Peak bracket"), demo("Male"), demo("Female")].filter(Boolean).map((d) => (
                <View key={d![0]} style={st.row}>
                  <Text>{d![0] === "Core age range" ? `Ages ${d![1]}` : d![0] === "Peak bracket" ? `Peak ${d![1]}` : d![0]}</Text>
                  <Text style={st.bold}>{d![0] === "Core age range" || d![0] === "Peak bracket" ? d![2].replace(" of listeners", "").replace(" of audience", "") : d![1]}</Text>
                </View>
              ))}
              <Text style={{ marginTop: 3, fontSize: 6.8, color: MUTED }}>Gender from Spotify listener data; some listeners do not specify.</Text>
            </View>
          </View>
        )}

        <View style={st.cols}>
          <View style={st.col}>
            <Text style={st.h2}>Ways to partner</Text>
            <View style={st.panel}>
              <Text style={st.panelT}>Pre-roll · 30 seconds</Text>
              <Text style={st.panelD}>Host-read spot at the top of every public episode, in your brand&apos;s voice.</Text>
            </View>
            <View style={st.panel}>
              <Text style={st.panelT}>Post-roll · 60 seconds</Text>
              <Text style={st.panelD}>Host-read spot at the close of each episode, with more room to tell your story.</Text>
            </View>
            <View style={st.panel}>
              <Text style={st.panelT}>Discord announcement</Text>
              <Text style={st.panelD}>A dedicated post to the REDACTED community{typeof stats.discordMembers === "number" ? `, ${stats.discordMembers.toLocaleString("en-US")} members` : ""}.</Text>
            </View>
            <View style={[st.panel, { borderWidth: 0.8, borderColor: YELLOW }]}>
              <Text style={[st.panelT, { color: YELLOW }]}>In-universe integration</Text>
              <Text style={st.panelD}>Depending on brand fit, sponsor messaging written into the REDACTED world.</Text>
            </View>
          </View>

          <View style={st.col}>
            <Text style={st.h2}>Recognition</Text>
            {wins.map((a) => (
              <View key={a.file} style={st.row}>
                <Text style={{ flex: 1, paddingRight: 6 }}>{a.festival.replace(/, Vienna Film Art Gallery|, Santa Fe, New Mexico/g, "")}</Text>
                <Text style={[st.bold, { color: YELLOW, fontSize: 7.5, textAlign: "right", maxWidth: 110 }]}>{a.result}</Text>
              </View>
            ))}
            <Text style={{ marginTop: 3, fontSize: 7, color: MUTED }}>Plus {Math.max(awards.length - wins.length, 0)} more nominations and selections. Full list at theredactedunit.com/partner.</Text>
            <Text style={[st.h2, { marginTop: 12 }]}>What they&apos;re saying</Text>
            <Text style={st.quote}>“REDACTED is the inheritor to all your favourite spooky procedurals. Fun and sinister in equal measure.”</Text>
            <Text style={st.who}>Jonathan Sims · The Magnus Archives</Text>
            <Text style={st.quote}>“If you&apos;ve wanted to take your monster of the week with you on the go, look no further!”</Text>
            <Text style={st.who}>John Squires · Bloody Disgusting</Text>
          </View>
        </View>

        <View style={st.foot} fixed>
          <View>
            <Text style={st.mail}>{SITE.email}</Text>
            <Text style={{ marginTop: 2, fontSize: 7.5, color: MUTED }}>theredactedunit.com/partner · Rates and scheduling on request</Text>
          </View>
          <Text style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 11, letterSpacing: 1.5 }}>REDACTED</Text>
        </View>
      </Page>
    </Document>
  );

  const buf = await renderToBuffer(doc);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="REDACTED-media-kit.pdf"',
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
