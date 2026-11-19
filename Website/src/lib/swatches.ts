/** Printful colour names → a swatch colour for product cards. Unknown names fall back to a neutral. */
const SWATCH: Record<string, string> = {
  black: "#111111",
  "black heather": "#2a2a2a",
  "oxblood black": "#3a1f24",
  "dark grey heather": "#4a4a4a",
  "athletic heather": "#b9b9b9",
  white: "#f4f4f4",
  "white (glossy)": "#f4f4f4",
  navy: "#1d2a44",
  "navy blazer": "#1d2a44",
  "heather midnight navy": "#2b3550",
  "heather ice blue": "#a9c4d8",
  "light blue": "#9fc3e4",
  "sky blue": "#7fb3e0",
  maroon: "#5b1f2a",
  "team red": "#a21d2d",
  red: "#b3202f",
  yellow: "#fff200",
  "forest green": "#22452f",
  "heather emerald": "#2f7a5c",
  lavender: "#b8a5d6",
  adobe: "#c27a55",
  khaki: "#b5a382",
  matte: "#333333",
};

export function swatch(name: string): string {
  const k = name.trim().toLowerCase();
  if (SWATCH[k]) return SWATCH[k];
  for (const key of Object.keys(SWATCH)) if (k.includes(key)) return SWATCH[key];
  return "#6b6460";
}
