import type { Review, SellerReply } from './types';
import { listOrders } from './orders';
import { PRODUCTS } from './catalog';
import { pushNotification } from './notificationsStore';

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

/* ---- Votos de "útil" (por dispositivo) e resposta do vendedor ----
   Ficam em mapas separados por id da review, para valerem também nas do SEED.
   No Supabase viram review_votes (unique review_id+profile_id) e coluna
   seller_reply. */

const VOTES_KEY = 'romper.reviewVotes.v1';     // ids votados NESTE dispositivo
const COUNTS_KEY = 'romper.reviewCounts.v1';   // agregado por review
const REPLIES_KEY = 'romper.reviewReplies.v1'; // resposta do vendedor por review

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function hasVotedHelpful(reviewId: string): boolean {
  return readJson<string[]>(VOTES_KEY, []).includes(reviewId);
}

/** Alterna o voto de "útil" deste dispositivo. Retorna o novo total. */
export function toggleHelpful(reviewId: string): number {
  const voted = readJson<string[]>(VOTES_KEY, []);
  const counts = readJson<Record<string, number>>(COUNTS_KEY, {});
  const has = voted.includes(reviewId);
  counts[reviewId] = Math.max(0, (counts[reviewId] ?? 0) + (has ? -1 : 1));
  localStorage.setItem(VOTES_KEY, JSON.stringify(has ? voted.filter((id) => id !== reviewId) : [...voted, reviewId]));
  localStorage.setItem(COUNTS_KEY, JSON.stringify(counts));
  return counts[reviewId];
}

export function addSellerReply(reviewId: string, body: string): void {
  const replies = readJson<Record<string, SellerReply>>(REPLIES_KEY, {});
  replies[reviewId] = { body: body.trim(), at: new Date().toISOString() };
  localStorage.setItem(REPLIES_KEY, JSON.stringify(replies));

  // Avisa o comprador que o vendedor respondeu sua avaliação.
  const review = [...SEED, ...readLocal()].find((r) => r.id === reviewId);
  const product = review && PRODUCTS.find((p) => p.id === review.productId);
  pushNotification({
    audienceRole: 'buyer',
    kind: 'review',
    title: 'O vendedor respondeu sua avaliação',
    body: product?.title,
    href: product ? `/produto/${product.slug}` : undefined,
  });
}

function decorate(r: Review): Review {
  const counts = readJson<Record<string, number>>(COUNTS_KEY, {});
  const replies = readJson<Record<string, SellerReply>>(REPLIES_KEY, {});
  return { ...r, helpfulCount: counts[r.id] ?? 0, sellerReply: replies[r.id] };
}

export function getReviews(productId: string): Review[] {
  const all = [...SEED, ...readLocal()];
  return all
    .filter((r) => r.productId === productId)
    .map(decorate)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Avaliações (sem resposta primeiro) dos produtos de uma loja do catálogo. */
export function listReviewsForSeller(storeSlug: string): Array<Review & { productTitle: string }> {
  const mine = new Map(PRODUCTS.filter((p) => p.seller.slug === storeSlug).map((p) => [p.id, p.title]));
  return [...SEED, ...readLocal()]
    .filter((r) => mine.has(r.productId))
    .map((r) => ({ ...decorate(r), productTitle: mine.get(r.productId)! }))
    .sort((a, b) => Number(!!a.sellerReply) - Number(!!b.sellerReply) || b.createdAt.localeCompare(a.createdAt));
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
