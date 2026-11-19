import raw from "@/data/awards.json";

/**
 * Festival laurels, in display order.
 *
 * `year` is optional because not every laurel prints one, and a caption, a structured-data string
 * or a press list is not the place to guess. Consumers join it only when it is there.
 *
 * `url` is the festival's own site, for the press page to link to. It is optional for the same reason:
 * a laurel with no confirmed site renders as plain text instead of a guess.
 */
export type Award = { file: string; festival: string; result: string; year?: number; url?: string };

export const awards: Award[] = raw;

/** A first-place or audience-vote win, as opposed to a nomination, finalist spot or selection. */
export const isWin = (a: Award) => /winner|listener's choice/i.test(a.result);
