"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartLine = {
  variantId: number;
  slug: string;
  name: string;
  variantLabel?: string;
  priceCents: number;
  image?: string;
  qty: number;
};

type CartCtx = {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (variantId: number, qty: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
  ready: boolean;
  justAdded: CartLine | null;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "tru-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [justAdded, setJustAdded] = useState<CartLine | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, ready]);

  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(null), 3500);
    return () => clearTimeout(t);
  }, [justAdded]);

  const add = useCallback<CartCtx["add"]>((line, qty = 1) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.variantId === line.variantId);
      if (i >= 0) {
        const next = [...ls];
        next[i] = { ...next[i], qty: Math.min(20, next[i].qty + qty) };
        return next;
      }
      return [...ls, { ...line, qty }];
    });
    setJustAdded({ ...line, qty });
  }, []);

  const setQty = useCallback((variantId: number, qty: number) => {
    setLines((ls) => (qty <= 0 ? ls.filter((l) => l.variantId !== variantId) : ls.map((l) => (l.variantId === variantId ? { ...l, qty: Math.min(20, qty) } : l))));
  }, []);

  const remove = useCallback((variantId: number) => setLines((ls) => ls.filter((l) => l.variantId !== variantId)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartCtx>(
    () => ({
      lines,
      count: lines.reduce((a, l) => a + l.qty, 0),
      subtotalCents: lines.reduce((a, l) => a + l.qty * l.priceCents, 0),
      add,
      setQty,
      remove,
      clear,
      ready,
      justAdded,
    }),
    [lines, add, setQty, remove, clear, ready, justAdded],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
