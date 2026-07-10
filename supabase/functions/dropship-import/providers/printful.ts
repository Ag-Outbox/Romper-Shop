/**
 * =============================================================================
 * Printful — API pública (developers.printful.com)
 * =============================================================================
 * Fulfillment sob demanda (print-on-demand): bom para categorias como Moda/
 * Casa com estampas próprias. Autenticação por Bearer token (chave de API do
 * painel Printful > Settings > API). Estrutura de endpoints é estável e bem
 * documentada; ainda assim, não testado ao vivo nesta sandbox — confira a
 * versão da API (v1/v2) que sua conta usa antes de produção.
 *
 * Segredos necessários:
 *   PRINTFUL_API_KEY     — chave de API (Bearer token)
 *   PRINTFUL_STORE_ID     — opcional, se sua conta tem múltiplas lojas
 *
 * urlOrId aceito por importProduct: o ID do "sync product" da sua loja
 * Printful (Store > Products > abrir produto > ID na URL).
 * =============================================================================
 */
import type { DropshipProvider, NormalizedProduct, PlaceOrderInput, PlaceOrderResult, StockUpdate, TrackingInfo } from '../types.ts';
import { getPath } from '../types.ts';

const BASE = 'https://api.printful.com';

function authHeaders(): Record<string, string> {
  const key = Deno.env.get('PRINTFUL_API_KEY');
  if (!key) throw new Error('Printful: defina o secret PRINTFUL_API_KEY.');
  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const storeId = Deno.env.get('PRINTFUL_STORE_ID');
  if (storeId) headers['X-PF-Store-Id'] = storeId;
  return headers;
}

async function pfFetch(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...authHeaders(), ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`Printful: HTTP ${res.status} em ${path}`);
  return res.json();
}

export class PrintfulProvider implements DropshipProvider {
  readonly slug = 'printful';

  async importProduct(urlOrId: string): Promise<NormalizedProduct> {
    const id = urlOrId.replace(/\D/g, '') || urlOrId;
    const json = await pfFetch(`/store/products/${encodeURIComponent(id)}`);
    const product = getPath(json, 'result.sync_product') as Record<string, unknown> | undefined;
    const variants = (getPath(json, 'result.sync_variants') as Array<Record<string, unknown>> | undefined) ?? [];
    if (!product) throw new Error('Printful: produto não encontrado para este ID.');

    const thumb = getPath(product, 'thumbnail_url') as string | undefined;
    const images = [thumb, ...variants.map((v) => getPath(v, 'files.0.preview_url') as string | undefined)]
      .filter((u): u is string => !!u);

    return {
      externalId: String(getPath(product, 'id') ?? id),
      title: String(getPath(product, 'name') ?? 'Produto Printful'),
      description: '', // Printful não retorna descrição no sync_product — preencha ao publicar.
      images: images.length ? [...new Set(images)] : ['https://placehold.co/600x600?text=Printful'],
      costCents: Math.round(Number(getPath(variants[0], 'retail_price') ?? 0) * 100),
      currency: String(getPath(variants[0], 'currency') ?? 'USD'),
      variants: variants.map((v) => ({
        externalId: String(getPath(v, 'id') ?? ''),
        name: String(getPath(v, 'name') ?? getPath(v, 'size') ?? 'Padrão'),
        options: { tamanho: String(getPath(v, 'size') ?? ''), cor: String(getPath(v, 'color') ?? '') },
        priceCents: Math.round(Number(getPath(v, 'retail_price') ?? 0) * 100),
        stock: 9999, // Printful fabrica sob demanda — não há estoque fixo por padrão.
        imageUrl: getPath(v, 'files.0.preview_url') as string | undefined,
      })),
      raw: { product, variants },
    };
  }

  async syncStock(externalIds: string[]): Promise<StockUpdate[]> {
    // Print-on-demand: sem controle de estoque tradicional; retorna disponibilidade "infinita".
    return externalIds.map((id) => ({ externalId: id, stock: 9999, priceCents: 0 }));
  }

  async syncPrice(externalIds: string[]): Promise<StockUpdate[]> {
    const out: StockUpdate[] = [];
    for (const id of externalIds) {
      const json = await pfFetch(`/store/products/${encodeURIComponent(id)}`);
      const variant = getPath(json, 'result.sync_variants.0') as Record<string, unknown> | undefined;
      out.push({ externalId: id, stock: 9999, priceCents: Math.round(Number(getPath(variant, 'retail_price') ?? 0) * 100) });
    }
    return out;
  }

  async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    const json = await pfFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({
        recipient: {
          name: input.shipTo.recipient,
          address1: input.shipTo.street,
          city: input.shipTo.city,
          state_code: input.shipTo.state,
          country_code: input.shipTo.country,
          zip: input.shipTo.zip,
          phone: input.shipTo.phone,
        },
        items: [{ sync_variant_id: input.variantExternalId, quantity: input.quantity }],
      }),
    });
    return {
      providerOrderId: String(getPath(json, 'result.id') ?? ''),
      status: String(getPath(json, 'result.status') ?? 'draft'),
    };
  }

  async getTrackingInfo(providerOrderId: string): Promise<TrackingInfo> {
    const json = await pfFetch(`/orders/${encodeURIComponent(providerOrderId)}`);
    const shipment = getPath(json, 'result.shipments.0') as Record<string, unknown> | undefined;
    return {
      code: getPath(shipment, 'tracking_number') as string | undefined,
      carrier: getPath(shipment, 'carrier') as string | undefined,
      status: String(getPath(json, 'result.status') ?? 'unknown'),
    };
  }
}
