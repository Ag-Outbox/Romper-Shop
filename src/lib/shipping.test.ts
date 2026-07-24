import { beforeEach, describe, expect, it } from 'vitest';
import { cartShipping, subOrderShipping } from './shipping';
import { saveStoreProfile } from './storeProfile';
import type { CartItem } from './types';

const item = (over: Partial<CartItem> = {}): CartItem => ({
  productId: 'p1', slug: 'p1', title: 'Produto', image: '', unitCents: 3000, qty: 1,
  codAvailable: true, sellerSlug: 'loja-a', sellerName: 'Loja A', ...over,
});

beforeEach(() => localStorage.clear());

describe('subOrderShipping', () => {
  it('base por região: SP mais barato que AM', () => {
    const sp = subOrderShipping([item()], 'loja-a', 'Loja A', 'SP');
    const am = subOrderShipping([item()], 'loja-a', 'Loja A', 'AM');
    expect(sp.shippingCents).toBe(990);
    expect(am.shippingCents).toBe(1990);
    expect(am.etaDays[0]).toBeGreaterThan(sp.etaDays[0]);
  });

  it('cobra adicional por item extra', () => {
    const s = subOrderShipping([item({ qty: 3 })], 'loja-a', 'Loja A', 'SP');
    expect(s.shippingCents).toBe(990 + 2 * 200);
  });

  it('frete grátis da loja acima do limite do perfil', () => {
    saveStoreProfile({
      storeSlug: 'loja-a', tagline: '', description: '', bannerColor: 'volt',
      shippingDays: 1, freeShippingOverCents: 5000, returnsPolicy: '',
    });
    const s = subOrderShipping([item({ qty: 2 })], 'loja-a', 'Loja A', 'AM'); // R$60
    expect(s.shippingCents).toBe(0);
    expect(s.freeReason).toBe('store');
  });

  it('frete grátis global acima de R$199', () => {
    const s = subOrderShipping([item({ unitCents: 20000 })], 'loja-a', 'Loja A', 'AM');
    expect(s.shippingCents).toBe(0);
    expect(s.freeReason).toBe('platform');
  });

  it('prazo soma postagem do perfil + trânsito da região', () => {
    saveStoreProfile({
      storeSlug: 'loja-a', tagline: '', description: '', bannerColor: 'volt',
      shippingDays: 5, returnsPolicy: '',
    });
    const s = subOrderShipping([item()], 'loja-a', 'Loja A', 'SP'); // trânsito 2–4
    expect(s.etaDays).toEqual([7, 9]);
  });
});

describe('cartShipping', () => {
  it('soma o frete por loja', () => {
    const { perSeller, totalCents } = cartShipping([
      item(),
      item({ sellerSlug: 'loja-b', sellerName: 'B' }),
    ], 'SP');
    expect(perSeller).toHaveLength(2);
    expect(totalCents).toBe(990 * 2);
  });
});
