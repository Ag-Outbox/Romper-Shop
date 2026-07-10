/**
 * =============================================================================
 * Contrato dos conectores — mirror do adapter em src/services/dropship/.
 * Duplicado aqui (em vez de importado) porque esta pasta roda em Deno
 * (Supabase Edge Functions) e o resto do projeto roda em Vite/Node — os dois
 * runtimes não compartilham resolução de módulos. Mantenha as duas cópias em
 * sincronia se o contrato mudar.
 * =============================================================================
 */

export interface NormalizedVariant {
  externalId: string;
  name: string;
  options: Record<string, string>;
  priceCents: number; // custo no fornecedor
  stock: number;
  imageUrl?: string;
}

export interface NormalizedProduct {
  externalId: string;
  title: string;
  description: string;
  brand?: string;
  images: string[];
  costCents: number;
  currency: string;
  variants: NormalizedVariant[];
  raw?: unknown;
}

export interface StockUpdate {
  externalId: string;
  stock: number;
  priceCents: number;
}

export interface ShipTo {
  recipient: string;
  phone: string;
  zip: string;
  street: string;
  number?: string;
  complement?: string;
  district?: string;
  city: string;
  state: string;
  country: string;
}

export interface PlaceOrderInput {
  externalId: string;
  variantExternalId?: string;
  quantity: number;
  shipTo: ShipTo;
}

export interface PlaceOrderResult {
  providerOrderId: string;
  status: string;
  estimatedCostCents?: number;
}

export interface TrackingInfo {
  code?: string;
  carrier?: string;
  status: string;
  events?: Array<{ at: string; description: string }>;
}

export interface DropshipProvider {
  readonly slug: string;
  importProduct(urlOrId: string): Promise<NormalizedProduct>;
  syncStock(externalIds: string[]): Promise<StockUpdate[]>;
  syncPrice(externalIds: string[]): Promise<StockUpdate[]>;
  placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult>;
  getTrackingInfo(providerOrderId: string): Promise<TrackingInfo>;
}

/** Lê um caminho tipo "data.list.0.title" de um objeto qualquer, sem eval. */
export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    const idx = Number(key);
    if (Array.isArray(acc) && !Number.isNaN(idx)) return acc[idx];
    return (acc as Record<string, unknown>)[key];
  }, obj);
}
