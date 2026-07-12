import { PRODUCTS } from './catalog';
import type { Product } from './types';

/* Oferta relâmpago mock: janelas de 6h que rotacionam deterministicamente os
   produtos com desconto (compareAtCents). No Supabase isto vira uma tabela
   `flash_sales` administrada pelo painel, com janela e itens escolhidos. */

const WINDOW_MS = 6 * 60 * 60 * 1000;

export interface FlashSale {
  endsAt: number; // epoch ms do fim da janela atual
  products: Product[];
}

export function getFlashSale(limit = 4): FlashSale {
  const block = Math.floor(Date.now() / WINDOW_MS);
  const discounted = PRODUCTS.filter((p) => p.compareAtCents && p.compareAtCents > p.priceCents);
  const start = discounted.length > 0 ? block % discounted.length : 0;
  const products = discounted.length === 0
    ? []
    : Array.from({ length: Math.min(limit, discounted.length) }, (_, i) => discounted[(start + i) % discounted.length]);
  return { endsAt: (block + 1) * WINDOW_MS, products };
}
