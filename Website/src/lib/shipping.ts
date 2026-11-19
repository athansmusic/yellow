/**
 * Flat-rate shipping by region — matches the chart on the Store FAQ page.
 * Amounts are USD. Update here and the FAQ page updates with it.
 */
export type Region = { id: string; label: string; rateCents: number; countries: string[] };

const EU = [
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
];
const EFTA = ["IS", "LI", "NO", "CH"];

/** US orders ship free at or above this subtotal; below it they pay US_UNDER_RATE_CENTS. */
export const FREE_US_THRESHOLD_CENTS = 4000;
export const US_UNDER_RATE_CENTS = 500;

export const REGIONS: Region[] = [
  { id: "us", label: "USA", rateCents: 0, countries: ["US"] },
  { id: "eu", label: "Europe", rateCents: 400, countries: EU },
  { id: "uk", label: "UK", rateCents: 400, countries: ["GB"] },
  { id: "efta", label: "EFTA States", rateCents: 500, countries: EFTA },
  { id: "ca", label: "Canada", rateCents: 300, countries: ["CA"] },
  { id: "anz", label: "Australia / New Zealand", rateCents: 700, countries: ["AU", "NZ"] },
  { id: "jp", label: "Japan", rateCents: 600, countries: ["JP"] },
  { id: "br", label: "Brazil", rateCents: 800, countries: ["BR"] },
];

export const WORLDWIDE: Region = { id: "world", label: "Worldwide", rateCents: 800, countries: [] };

/** Countries we can ship to (Stripe `allowed_countries`). Printful ships to most of the world. */
export const ALLOWED_COUNTRIES = [
  "US","CA","GB","AU","NZ","JP","BR","MX",
  ...EU, ...EFTA,
  "AR","CL","CO","PE","ZA","KR","SG","HK","TW","MY","PH","TH","ID","IN","AE","SA","IL","TR","UA","RS","BA","AL","MK","ME","MD","GE","AM","KZ","PR",
] as const;

export type CountryCode = (typeof ALLOWED_COUNTRIES)[number];

export function regionFor(country: string): Region {
  const c = country.toUpperCase();
  return REGIONS.find((r) => r.countries.includes(c)) ?? WORLDWIDE;
}

export function shippingFor(country: string, subtotalCents = Infinity) {
  const r = regionFor(country);
  const rateCents = r.id === "us" && subtotalCents < FREE_US_THRESHOLD_CENTS ? US_UNDER_RATE_CENTS : r.rateCents;
  const label = rateCents === 0 ? "Free shipping" : r.id === "us" ? "US shipping" : `Flat rate · ${r.label}`;
  return { region: r, rateCents, label };
}

/** "Free on US orders $40+ ($5 under)" */
export const US_SHIPPING_NOTE = `Free US shipping on orders $${FREE_US_THRESHOLD_CENTS / 100}+ ($${US_UNDER_RATE_CENTS / 100} under that)`;

/** Production is 3 to 7 business days everywhere; transit varies by region. */
export const PRODUCTION_DAYS: [number, number] = [3, 7];
const TRANSIT_DAYS: Record<string, [number, number]> = { us: [3, 7], ca: [4, 7], eu: [4, 7], uk: [4, 7], efta: [4, 7], anz: [7, 13], jp: [7, 13], br: [7, 13], world: [7, 18] };

/** Door-to-door estimate in business days (production + transit) for a region. */
export function arrivalDays(regionId: string): [number, number] {
  const t = TRANSIT_DAYS[regionId] ?? TRANSIT_DAYS.world;
  return [PRODUCTION_DAYS[0] + t[0], PRODUCTION_DAYS[1] + t[1]];
}

/** Door-to-door estimates for the FAQ, derived from arrivalDays so they never drift from checkout. */
export const DELIVERY_ESTIMATES: { region: string; days: string }[] = [...REGIONS, WORLDWIDE].map((r) => {
  const [a, b] = arrivalDays(r.id);
  return { region: r.label, days: `${a} to ${b} business days` };
});

export const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", CA: "Canada", GB: "United Kingdom", AU: "Australia", NZ: "New Zealand", JP: "Japan", BR: "Brazil", MX: "Mexico",
  AT: "Austria", BE: "Belgium", BG: "Bulgaria", HR: "Croatia", CY: "Cyprus", CZ: "Czechia", DK: "Denmark", EE: "Estonia", FI: "Finland",
  FR: "France", DE: "Germany", GR: "Greece", HU: "Hungary", IE: "Ireland", IT: "Italy", LV: "Latvia", LT: "Lithuania", LU: "Luxembourg",
  MT: "Malta", NL: "Netherlands", PL: "Poland", PT: "Portugal", RO: "Romania", SK: "Slovakia", SI: "Slovenia", ES: "Spain", SE: "Sweden",
  IS: "Iceland", LI: "Liechtenstein", NO: "Norway", CH: "Switzerland",
  AR: "Argentina", CL: "Chile", CO: "Colombia", PE: "Peru", ZA: "South Africa", KR: "South Korea", SG: "Singapore", HK: "Hong Kong",
  TW: "Taiwan", MY: "Malaysia", PH: "Philippines", TH: "Thailand", ID: "Indonesia", IN: "India", AE: "United Arab Emirates",
  SA: "Saudi Arabia", IL: "Israel", TR: "Türkiye", UA: "Ukraine", RS: "Serbia", BA: "Bosnia and Herzegovina", AL: "Albania",
  MK: "North Macedonia", ME: "Montenegro", MD: "Moldova", GE: "Georgia", AM: "Armenia", KZ: "Kazakhstan", PR: "Puerto Rico",
};
