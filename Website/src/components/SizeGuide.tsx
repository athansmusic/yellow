import Image from "next/image";
import type { PFSizeTable } from "@/lib/printful";

/** Printful's legend is HTML like <h6>A Length</h6><p>how to measure</p>. Pull out "A Length" pairs. */
function legend(html?: string) {
  if (!html) return [];
  return Array.from(html.matchAll(/<h6[^>]*>\s*(?:<strong>)?\s*([A-Z])\s+([^<]+?)\s*(?:<\/strong>)?\s*<\/h6>/gi)).map((m) => ({ key: m[1], label: m[2].trim() }));
}

function cell(v: { value?: string; min_value?: string; max_value?: string }) {
  if (v.value) return v.value;
  if (v.min_value && v.max_value) return `${v.min_value}–${v.max_value}`;
  return v.min_value ?? v.max_value ?? "";
}

/** Size chart from Printful's catalog. Only the "product measurements" table; inches. */
export function SizeGuide({ tables, sizes }: { tables: PFSizeTable[]; sizes: string[] }) {
  const table = tables.find((t) => t.type === "product_measure") ?? tables.find((t) => t.type === "measure_yourself") ?? tables[0];
  if (!table?.measurements?.length) return null;
  const cols = sizes.length ? sizes.filter((s) => table.measurements[0].values.some((v) => v.size === s)) : table.measurements[0].values.map((v) => v.size);
  const keys = legend(table.image_description);
  const labelFor = (t: string) => (/^[A-Z]$/.test(t) ? `${t} ${keys.find((k) => k.key === t)?.label ?? ""}`.trim() : t);
  const lettered = table.measurements.some((m) => /^[A-Z]$/.test(m.type_label));
  return (
    <details id="size-guide" className="group border border-line bg-ink-2/70 scroll-mt-24">
      <summary className="cursor-pointer list-none p-4 flex items-center justify-between display text-2xl">
        Size guide
        <span aria-hidden className="text-yellow text-3xl leading-none transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="px-4 pb-4">
        {lettered && table.image_url && (
          <div className="mb-4 flex gap-4 items-start">
            <Image src={table.image_url} alt="Measurement diagram" width={180} height={180} unoptimized className="w-36 h-auto bg-white p-1" />
            {keys.length > 0 && (
              <ul className="text-sm grid gap-1">
                {keys.map((k) => (
                  <li key={k.key}>
                    <span className="display text-yellow mr-2">{k.key}</span>
                    {k.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular border-collapse">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-2 pr-4 font-semibold">Size</th>
                {table.measurements.map((m) => (
                  <th key={m.type_label} className="py-2 pr-4 font-semibold whitespace-nowrap">
                    {labelFor(m.type_label)} ({table.unit === "inches" ? "in" : table.unit})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cols.map((size) => (
                <tr key={size} className="border-t border-line">
                  <td className="py-2 pr-4 font-semibold">{size}</td>
                  {table.measurements.map((m) => (
                    <td key={m.type_label} className="py-2 pr-4 whitespace-nowrap">
                      {cell(m.values.find((v) => v.size === size) ?? {})}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">Measurements are provided by the supplier and may vary by up to 2 in (5 cm).</p>
      </div>
    </details>
  );
}
