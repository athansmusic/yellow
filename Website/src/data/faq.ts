import { SITE } from "@/lib/site";

/** FAQ entries. Shown on /faq and indexed by site search. */
export type FaqGroup = "show" | "listening" | "support" | "store";
export const FAQ_GROUPS: { id: FaqGroup; label: string }[] = [
  { id: "show", label: "The show" },
  { id: "listening", label: "Listening" },
  { id: "support", label: "Support" },
  { id: "store", label: "Store and rights" },
];

export const QA: { q: string; a: string; link?: { href: string; label: string }; group: FaqGroup; top?: boolean }[] = [
  { q: "What is [REDACTED]?", a: "A horror comedy audio drama (a scripted fiction podcast) from Hush Studios on the Rusty Quill network. Failed actor Jacob Kane takes his dead twin's identity and job, and the job turns out to be a secret agency that handles paranormal cases called Aberrations.", link: { href: "/about", label: "About the show" } , group: "show", top: true },
  { q: "Is REDACTED scary, or is it funny?", a: "Why not both! REDACTED varies between episodes. Sometimes they'll be heavy, sometimes they'll be funny. The balance we try to hit on every episode is a realistic reaction from the team, which tends to lean into the comedy." , group: "show", top: true },
  { q: "Do I have to listen in order?", a: "Since it's a procedural, you could technically land on an episode and enjoy it. However, we recommend starting from the first episode so you get the full experience. If you want to jump around, we'd recommend at least listening to the pilot so you're familiar with the characters.", link: { href: "/episodes", label: "Episodes" } , group: "listening", top: true },
  { q: "Is it like The Magnus Archives?", a: "It's similar for sure! REDACTED features a different case each episode. The biggest difference is the full cast and the lack of narration, but if you enjoy Magnus, we think you'll enjoy REDACTED!", link: { href: "/like/the-magnus-archives", label: "If you like The Magnus Archives" } , group: "show" },
  { q: "Where and when is it set?", a: "We're vaguely northeastern US, and the time is vaguely now. We try to keep it open ended so the episodes can focus on being fun." , group: "show" },
  { q: "Is it appropriate for teens?", a: "REDACTED does not feature any sexually explicit content. However, with the gore and the sound design that accompanies it, we recommend REDACTED for adults. Every episode page has a content warnings section kept separate from the synopsis so it doesn't spoil anything." , group: "show" },
  { q: "How many episodes are there? Is there a Season 2?", a: "Season 1 contains 29 episodes, and Season 2 is confirmed with a date TBD." , group: "show" },
  { q: "Is the show finished or ongoing?", a: "We're ongoing! Season 1 has wrapped, but we're just getting started. Expect REDACTED for the foreseeable future." , group: "show" },
  { q: "When do new episodes come out?", a: "Fridays at 9 pm Eastern / 8 pm Central. Patreon supporters get them early." , group: "listening", top: true },
  { q: "How long are episodes?", a: "About 30 minutes. Postmortem debriefs are 5 to 10 minutes; minisodes vary." , group: "listening" },
  { q: "Is there a video version, or is it audio only?", a: "There are no visuals. This is the benefit of an audio-only format: you can imagine each scene however you wish." , group: "listening" },
  { q: "Is REDACTED free?", a: "Listening to the show is FREE! There are ads pre- and post-roll, which is what allows us to pay the cast, site fees, and so on. When you pay, you only receive early access to ad-free episodes. We try not to lock any content behind a permanent paywall.", link: { href: "https://www.patreon.com/theredactedunit", label: "Patreon" } , group: "listening" },
  { q: "Where can I listen?", a: "Right here on the site (the player keeps playing while you browse and remembers your spot), or on any podcast app. Apple, Spotify, and Akouva are the big three; the Where to listen page has every app plus per-episode links.", link: { href: "/where", label: "Where to listen" } , group: "listening" },
  { q: "Who voices Jacob Kane? Who makes the show?", a: "Jacob is voiced by Jamie Petronis! Created by Athan (Johnathan Magno) and Jamie Petronis. Athan plays Eli Reyes. Derek Moreland is Head of Production, Natalie Light is Creative Director, and Landon Whisnant is Lead Sound Designer. Produced by Hush Studios.", link: { href: "/cast", label: "Full cast" } , group: "show" },
  { q: "Is the Kickstarter still open? How do I support the show?", a: "The Kickstarter has closed. However, if you'd like to support the show, we'd appreciate Patreon! You can also purchase items from our store, which helps us out.", link: { href: "/store", label: "Store" } , group: "support" },
  { q: "Can I submit a story, audition, or send fan art?", a: "We do not accept story submissions. We often host casting calls, and info on those is usually in our Discord. We LOVE fan art: if you're on Tumblr, use #the redacted unit and we'll most definitely see it!", link: { href: "/discord", label: "Discord" } , group: "support" },
  { q: "Are there transcripts?", a: "Yes, transcripts appear on each episode page as they're completed. If you need one we haven't finished, email crew@theredactedunit.com and we'll prioritise it." , group: "listening" },
  { q: "What is Postmortem?", a: "An in-universe spin-off where the team debriefs each episode's aberration to The Curtain. Starring Lyssa Jay, Derek Moreland, Natalie Light, and Athan. It's in the main feed.", link: { href: "/episodes?show=postmortem", label: "Postmortem" } , group: "show" },
  { q: "Is there a wiki?", a: "Yes, a fan-run one at theredactedunit.miraheze.org, with character pages, aberration lore, and episode breakdowns. It's written by listeners, not by us, so it's fan notes rather than canon. For the official records, see the Aberrations page.", link: { href: "https://theredactedunit.miraheze.org/", label: "Fan wiki" }, group: "show" },
  { q: "What is The Seven Planes?", a: "A collection of Analog Horror tapes chronicling the history of a strange world filled with even stranger inhabitants. Created by Landon Whisnant.", link: { href: "/episodes?show=t7p", label: "The Seven Planes" } , group: "show" },
  { q: "How does the store work?", a: "Everything is printed to order and ships in 3 to 7 business days. Shipping is free in the US on orders of $40 or more ($5 under that) and a flat rate everywhere else. Tracking is emailed when it ships.", link: { href: "/store-faq", label: "Store FAQ & shipping" } , group: "store" },
  { q: "Can I use your logo or art for fan stuff?", a: "For fan art, streams, and non-commercial use, yes, the brand assets page has the logo, colors, and fonts. Please don't alter the logo or sell it on products.", link: { href: "/assets", label: "Brand assets" } , group: "store" },
  { q: "How do I contact you, or pitch a sponsorship?", a: `Email ${SITE.email}. Sponsorships are host-read and handled directly; details are on the Partner page.`, link: { href: "/partner", label: "Partner with us" } , group: "support" },
];
