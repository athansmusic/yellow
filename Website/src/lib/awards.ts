import raw from "@/data/awards.json";

/**
 * Festival laurels, in display order.
 *
 * `year` is optional because not every laurel prints one, and a caption, a structured-data string
 * or a press list is not the place to guess. Consumers join it only when it is there.
 */
export type Award = { file: string; festival: string; result: string; year?: number };

export const awards: Award[] = raw;
