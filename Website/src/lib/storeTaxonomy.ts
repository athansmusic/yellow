/**
 * Store navigation: category → subcategory.
 * Subcategory is derived from Printful's catalog product type plus the product name.
 */
export type Category = "apparel" | "accessories" | "home";

export type Sub = { id: string; label: string; match: RegExp };

export const TAXONOMY: { id: Category; label: string; subs: Sub[] }[] = [
  {
    id: "apparel",
    label: "Apparel",
    subs: [
      { id: "t-shirts", label: "T-Shirts", match: /t-shirt|\btee\b|shirt|crew neck/i },
      { id: "hoodies", label: "Hoodies", match: /hoodie|sweatshirt/i },
      { id: "outerwear", label: "Jackets", match: /bomber|windbreaker|jacket/i },
      { id: "tops", label: "Tanks & Crops", match: /tank|crop/i },
      { id: "bottoms", label: "Shorts & Joggers", match: /shorts|joggers|sweatpants|leggings/i },
      { id: "hats", label: "Hats & Beanies", match: /\bhat\b|cap|beanie/i },
      { id: "shoes", label: "Shoes", match: /slip-on|shoe|sneaker/i },
    ],
  },
  {
    id: "accessories",
    label: "Accessories",
    subs: [
      { id: "stickers", label: "Stickers", match: /sticker/i },
      { id: "patches", label: "Patches & Pins", match: /patch|pin\b/i },
      { id: "bags", label: "Bags", match: /\bbag\b|tote|backpack/i },
      { id: "phone", label: "Phone Cases", match: /phone case|iphone|samsung/i },
    ],
  },
  {
    id: "home",
    label: "Home & Office",
    subs: [
      { id: "prints", label: "Prints & Posters", match: /print|poster|canvas/i },
      { id: "flags", label: "Flags", match: /flag/i },
      { id: "drinkware", label: "Mugs & Tumblers", match: /mug|tumbler|bottle|glass/i },
      { id: "desk", label: "Desk Mats", match: /desk mat|mouse pad/i },
      { id: "puzzles", label: "Puzzles", match: /puzzle/i },
      { id: "stationery", label: "Journals & Notes", match: /journal|notebook|post-it|note/i },
      { id: "coasters", label: "Coasters", match: /coaster/i },
      { id: "pets", label: "Pets", match: /\bpet\b|dog|bowl|bandana/i },
    ],
  },
];

export function classify(name: string, typeName: string): { category: Category; sub?: string } {
  // The product name wins (e.g. "Pride Flag"); the blank type ("All-Over Print Flag") only breaks ties.
  for (const hay of [name, `${name} ${typeName}`]) {
    for (const cat of TAXONOMY) {
      for (const sub of cat.subs) if (sub.match.test(hay)) return { category: cat.id, sub: sub.id };
    }
  }
  return { category: "accessories" };
}

export const CATEGORIES = TAXONOMY.map((c) => ({ id: c.id, label: c.label }));

export function subLabel(cat: Category, sub?: string) {
  return TAXONOMY.find((c) => c.id === cat)?.subs.find((s) => s.id === sub)?.label;
}

/** Curated collections shown on the store front. Matched against product names. */
export const COLLECTIONS: { id: string; label: string; blurb: string; match: RegExp; image?: string }[] = [
  { id: "forest-fire", label: "Forest Fire", blurb: "Art by Darhak.", match: /forest fire/i },
  { id: "spatter", label: "Spatter Series", blurb: "All-over print.", match: /spatter/i },
  { id: "pride", label: "Pride Flags", blurb: "Every flag, one logo.", match: /^(?!logo).*flag/i },
  { id: "aberrant", label: "Aberrant Prints", blurb: "The monsters, framed.", match: /^(brood|chorister|shapeshifter|plaster pigs) (print|canvas)$/i },
  { id: "car-crash", label: "Car Crash", blurb: "Jacob's big night.", match: /car crash/i },
  { id: "logo", label: "Logo", blurb: "Hats, patches, the essentials.", match: /logo/i },
];
