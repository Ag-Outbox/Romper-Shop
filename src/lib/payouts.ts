import type { Payout } from './types';

/* ---------------------------------------------------------------------------
   Saques — vendedor ou afiliado, em localStorage (migration 0007: payouts
   ganha affiliate_id, seller_id vira opcional). O saldo do AFILIADO é real
   (affiliates.balanceCents, lib/affiliates.ts) — sacar zera o campo de
   verdade. O saldo do VENDEDOR aqui é derivado (faturamento - comissão da
   plataforma, calculado no SellerDashboard), então guardamos o total já
   sacado por loja para não deixar sacar de novo o que já foi pedido.
--------------------------------------------------------------------------- */

const KEY = 'romper.payouts.v1';

function readAll(): Payout[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Payout[]) : [];
  } catch {
    return [];
  }
}

function writeAll(all: Payout[]): void {
  localStorage.setItem(KEY, JSON.stringify(all));
}

function request(ownerType: Payout['ownerType'], ownerId: string, amountCents: number): Payout {
  const payout: Payout = {
    id: `pay-${Date.now().toString(36)}`,
    ownerType,
    ownerId,
    amountCents,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };
  writeAll([payout, ...readAll()]);
  return payout;
}

export function listPayouts(ownerType: Payout['ownerType'], ownerId: string): Payout[] {
  return readAll()
    .filter((p) => p.ownerType === ownerType && p.ownerId === ownerId)
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
}

/** Total já solicitado (pending ou pago) por uma loja — abate do saldo derivado. */
export function totalWithdrawnBySeller(storeSlug: string): number {
  return listPayouts('seller', storeSlug).reduce((n, p) => n + p.amountCents, 0);
}

export function requestSellerPayout(storeSlug: string, amountCents: number): Payout {
  if (amountCents <= 0) throw new Error('Não há saldo disponível para saque.');
  return request('seller', storeSlug, amountCents);
}

export function requestAffiliatePayout(affiliateId: string, amountCents: number): Payout {
  if (amountCents <= 0) throw new Error('Não há saldo disponível para saque.');
  return request('affiliate', affiliateId, amountCents);
}
