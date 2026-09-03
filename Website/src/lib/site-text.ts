/**
 * Registry of static copy the owner can override from /admin/text. The default lives in the
 * page JSX (often with formatting); an override is plain text and replaces it wholesale, so
 * clearing the override in admin brings the styled original back.
 */
export const SITE_TEXT = {
  "home.patreon": { page: "Home", label: "Patreon block", text: "From $2 a month. 400+ people backed this show into existence. This is how it keeps existing." },
  "home.newsletter": { page: "Home", label: "Newsletter blurb", text: "An email whenever an episode drops, plus the occasional update. Sign up and get 10% off store orders of $25 or more. Unsubscribe any time." },
  "home.what1": { page: "Home", label: "What is REDACTED, paragraph 1", text: "A horror comedy audio drama from Athan (The Grotto) and Jamie Petronis (The Cellar Letters), on the Rusty Quill network. Failing actor Jacob Kane takes his dead twin's identity expecting a desk job, and lands inside The REDACTED Unit, a secret agency that quietly handles dangerous paranormal cases." },
  "home.what2": { page: "Home", label: "What is REDACTED, paragraph 2", text: "It's a monster-of-the-week series: every episode is a self-contained case, with the mystery of his brother's death running underneath. The threats have a name. Aberrations." },
  "about.intro1": { page: "About", label: "Intro, paragraph 1", text: "REDACTED is a horror comedy audio drama, a fiction podcast, from Athan (The Grotto) and Jamie Petronis (The Cellar Letters), produced by Hush Studios and released on the Rusty Quill network." },
  "about.intro2": { page: "About", label: "Intro, paragraph 2", text: "The show follows Jacob Kane, a struggling actor who, desperate for a fresh start, assumes the identity of his deceased twin, Jordan. Expecting a simple accounting job, he instead finds himself accidentally inside an underfunded secret government agency called The REDACTED Unit, tasked with discreetly handling bizarre and often dangerous paranormal cases. The things the Unit handles are called Aberrations." },
  "about.intro3": { page: "About", label: "Intro, paragraph 3", text: "As Jacob settles into his role, he begins to unravel the unsettling truths around his brother's death. What begins as an act of reinvention slowly becomes a descent into a web of paranormal forces, secret agendas, and moral compromise." },
  "about.intro4": { page: "About", label: "Intro, paragraph 4", text: "It's a multi-season, monster-of-the-week series: each episode is a self-contained case, and the story of Jordan's death runs underneath all of them. If you like The X-Files, Buffy, Brooklyn Nine-Nine, Psych, or The Magnus Archives, this is for you." },
  "about.start": { page: "About", label: "How to start", text: "Start at the beginning. The pilot is three parts, released together." },
} as const;

export type SiteTextId = keyof typeof SITE_TEXT;
