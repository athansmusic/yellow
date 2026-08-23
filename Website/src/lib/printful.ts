/**
 * Minimal Printful API v1 client (https://developers.printful.com).
 * Only the endpoints the store needs: sync products (catalog) and orders (fulfilment).
 */
const BASE = "https://api.printful.com";

export function printfulEnabled() {
  return !!process.env.PRINTFUL_API_KEY;
}

async function pf<T>(path: string, init: RequestInit & { revalidate?: number | false } = {}): Promise<T> {
  const key = process.env.PRINTFUL_API_KEY;
  if (!key) throw new Error("PRINTFUL_API_KEY is not set");
  const { revalidate, ...rest } = init;
  const opts: RequestInit = {
    ...rest,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(rest.headers ?? {}),
    },
    ...(revalidate === false || rest.method === "POST" || rest.method === "PUT" || rest.method === "DELETE" ? { cache: "no-store" } : { next: { revalidate: revalidate ?? 900 } }),
  };
  // Printful allows ~120 requests/min. Retry on 429 for reads, honouring the wait it asks for.
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}${path}`, opts);
    const json = (await res.json()) as { code: number; result: T; error?: { message: string } };
    if (res.ok && json.code < 400) return json.result;
    const msg = json.error?.message ?? res.statusText;
    const wait = msg.match(/after (\d+) seconds?/i);
    if ((res.status === 429 || wait) && attempt < 3 && (rest.method ?? "GET") === "GET") {
      await new Promise((r) => setTimeout(r, ((wait ? Number(wait[1]) : 20) + 1) * 1000));
      continue;
    }
    throw new Error(`Printful ${path}: ${msg}`);
  }
}

/** Run async jobs with limited concurrency and a small gap, to stay under Printful's rate limit. */
export async function throttled<T, R>(items: T[], fn: (t: T) => Promise<R>, concurrency = 4, gapMs = 120): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
        await new Promise((r) => setTimeout(r, gapMs));
      }
    }),
  );
  return out;
}

// ── Types (subset) ────────────────────────────────────────────────────
export type PFSyncProductSummary = {
  id: number;
  external_id: string;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url: string;
  is_ignored: boolean;
};

export type PFSyncVariant = {
  id: number; // sync_variant_id → what orders use
  external_id: string;
  sync_product_id: number;
  name: string; // "Forest Fire Hoodie / Light / White / S"
  synced: boolean;
  variant_id: number; // catalog variant
  retail_price: string; // "50.00"
  currency: string;
  is_ignored: boolean;
  sku?: string;
  availability_status?: "active" | "discontinued" | "out_of_stock" | "temporary_out_of_stock";
  product: { variant_id: number; product_id: number; image: string; name: string };
  files: { type: string; preview_url: string; thumbnail_url?: string }[];
  options?: { id: string; value: unknown }[];
  size?: string;
  color?: string;
};

export type PFSyncProductDetail = {
  sync_product: PFSyncProductSummary;
  sync_variants: PFSyncVariant[];
};

export async function listSyncProducts(): Promise<PFSyncProductSummary[]> {
  const out: PFSyncProductSummary[] = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const page = await pf<PFSyncProductSummary[]>(`/store/products?status=synced&limit=${limit}&offset=${offset}`);
    out.push(...page);
    if (page.length < limit) break;
    offset += limit;
  }
  return out.filter((p) => !p.is_ignored);
}

export async function getSyncProduct(id: number): Promise<PFSyncProductDetail> {
  return pf<PFSyncProductDetail>(`/store/products/${id}`);
}

// ── Orders ────────────────────────────────────────────────────────────
export type PFRecipient = {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
  email?: string;
  phone?: string;
};

export type PFOrderItem = { sync_variant_id: number; quantity: number; retail_price?: string };

export type PFOrder = {
  id: number;
  external_id: string | null;
  status: string;
  shipping: string;
  costs: { subtotal: string; shipping: string; tax: string; total: string };
  shipments?: { carrier: string; service: string; tracking_number: string; tracking_url: string }[];
};

/**
 * Create AND confirm an order (confirm=true sends it to production).
 * external_id = Stripe session id, which makes this idempotent: Printful rejects
 * a duplicate external_id, so a replayed webhook can't double-order.
 */
export async function createOrder(input: {
  externalId: string;
  recipient: PFRecipient;
  items: PFOrderItem[];
  packingSlipMessage?: string;
  confirm?: boolean;
}): Promise<PFOrder> {
  const body = {
    external_id: input.externalId,
    recipient: input.recipient,
    items: input.items,
    packing_slip: input.packingSlipMessage
      ? { email: "crew@theredactedunit.com", message: input.packingSlipMessage, store_name: "[REDACTED] Store" }
      : undefined,
  };
  return pf<PFOrder>(`/orders?confirm=${input.confirm === false ? "false" : "true"}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getOrderByExternalId(externalId: string): Promise<PFOrder | null> {
  try {
    return await pf<PFOrder>(`/orders/@${encodeURIComponent(externalId)}`, { revalidate: false });
  } catch {
    return null;
  }
}

// ── Catalog (blank product) info: description + size guide ───────────
export type PFCatalogProduct = { id: number; type: string; type_name: string; title: string; brand: string | null; model: string; description: string };
export async function getCatalogProduct(id: number): Promise<PFCatalogProduct> {
  const r = await pf<{ product: PFCatalogProduct }>(`/products/${id}`, { revalidate: 86400 });
  return r.product;
}

export type PFSizeTable = {
  type: string;
  unit: string;
  description?: string;
  image_url?: string;
  image_description?: string;
  measurements: { type_label: string; values: { size: string; value?: string; min_value?: string; max_value?: string }[] }[];
};
export async function getSizeGuide(id: number): Promise<{ available_sizes: string[]; size_tables: PFSizeTable[] } | null> {
  try {
    return await pf(`/products/${id}/sizes?unit=inches`, { revalidate: 86400 });
  } catch {
    return null;
  }
}
