import type { Affiliate, AffiliateCommission, Order } from './types';

/* ---------------------------------------------------------------------------
   Programa de afiliados — em localStorage até o Supabase estar ligado
   (migration 0006: affiliates, affiliate_commissions, become_affiliate()).

   Fluxo:
   1. Uma pessoa vira afiliada (becomeAffiliate) e ganha um código único.
   2. Ela compartilha um link de produto com ?ref=CODIGO.
   3. Quem abre esse link, mesmo sem estar logado, tem o código capturado
      (captureReferralFromUrl) e guardado por 30 dias.
   4. Ao finalizar uma compra, recordCommissionsForOrder cria 1 comissão
      PENDENTE por sub-pedido (vendedor) do pedido, proporcional ao subtotal.
   5. Quando o vendedor marca aquele sub-pedido como ENTREGUE, a comissão
      correspondente vira CONFIRMED (confirmCommissionsForOrder) — mesmo
      evento que já disparava o histórico do comprador.

   Auto-referência (a mesma pessoa comprando pelo próprio link) não gera
   comissão — checada via buyerProfileId em recordCommissionsForOrder.
--------------------------------------------------------------------------- */

const AFFILIATES_KEY = 'romper.affiliates.v1';
const COMMISSIONS_KEY = 'romper.affiliate_commissions.v1';
const REF_KEY = 'romper.ref.v1';
const REF_TTL_DAYS = 30;
const DEFAULT_COMMISSION_PERCENT = 10;

function readAffiliates(): Affiliate[] {
  try {
    const raw = localStorage.getItem(AFFILIATES_KEY);
    return raw ? (JSON.parse(raw) as Affiliate[]) : [];
  } catch {
    return [];
  }
}
function writeAffiliates(all: Affiliate[]): void {
  localStorage.setItem(AFFILIATES_KEY, JSON.stringify(all));
}

function readCommissions(): AffiliateCommission[] {
  try {
    const raw = localStorage.getItem(COMMISSIONS_KEY);
    return raw ? (JSON.parse(raw) as AffiliateCommission[]) : [];
  } catch {
    return [];
  }
}
function writeCommissions(all: AffiliateCommission[]): void {
  localStorage.setItem(COMMISSIONS_KEY, JSON.stringify(all));
}

function generateCode(fullName: string): string {
  const base = fullName.trim().split(/\s+/)[0]?.toUpperCase().slice(0, 6).replace(/[^A-Z]/g, '') || 'AFF';
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${suffix}`;
}

export function getAffiliateByProfile(profileId: string): Affiliate | undefined {
  return readAffiliates().find((a) => a.profileId === profileId);
}

export function becomeAffiliate(profileId: string, fullName: string): Affiliate {
  const existing = getAffiliateByProfile(profileId);
  if (existing) return existing;
  const affiliate: Affiliate = {
    id: `aff-${Date.now().toString(36)}`,
    profileId,
    code: generateCode(fullName),
    commissionPercent: DEFAULT_COMMISSION_PERCENT,
    status: 'active',
    clicks: 0,
    balanceCents: 0,
    pendingCents: 0,
    createdAt: new Date().toISOString(),
  };
  writeAffiliates([...readAffiliates(), affiliate]);
  return affiliate;
}

function getAffiliateByCode(code: string): Affiliate | undefined {
  return readAffiliates().find((a) => a.code === code && a.status === 'active');
}

/** Lê `?ref=` da URL atual, registra o clique e guarda a atribuição por 30 dias. */
export function captureReferralFromUrl(search: string): void {
  const code = new URLSearchParams(search).get('ref');
  if (!code) return;
  const affiliate = getAffiliateByCode(code);
  if (!affiliate) return;

  const all = readAffiliates();
  const idx = all.findIndex((a) => a.id === affiliate.id);
  if (idx >= 0) {
    all[idx].clicks += 1;
    writeAffiliates(all);
  }

  const expiresAt = Date.now() + REF_TTL_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(REF_KEY, JSON.stringify({ code, expiresAt }));
}

function consumeReferralCode(): string | undefined {
  try {
    const raw = localStorage.getItem(REF_KEY);
    if (!raw) return undefined;
    const { code, expiresAt } = JSON.parse(raw) as { code: string; expiresAt: number };
    if (Date.now() > expiresAt) {
      localStorage.removeItem(REF_KEY);
      return undefined;
    }
    return code;
  } catch {
    return undefined;
  }
}

/** Cria 1 comissão pendente por sub-pedido, se houver um afiliado válido atribuído. */
export function recordCommissionsForOrder(order: Order, buyerProfileId?: string): void {
  const code = consumeReferralCode();
  if (!code) return;
  const affiliate = getAffiliateByCode(code);
  if (!affiliate) return;
  if (buyerProfileId && affiliate.profileId === buyerProfileId) return; // sem auto-referência

  const commissions = readCommissions();
  let addedPendingCents = 0;
  for (const sub of order.subOrders) {
    const amount = Math.round(sub.subtotalCents * (affiliate.commissionPercent / 100));
    if (amount <= 0) continue;
    commissions.push({
      id: `com-${Date.now().toString(36)}-${sub.sellerSlug}`,
      affiliateId: affiliate.id,
      orderId: order.id,
      sellerSlug: sub.sellerSlug,
      sellerName: sub.sellerName,
      amountCents: amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    addedPendingCents += amount;
  }
  if (addedPendingCents === 0) return;
  writeCommissions(commissions);

  const all = readAffiliates();
  const idx = all.findIndex((a) => a.id === affiliate.id);
  if (idx >= 0) {
    all[idx].pendingCents += addedPendingCents;
    writeAffiliates(all);
  }
}

/** Confirma (pending -> confirmed) as comissões de um sub-pedido específico ao ser entregue. */
export function confirmCommissionsForSubOrder(orderId: string, sellerSlug: string): void {
  const commissions = readCommissions();
  const target = commissions.find((c) => c.orderId === orderId && c.sellerSlug === sellerSlug && c.status === 'pending');
  if (!target) return;
  target.status = 'confirmed';
  writeCommissions(commissions);

  const all = readAffiliates();
  const idx = all.findIndex((a) => a.id === target.affiliateId);
  if (idx >= 0) {
    all[idx].pendingCents = Math.max(0, all[idx].pendingCents - target.amountCents);
    all[idx].balanceCents += target.amountCents;
    writeAffiliates(all);
  }
}

export function listCommissions(affiliateId: string): AffiliateCommission[] {
  return readCommissions()
    .filter((c) => c.affiliateId === affiliateId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function listAllAffiliates(): Affiliate[] {
  return readAffiliates();
}
