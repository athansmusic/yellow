import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { title?: string };

const base = (p: P) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "currentColor",
  "aria-hidden": p.title ? undefined : true,
  role: p.title ? "img" : undefined,
  ...p,
});

export const Spotify = (p: P) => (
  <svg {...base(p)}>
    {p.title && <title>{p.title}</title>}
    <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1.03.25c-2.82-1.72-6.37-2.11-10.55-1.16a.75.75 0 1 1-.33-1.46c4.57-1.05 8.5-.6 11.66 1.34.35.21.46.68.25 1.03Zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.23-1.98-8.15-2.56-11.97-1.4a.94.94 0 1 1-.54-1.79c4.36-1.32 9.78-.68 13.49 1.6.44.27.58.85.31 1.28Zm.13-3.4C15.23 8.33 8.84 8.12 5.14 9.24a1.12 1.12 0 1 1-.65-2.15c4.25-1.29 11.31-1.04 15.77 1.61a1.12 1.12 0 0 1-1.16 1.93Z" />
  </svg>
);

export const Apple = (p: P) => (
  <svg {...base(p)}>
    {p.title && <title>{p.title}</title>}
    <path d="M16.37 12.77c-.02-2.3 1.88-3.4 1.96-3.45-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3-.79-1.55.02-2.97.9-3.77 2.28-1.6 2.78-.41 6.9 1.15 9.16.77 1.1 1.68 2.35 2.87 2.3 1.15-.05 1.59-.74 2.98-.74 1.39 0 1.78.74 3 .72 1.24-.02 2.02-1.12 2.78-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.7ZM14.1 6.03c.63-.77 1.06-1.84.94-2.9-.91.04-2.02.61-2.67 1.37-.58.68-1.1 1.77-.96 2.81 1.02.08 2.06-.52 2.69-1.28Z" />
  </svg>
);

export const Rss = (p: P) => (
  <svg {...base(p)}>
    {p.title && <title>{p.title}</title>}
    <path d="M4 4a16 16 0 0 1 16 16h-3A13 13 0 0 0 4 7V4Zm0 6a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7v-3Zm2 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
  </svg>
);

export const Patreon = (p: P) => (
  <svg {...base(p)}>
    {p.title && <title>{p.title}</title>}
    <path d="M15 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14ZM2 2h4v20H2V2Z" />
  </svg>
);

export const YouTube = (p: P) => (
  <svg {...base(p)}>
    {p.title && <title>{p.title}</title>}
    <path d="M23.5 6.5a3 3 0 0 0-2.1-2.1C19.5 4 12 4 12 4s-7.5 0-9.4.4A3 3 0 0 0 .5 6.5C0 8.4 0 12 0 12s0 3.6.5 5.5a3 3 0 0 0 2.1 2.1C4.5 20 12 20 12 20s7.5 0 9.4-.4a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.5.5-5.5s0-3.6-.5-5.5ZM9.6 15.5v-7l6.2 3.5-6.2 3.5Z" />
  </svg>
);

export const TikTok = (p: P) => (
  <svg {...base(p)}>
    {p.title && <title>{p.title}</title>}
    <path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.2-1.6Z" />
  </svg>
);

export const XSocial = (p: P) => (
  <svg {...base(p)}>
    {p.title && <title>{p.title}</title>}
    <path d="M18.2 2h3.4l-7.4 8.5L23 22h-6.8l-5.3-7-6.1 7H1.4l7.9-9.1L1 2h7l4.8 6.4L18.2 2Zm-1.2 18h1.9L7.1 3.9H5.1L17 20Z" />
  </svg>
);

