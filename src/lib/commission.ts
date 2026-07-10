/* ---------------------------------------------------------------------------
   Comissão da plataforma por origem do produto. Dropship rende mais para a
   Romper Shop porque a plataforma mantém a relação com o fornecedor (CJ,
   Printful...) — o vendedor só usa a conexão já pronta, sem negociar nada.
   Espelha `sub_orders.commission_cents` no schema (supabase/migrations/0003).
--------------------------------------------------------------------------- */

export const PLATFORM_COMMISSION_PERCENT: Record<'seller' | 'dropship', number> = {
  seller: 8,
  dropship: 15,
};

export function platformCommissionCents(source: 'seller' | 'dropship', revenueCents: number): number {
  return Math.round(revenueCents * (PLATFORM_COMMISSION_PERCENT[source] / 100));
}
