import { getStoreProfile } from './storeProfile';
import type { CartItem } from './types';

/* ---------------------------------------------------------------------------
   Frete por regras (B3) — mock determinístico até uma cotação real (Correios/
   transportadora) na Fase 2. Regras:
   - Frete é POR LOJA (cada sub-pedido tem o seu) e a soma vira o total.
   - Base por região da UF de entrega + adicional por item extra.
   - Loja com "frete grátis acima de X" (perfil) zera o frete dela quando o
     subtotal dela cruza o limite; sem UF ainda, usa a base Sudeste.
   - Prazo estimado = postagem da loja (perfil) + trânsito da região.
--------------------------------------------------------------------------- */

type Region = 'sudeste' | 'sul' | 'centro' | 'nordeste' | 'norte';

const REGION_BY_UF: Record<string, Region> = {
  SP: 'sudeste', RJ: 'sudeste', MG: 'sudeste', ES: 'sudeste',
  PR: 'sul', SC: 'sul', RS: 'sul',
  DF: 'centro', GO: 'centro', MT: 'centro', MS: 'centro',
  BA: 'nordeste', PE: 'nordeste', CE: 'nordeste', MA: 'nordeste', PB: 'nordeste',
  RN: 'nordeste', AL: 'nordeste', SE: 'nordeste', PI: 'nordeste',
  AM: 'norte', PA: 'norte', RO: 'norte', RR: 'norte', AC: 'norte', AP: 'norte', TO: 'norte',
};

const REGION_BASE_CENTS: Record<Region, number> = {
  sudeste: 990, sul: 1290, centro: 1490, nordeste: 1690, norte: 1990,
};

const REGION_TRANSIT_DAYS: Record<Region, [number, number]> = {
  sudeste: [2, 4], sul: [3, 6], centro: [4, 7], nordeste: [5, 9], norte: [7, 12],
};

const EXTRA_ITEM_CENTS = 200;              // cada item além do primeiro
const PLATFORM_FREE_OVER_CENTS = 19900;    // regra global que já existia

export interface SubOrderShipping {
  sellerSlug: string;
  sellerName: string;
  shippingCents: number;
  freeReason?: 'store' | 'platform';
  etaDays: [number, number]; // dias úteis (min–max)
}

/** Frete de UMA loja para os itens dela. */
export function subOrderShipping(items: CartItem[], sellerSlug: string, sellerName: string, uf: string): SubOrderShipping {
  const region = REGION_BY_UF[uf] ?? 'sudeste';
  const subtotal = items.reduce((n, it) => n + it.unitCents * it.qty, 0);
  const itemCount = items.reduce((n, it) => n + it.qty, 0);
  const profile = getStoreProfile(sellerSlug);
  const postDays = profile?.shippingDays ?? 2;
  const [tMin, tMax] = REGION_TRANSIT_DAYS[region];
  const eta: [number, number] = [postDays + tMin, postDays + tMax];

  if (profile?.freeShippingOverCents && subtotal >= profile.freeShippingOverCents) {
    return { sellerSlug, sellerName, shippingCents: 0, freeReason: 'store', etaDays: eta };
  }
  if (subtotal >= PLATFORM_FREE_OVER_CENTS) {
    return { sellerSlug, sellerName, shippingCents: 0, freeReason: 'platform', etaDays: eta };
  }
  const cents = REGION_BASE_CENTS[region] + Math.max(0, itemCount - 1) * EXTRA_ITEM_CENTS;
  return { sellerSlug, sellerName, shippingCents: cents, etaDays: eta };
}

/** Frete de todo o carrinho, agrupado por loja. */
export function cartShipping(items: CartItem[], uf: string): { perSeller: SubOrderShipping[]; totalCents: number } {
  const bySeller = new Map<string, CartItem[]>();
  for (const it of items) {
    bySeller.set(it.sellerSlug, [...(bySeller.get(it.sellerSlug) ?? []), it]);
  }
  const perSeller = [...bySeller.entries()].map(([slug, list]) =>
    subOrderShipping(list, slug, list[0].sellerName, uf),
  );
  return { perSeller, totalCents: perSeller.reduce((n, s) => n + s.shippingCents, 0) };
}
