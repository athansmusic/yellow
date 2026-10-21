/** Client-safe helpers shared by the catalog (server) and store components (client). */
export function money(c: number) {
  return (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
export function sortSizes(sizes: string[]) {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a.toUpperCase());
    const ib = SIZE_ORDER.indexOf(b.toUpperCase());
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b, undefined, { numeric: true });
  });
}
