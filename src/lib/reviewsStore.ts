import type { Review } from './types';
import { listOrders } from './orders';

/* ---------------------------------------------------------------------------
   Avaliações — seed de demonstração + adições do usuário em localStorage.
   Regra do schema (migration 0004): 1 review por comprador/produto, e só com
   compra verificada (order_item com sub-pedido entregue). No Supabase, isso
   vira insert em `reviews` com a constraint unique(product_id, buyer_id) e
   a trigger recalc_product_rating cuidando de rating_avg/rating_count.

   Simplificação de demo: como o checkout aqui é "convidado" (sem buyer_id
   gravado no pedido), a verificação de compra olha qualquer pedido ENTREGUE
   neste dispositivo que contenha o produto — mesmo critério já usado em
   Account.tsx para o histórico.
--------------------------------------------------------------------------- */

const KEY = 'romper.reviews.v1';

const SEED: Review[] = [
  {
    id: 'seed-r1', productId: 'p-organizador-modular', buyerId: 'seed-1', buyerName: 'Camila R.',
    rating: 5, title: 'Resolveu minha gaveta de vez', body: 'Encaixou perfeito, material firme e chegou rápido. Recomendo muito.',
    isVerified: true, createdAt: '2026-05-12T10:00:00.000Z',
  },
  {
    id: 'seed-r2', productId: 'p-organizador-modular', buyerId: 'seed-2', buyerName: 'Diego M.',
    rating: 4, title: 'Bom custo-benefício', body: 'Só achei o cinza um pouco mais claro que na foto, mas funcional.',
    isVerified: true, createdAt: '2026-04-28T10:00:00.000Z',
  },
  {
    id: 'seed-r3', productId: 'p-organizador-modular', buyerId: 'seed-3', buyerName: 'Fernanda A.',
    rating: 5, body: 'Comprei 3 kits para organizar a casa toda. Ótimo.',
    isVerified: true, createdAt: '2026-04-02T10:00:00.000Z',
  },
  {
    id: 'seed-r4', productId: 'p-serum-vitamina-c', buyerId: 'seed-4', buyerName: 'Juliana P.',
    rating: 5, title: 'Pele mais uniforme em 2 semanas', body: 'Textura leve, não pesa e não deixou oleosa.',
    isVerified: true, createdAt: '2026-05-20T10:00:00.000Z',
  },
];

function readLocal(): Review[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Review[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(reviews: Review[]): void {
  localStorage.setItem(KEY, JSON.stringify(reviews));
}

export function getReviews(productId: string): Review[] {
  const all = [...SEED, ...readLocal()];
  return all
    .filter((r) => r.productId === productId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function hasReviewed(productId: string, buyerId: string): boolean {
  return getReviews(productId).some((r) => r.buyerId === buyerId);
}

/** Compra verificada: algum pedido ENTREGUE neste dispositivo contém o produto. */
export function hasVerifiedPurchase(productId: string): boolean {
  return listOrders().some((o) =>
    o.subOrders.some((s) => s.status === 'delivered' && s.items.some((i) => i.productId === productId)),
  );
}

export function addReview(input: Omit<Review, 'id' | 'createdAt' | 'isVerified'>): Review {
  const review: Review = {
    ...input,
    id: `r-${Date.now().toString(36)}`,
    isVerified: hasVerifiedPurchase(input.productId),
    createdAt: new Date().toISOString(),
  };
  writeLocal([...readLocal(), review]);
  return review;
}
