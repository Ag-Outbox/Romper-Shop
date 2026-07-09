import { useCallback, useEffect, useState } from 'react';
import type { CartItem } from './types';

/* ---------------------------------------------------------------------------
   Carrinho no cliente (localStorage) até existir a tabela `carts` no Supabase.
   Um CustomEvent mantém todas as instâncias do hook em sincronia (ex.: TopBar
   e a página de produto atualizam juntas). A linha do carrinho é única por
   produto+variação.
--------------------------------------------------------------------------- */

const KEY = 'romper.cart.v1';
const EVT = 'romper:cart';

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVT));
}

/** Identidade da linha: mesmo produto e mesma variação somam quantidade. */
export function lineKey(i: Pick<CartItem, 'productId' | 'variantId'>): string {
  return `${i.productId}:${i.variantId ?? ''}`;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(read);

  useEffect(() => {
    const sync = () => setItems(read());
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', sync); // sincroniza entre abas
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const add = useCallback((item: CartItem) => {
    const cur = read();
    const idx = cur.findIndex((i) => lineKey(i) === lineKey(item));
    if (idx >= 0) cur[idx].qty += item.qty;
    else cur.push(item);
    write(cur);
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    const cur = read()
      .map((i) => (lineKey(i) === key ? { ...i, qty: Math.max(1, qty) } : i));
    write(cur);
  }, []);

  const remove = useCallback((key: string) => {
    write(read().filter((i) => lineKey(i) !== key));
  }, []);

  const clear = useCallback(() => write([]), []);

  const count = items.reduce((n, i) => n + i.qty, 0);
  const subtotalCents = items.reduce((n, i) => n + i.qty * i.unitCents, 0);

  return { items, add, setQty, remove, clear, count, subtotalCents };
}
