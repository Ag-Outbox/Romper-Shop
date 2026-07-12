import type { CartItem, Coupon, CouponKind } from './types';

/* Cupons persistidos no cliente (localStorage) até a tabela `coupons` no
   Supabase — mesmo padrão de orders.ts. A validação/resgate aqui espelha o
   que depois vira uma Edge Function (o cliente nunca poderá ser a fonte de
   verdade de desconto em produção). */

const KEY = 'romper.coupons.v1';

/** Cupons da plataforma que já vêm de fábrica (demonstração). */
const SEED: Coupon[] = [
  {
    id: 'seed-bemvindo10',
    code: 'BEMVINDO10',
    kind: 'percent',
    percent: 10,
    scope: 'platform',
    minSubtotalCents: 5000,
    uses: 0,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-fretegratis',
    code: 'FRETEGRATIS',
    kind: 'free_shipping',
    scope: 'platform',
    uses: 0,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-romper20',
    code: 'ROMPER20',
    kind: 'fixed',
    amountCents: 2000,
    scope: 'platform',
    minSubtotalCents: 15000,
    uses: 0,
    active: true,
    createdAt: new Date().toISOString(),
  },
];

function readAll(): Coupon[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Coupon[];
  } catch { /* seed abaixo */ }
  writeAll(SEED);
  return [...SEED];
}

function writeAll(coupons: Coupon[]): void {
  localStorage.setItem(KEY, JSON.stringify(coupons));
}

export function listCoupons(filter?: { scope?: 'platform' | 'store'; storeSlug?: string }): Coupon[] {
  let all = readAll();
  if (filter?.scope) all = all.filter((c) => c.scope === filter.scope);
  if (filter?.storeSlug) all = all.filter((c) => c.storeSlug === filter.storeSlug);
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface NewCouponInput {
  code: string;
  kind: CouponKind;
  percent?: number;
  amountCents?: number;
  scope: 'platform' | 'store';
  storeSlug?: string;
  minSubtotalCents?: number;
  expiresAt?: string;
  maxUses?: number;
}

export function createCoupon(input: NewCouponInput): { ok: true; coupon: Coupon } | { ok: false; reason: string } {
  const code = input.code.trim().toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9]{3,20}$/.test(code)) return { ok: false, reason: 'Código: 3–20 letras/números, sem espaços.' };
  if (input.kind === 'percent' && !(input.percent && input.percent >= 1 && input.percent <= 90)) {
    return { ok: false, reason: 'Percentual precisa estar entre 1 e 90.' };
  }
  if (input.kind === 'fixed' && !(input.amountCents && input.amountCents > 0)) {
    return { ok: false, reason: 'Informe o valor do desconto.' };
  }
  if (input.scope === 'store' && !input.storeSlug) return { ok: false, reason: 'Cupom de loja precisa da loja.' };
  const all = readAll();
  if (all.some((c) => c.code === code)) return { ok: false, reason: `O código ${code} já existe.` };
  const coupon: Coupon = {
    id: `cp-${Date.now().toString(36)}`,
    code,
    kind: input.kind,
    percent: input.kind === 'percent' ? input.percent : undefined,
    amountCents: input.kind === 'fixed' ? input.amountCents : undefined,
    scope: input.scope,
    storeSlug: input.scope === 'store' ? input.storeSlug : undefined,
    minSubtotalCents: input.minSubtotalCents || undefined,
    expiresAt: input.expiresAt || undefined,
    maxUses: input.maxUses || undefined,
    uses: 0,
    active: true,
    createdAt: new Date().toISOString(),
  };
  all.unshift(coupon);
  writeAll(all);
  return { ok: true, coupon };
}

export function toggleCoupon(id: string): void {
  const all = readAll();
  const c = all.find((x) => x.id === id);
  if (!c) return;
  c.active = !c.active;
  writeAll(all);
}

export function deleteCoupon(id: string): void {
  writeAll(readAll().filter((c) => c.id !== id));
}

/* ---- Validação no checkout ---- */

export interface CouponResult {
  ok: boolean;
  reason?: string;
  coupon?: Coupon;
  /** Desconto em centavos sobre os itens (0 para frete grátis). */
  discountCents: number;
  freeShipping: boolean;
}

const FAIL = (reason: string): CouponResult => ({ ok: false, reason, discountCents: 0, freeShipping: false });

/** Valida um código contra a sacola atual. Cupom de loja só desconta sobre o
 *  subtotal dos itens daquela loja (multi-vendedor no mesmo pedido). */
export function validateCoupon(codeRaw: string, cart: { items: CartItem[]; subtotalCents: number }): CouponResult {
  const code = codeRaw.trim().toUpperCase();
  if (!code) return FAIL('Digite um código.');
  const coupon = readAll().find((c) => c.code === code);
  if (!coupon || !coupon.active) return FAIL('Cupom não encontrado ou desativado.');
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) return FAIL('Cupom expirado.');
  if (coupon.maxUses && coupon.uses >= coupon.maxUses) return FAIL('Cupom esgotado.');

  const eligibleCents = coupon.scope === 'store'
    ? cart.items.filter((it) => it.sellerSlug === coupon.storeSlug).reduce((s, it) => s + it.unitCents * it.qty, 0)
    : cart.subtotalCents;
  if (coupon.scope === 'store' && eligibleCents === 0) {
    return FAIL('Este cupom vale só para produtos de uma loja que não está na sua sacola.');
  }
  if (coupon.minSubtotalCents && eligibleCents < coupon.minSubtotalCents) {
    return FAIL(`Pedido mínimo de R$ ${(coupon.minSubtotalCents / 100).toFixed(2).replace('.', ',')} nos itens elegíveis.`);
  }

  if (coupon.kind === 'free_shipping') return { ok: true, coupon, discountCents: 0, freeShipping: true };
  const discountCents = coupon.kind === 'percent'
    ? Math.floor((eligibleCents * (coupon.percent ?? 0)) / 100)
    : Math.min(coupon.amountCents ?? 0, eligibleCents); // desconto fixo nunca excede o elegível
  return { ok: true, coupon, discountCents, freeShipping: false };
}

/** Registra o uso no fechamento do pedido. */
export function redeemCoupon(code: string): void {
  const all = readAll();
  const c = all.find((x) => x.code === code.toUpperCase());
  if (!c) return;
  c.uses += 1;
  writeAll(all);
}
