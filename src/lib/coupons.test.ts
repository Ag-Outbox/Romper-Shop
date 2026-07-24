import { beforeEach, describe, expect, it } from 'vitest';
import { createCoupon, validateCoupon, redeemCoupon, listCoupons } from './coupons';
import type { CartItem } from './types';

const item = (over: Partial<CartItem> = {}): CartItem => ({
  productId: 'p1', slug: 'p1', title: 'Produto', image: '', unitCents: 5000, qty: 1,
  codAvailable: true, sellerSlug: 'loja-a', sellerName: 'Loja A', ...over,
});

const cart = (items: CartItem[]) => ({
  items,
  subtotalCents: items.reduce((n, i) => n + i.unitCents * i.qty, 0),
});

beforeEach(() => localStorage.clear());

describe('validateCoupon', () => {
  it('aplica percentual sobre o subtotal elegível', () => {
    createCoupon({ code: 'DEZ', kind: 'percent', percent: 10, scope: 'platform' });
    const res = validateCoupon('DEZ', cart([item({ qty: 2 })])); // R$100
    expect(res.ok).toBe(true);
    expect(res.discountCents).toBe(1000);
  });

  it('rejeita abaixo do pedido mínimo', () => {
    createCoupon({ code: 'MIN', kind: 'percent', percent: 10, scope: 'platform', minSubtotalCents: 10000 });
    const res = validateCoupon('MIN', cart([item()])); // R$50
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/mínimo/i);
  });

  it('desconto fixo nunca excede o valor elegível', () => {
    createCoupon({ code: 'VINTE', kind: 'fixed', amountCents: 9999999, scope: 'platform' });
    const res = validateCoupon('VINTE', cart([item()]));
    expect(res.ok).toBe(true);
    expect(res.discountCents).toBe(5000);
  });

  it('cupom de loja só desconta os itens daquela loja', () => {
    createCoupon({ code: 'SOLOJA', kind: 'percent', percent: 10, scope: 'store', storeSlug: 'loja-a' });
    const res = validateCoupon('SOLOJA', cart([
      item(),                                       // loja-a: R$50
      item({ sellerSlug: 'loja-b', sellerName: 'B', unitCents: 100000 }),
    ]));
    expect(res.ok).toBe(true);
    expect(res.discountCents).toBe(500); // 10% de R$50, não de R$1050
  });

  it('cupom de loja falha se a loja não está na sacola', () => {
    createCoupon({ code: 'FORA', kind: 'percent', percent: 10, scope: 'store', storeSlug: 'loja-x' });
    expect(validateCoupon('FORA', cart([item()])).ok).toBe(false);
  });

  it('rejeita expirado e esgotado', () => {
    createCoupon({ code: 'VELHO', kind: 'percent', percent: 10, scope: 'platform', expiresAt: '2000-01-01T00:00:00.000Z' });
    expect(validateCoupon('VELHO', cart([item()])).ok).toBe(false);

    createCoupon({ code: 'UMUSO', kind: 'percent', percent: 10, scope: 'platform', maxUses: 1 });
    redeemCoupon('UMUSO');
    expect(validateCoupon('UMUSO', cart([item()])).ok).toBe(false);
  });

  it('frete grátis não desconta itens, só marca freeShipping', () => {
    createCoupon({ code: 'FRETEX', kind: 'free_shipping', scope: 'platform' });
    const res = validateCoupon('FRETEX', cart([item()]));
    expect(res.ok).toBe(true);
    expect(res.freeShipping).toBe(true);
    expect(res.discountCents).toBe(0);
  });
});

describe('createCoupon', () => {
  it('rejeita código duplicado e formato inválido', () => {
    expect(createCoupon({ code: 'DUP1', kind: 'free_shipping', scope: 'platform' }).ok).toBe(true);
    expect(createCoupon({ code: 'DUP1', kind: 'free_shipping', scope: 'platform' }).ok).toBe(false);
    expect(createCoupon({ code: 'a', kind: 'free_shipping', scope: 'platform' }).ok).toBe(false);
  });

  it('lista por escopo/loja', () => {
    createCoupon({ code: 'LOJAA1', kind: 'percent', percent: 5, scope: 'store', storeSlug: 'loja-a' });
    expect(listCoupons({ scope: 'store', storeSlug: 'loja-a' })).toHaveLength(1);
    expect(listCoupons({ scope: 'store', storeSlug: 'loja-b' })).toHaveLength(0);
  });
});
