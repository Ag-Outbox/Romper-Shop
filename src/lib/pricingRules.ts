/* ---------------------------------------------------------------------------
   Regras de precificação automática para importação dropship do admin.
   A regra mais específica vence: fornecedor+categoria > fornecedor > categoria
   > padrão. Persistidas em localStorage até a tabela `pricing_rules`.
--------------------------------------------------------------------------- */

export interface PricingRule {
  id: string;
  providerSlug: string; // '*' = qualquer fornecedor
  category: string;     // '*' = qualquer categoria
  markupPercent: number;
  roundTo99: boolean;   // termina o preço em ,99
  createdAt: string;
}

const KEY = 'romper.pricingRules.v1';
export const FALLBACK_MARKUP_PERCENT = 35;

function readAll(): PricingRule[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PricingRule[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: PricingRule[]): void {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function listPricingRules(): PricingRule[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addPricingRule(input: Omit<PricingRule, 'id' | 'createdAt'>): PricingRule {
  const rule: PricingRule = {
    ...input,
    id: `pr-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
  };
  writeAll([rule, ...readAll()]);
  return rule;
}

export function removePricingRule(id: string): void {
  writeAll(readAll().filter((r) => r.id !== id));
}

function specificity(r: PricingRule): number {
  return (r.providerSlug !== '*' ? 2 : 0) + (r.category !== '*' ? 1 : 0);
}

/** Regra vigente para um fornecedor+categoria (ou null → usa o fallback). */
export function resolveRule(providerSlug: string, category: string): PricingRule | null {
  const candidates = readAll().filter(
    (r) => (r.providerSlug === '*' || r.providerSlug === providerSlug) && (r.category === '*' || r.category === category),
  );
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => specificity(b) - specificity(a) || b.createdAt.localeCompare(a.createdAt))[0];
}

/** Custo do fornecedor → preço de venda, aplicando a regra vigente. */
export function priceFromRules(costCents: number, providerSlug: string, category: string): {
  sellCents: number;
  markupPercent: number;
  ruleId: string | null;
} {
  const rule = resolveRule(providerSlug, category);
  const markup = rule?.markupPercent ?? FALLBACK_MARKUP_PERCENT;
  let cents = Math.round(costCents * (1 + markup / 100));
  // arredonda pro real mais próximo e tira 1 centavo → preço psicológico ,99
  if (rule?.roundTo99) cents = Math.max(99, Math.round(cents / 100) * 100 - 1);
  return { sellCents: cents, markupPercent: markup, ruleId: rule?.id ?? null };
}
