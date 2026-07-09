/**
 * =============================================================================
 * DROPSHIP PROVIDER — CONTRATO UNIFICADO (Adapter Pattern)
 * =============================================================================
 * Toda plataforma de dropshipping (AliExpress/DSers, CJ Dropshipping, Spocket,
 * Zendrop, Printful, fornecedores nacionais...) implementa esta MESMA interface.
 * Assim, adicionar um novo fornecedor não altera o resto do sistema:
 * importação, sincronização e roteamento de pedidos falam sempre o mesmo idioma.
 *
 * SEGURANÇA: as chamadas reais a estas APIs devem rodar em Supabase Edge
 * Functions / worker no Coolify — NUNCA no frontend. Secrets ficam no ambiente
 * do servidor, jamais no cliente. Este contrato é agnóstico a REST/MCP/webhook.
 * =============================================================================
 */

export interface NormalizedVariant {
  externalId: string;
  name: string;               // "Azul / M"
  options: Record<string, string>;
  priceCents: number;         // custo no fornecedor
  stock: number;
  imageUrl?: string;
}

export interface NormalizedProduct {
  externalId: string;
  title: string;
  description: string;
  brand?: string;
  images: string[];
  costCents: number;          // preço no fornecedor (antes do markup)
  currency: string;
  variants: NormalizedVariant[];
  raw?: unknown;              // payload original, p/ debug
}

export interface StockUpdate {
  externalId: string;
  stock: number;
  priceCents: number;
}

export interface PlaceOrderInput {
  externalId: string;
  variantExternalId?: string;
  quantity: number;
  shipTo: {
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
  };
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

/**
 * Interface que TODOS os conectores implementam.
 * Cada método corresponde a um passo do fluxo afiliado→venda→fulfillment.
 */
export interface DropshipProvider {
  /** slug único, casa com public.dropship_providers.slug */
  readonly slug: string;

  /** Busca/normaliza um produto por URL ou ID no fornecedor (para o "importar 1 clique"). */
  importProduct(urlOrId: string): Promise<NormalizedProduct>;

  /** Sincroniza estoque de uma lista de externalIds. */
  syncStock(externalIds: string[]): Promise<StockUpdate[]>;

  /** Sincroniza preço (usado pelo cron para reprecificar com markup). */
  syncPrice(externalIds: string[]): Promise<StockUpdate[]>;

  /** Repassa o pedido ao fornecedor quando o cliente compra. */
  placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult>;

  /** Consulta rastreio de um pedido já colocado no fornecedor. */
  getTrackingInfo(providerOrderId: string): Promise<TrackingInfo>;
}

/** Aplica markup (%) sobre o custo do fornecedor → preço de venda. */
export function applyMarkup(costCents: number, markupPercent: number): number {
  return Math.round(costCents * (1 + markupPercent / 100));
}