export const Bluesky = (p: P) => (
  <svg {...base(p)}>
    {p.title && <title>{p.title}</title>}
    <path d="M5.2 3.6C7.9 5.6 10.8 9.7 12 11.9c1.2-2.2 4.1-6.3 6.8-8.3 2-1.5 5.2-2.6 5.2 1 0 .7-.4 6.1-.7 7-.9 3-4 3.8-6.8 3.3 4.9.8 6.1 3.6 3.4 6.3-5.1 5.2-7.3-1.3-7.8-3l-.1-.4-.1.4c-.5 1.7-2.7 8.2-7.8 3-2.7-2.7-1.5-5.5 3.4-6.3-2.8.5-5.9-.3-6.8-3.3-.3-.9-.7-6.3-.7-7 0-3.6 3.2-2.5 5.2-1Z" />
  </svg>
);

export const Discord = (p: P) => (
  <svg {...base(p)}>
    {p.title && <title>{p.title}</title>}
    <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.2.4a18 18 0 0 1 4.4 2.2 16 16 0 0 0-15.2 0A18 18 0 0 1 8.8 3.4L8.6 3a19.7 19.7 0 0 0-4.9 1.4C.6 9.1-.2 13.7.2 18.2a19.9 19.9 0 0 0 6 3l1.3-2.1a12.6 12.6 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4-2 1 1.3 2.1a19.8 19.8 0 0 0 6-3c.5-5.2-.9-9.8-3.7-13.8ZM8 15.5c-1.2 0-2.1-1.1-2.1-2.4S6.8 10.7 8 10.7s2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Zm8 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Z" />
  </svg>
);

export const Twitch = (p: P) => (
  <svg {...base(p)}>
    {p.title && <title>{p.title}</title>}
    <path d="M4.3 1 1 5.3v15.4h5.3V24h3.2l3.2-3.3h4.8L23 14.3V1H4.3Zm16.5 12.2-3.2 3.2h-5.3l-3.2 3.2v-3.2H5.3V3.1h15.5v10.1ZM17 6.5h-2.1v6.4H17V6.5Zm-5.8 0h-2.1v6.4h2.1V6.5Z" />
  </svg>
);

export const Instagram = (p: P) => (
  <svg {...base(p)}>
    {p.title && <title>{p.title}</title>}
    <path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.2.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 4 2.4 7.2 2.3c1.2-.1 1.6-.1 4.8-.1ZM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0Zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9Z" />
  </svg>
);

export const Globe = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={2}>
    {p.title && <title>{p.title}</title>}
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
  </svg>
);

export const Cart = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {p.title && <title>{p.title}</title>}
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
  </svg>
);

export const Menu = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);

export const Close = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
    <path d="M5 5l14 14M19 5 5 19" />
  </svg>
);

export const Play = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 4v16l14-8L6 4Z" />
  </svg>
);

export const Pause = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 4h4v16H6V4Zm8 0h4v16h-4V4Z" />
  </svg>
);

export const SkipPrev = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 4h2v16H6V4Zm14 0v16L9 12l11-8Z" />
  </svg>
);

export const SkipNext = (p: P) => (
  <svg {...base(p)}>
    <path d="M16 4h2v16h-2V4ZM4 4l11 8-11 8V4Z" />
  </svg>
);

export const Expand = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 14h2v4h4v2H4v-6Zm16-4h-2V6h-4V4h6v6Z" />
  </svg>
);

export const Search = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const Arrow = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/** Akouva's logo is an image; filtered to solid black so it matches the other monochrome icons. */
export const Akouva = (p: P) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/brand/akouva.png" alt={p.title ?? ""} width={p.width ?? 20} height={p.height ?? 20} style={{ width: p.width ?? 20, height: p.height ?? 20 }} aria-hidden={p.title ? undefined : true} className={`akouva ${p.className ?? ""}`} />
);

export const ICONS = {
  spotify: Spotify,
  apple: Apple,
  rss: Rss,
  patreon: Patreon,
  youtube: YouTube,
  tiktok: TikTok,
  x: XSocial,
  bluesky: Bluesky,
  discord: Discord,
  twitch: Twitch,
  instagram: Instagram,
  web: Globe,
  akouva: Akouva,
} as const;

export type IconName = keyof typeof ICONS;
