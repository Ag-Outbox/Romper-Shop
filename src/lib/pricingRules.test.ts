import { beforeEach, describe, expect, it } from 'vitest';
import { addPricingRule, priceFromRules, resolveRule, FALLBACK_MARKUP_PERCENT } from './pricingRules';

beforeEach(() => localStorage.clear());

describe('priceFromRules', () => {
  it('usa o fallback sem regra', () => {
    const { sellCents, markupPercent } = priceFromRules(10000, 'example', 'Casa');
    expect(markupPercent).toBe(FALLBACK_MARKUP_PERCENT);
    expect(sellCents).toBe(13500);
  });

  it('regra mais específica vence (fornecedor+categoria > geral)', () => {
    addPricingRule({ providerSlug: '*', category: '*', markupPercent: 10, roundTo99: false });
    addPricingRule({ providerSlug: 'example', category: 'Casa', markupPercent: 80, roundTo99: false });
    expect(priceFromRules(10000, 'example', 'Casa').markupPercent).toBe(80);
    expect(priceFromRules(10000, 'example', 'Tech').markupPercent).toBe(10);
    expect(resolveRule('outra', 'Casa')!.markupPercent).toBe(10);
  });

  it('arredonda para ,99 quando a regra pede', () => {
    addPricingRule({ providerSlug: '*', category: '*', markupPercent: 50, roundTo99: true });
    // 2990 * 1.5 = 4485 → arredonda pro real (4500) − 1 = 4499
    expect(priceFromRules(2990, 'example', 'Casa').sellCents).toBe(4499);
  });

  it('nunca fica abaixo de R$0,99', () => {
    addPricingRule({ providerSlug: '*', category: '*', markupPercent: 1, roundTo99: true });
    expect(priceFromRules(1, 'example', 'Casa').sellCents).toBeGreaterThanOrEqual(99);
  });
});
