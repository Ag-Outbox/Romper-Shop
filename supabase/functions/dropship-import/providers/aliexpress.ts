/**
 * =============================================================================
 * AliExpress Open Platform — API oficial (open.aliexpress.com)
 * =============================================================================
 * IMPORTANTE: a API de dropshipping da AliExpress ("aliexpress.ds.*") exige um
 * app aprovado no Open Platform com permissão de Dropshipping — não é acesso
 * público imediato, precisa solicitar aprovação. O mecanismo de assinatura
 * abaixo (ordenar parâmetros, concatenar com o secret, HMAC-SHA256 em
 * maiúsculas) É o documentado oficialmente e está correto; o método exato
 * ("aliexpress.ds.product.get") e os nomes de campo da resposta podem variar
 * por versão do seu app — confira no console do seu app antes de produção.
 *
 * Segredos necessários:
 *   ALIEXPRESS_APP_KEY
 *   ALIEXPRESS_APP_SECRET
 *   ALIEXPRESS_ACCESS_TOKEN   — token OAuth do vendedor autorizado no seu app
 *
 * urlOrId aceito por importProduct: o product_id da AliExpress (número no
 * final da URL do produto, ex.: .../item/1005006123456789.html).
 * =============================================================================
 */
import type { DropshipProvider, NormalizedProduct, PlaceOrderInput, PlaceOrderResult, StockUpdate, TrackingInfo } from '../types.ts';
import { getPath } from '../types.ts';

const GATEWAY = 'https://api-sg.aliexpress.com/sync';

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

async function signedCall(method: string, bizParams: Record<string, string>): Promise<unknown> {
  const appKey = Deno.env.get('ALIEXPRESS_APP_KEY');
  const appSecret = Deno.env.get('ALIEXPRESS_APP_SECRET');
  const accessToken = Deno.env.get('ALIEXPRESS_ACCESS_TOKEN');
  if (!appKey || !appSecret || !accessToken) {
    throw new Error('AliExpress: defina ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET e ALIEXPRESS_ACCESS_TOKEN.');
  }

  const params: Record<string, string> = {
    app_key: appKey,
    method,
    access_token: accessToken,
    timestamp: String(Date.now()),
    sign_method: 'hmac-sha256',
    v: '2.0',
    format: 'json',
    ...bizParams,
  };

  // Assinatura: ordena as chaves, concatena "chave+valor" sem separador, HMAC-SHA256 com o secret.
  const base = Object.keys(params).sort().map((k) => `${k}${params[k]}`).join('');
  const sign = await hmacSha256Hex(appSecret, base);

  const query = new URLSearchParams({ ...params, sign }).toString();
  const res = await fetch(`${GATEWAY}?${query}`);
  if (!res.ok) throw new Error(`AliExpress: HTTP ${res.status}`);
  const json = await res.json();
  const errMsg = getPath(json, 'error_response.msg');
  if (errMsg) throw new Error(`AliExpress: ${errMsg}`);
  return json;
}

function extractProductId(urlOrId: string): string {
  const match = urlOrId.match(/(\d{10,})/g);
  return match ? match[match.length - 1] : urlOrId.trim();
}

export class AliExpressProvider implements DropshipProvider {
  readonly slug = 'aliexpress';

  async importProduct(urlOrId: string): Promise<NormalizedProduct> {
    const productId = extractProductId(urlOrId);
    // Método best-effort da API de Dropshipping (grupo "ds"); verifique o nome
    // exato disponível para o seu app no console do Open Platform.
    const json = await signedCall('aliexpress.ds.product.get', { product_id: productId, ship_to_country: 'BR' });
    const result = (getPath(json, 'aliexpress_ds_product_get_response.result')
      ?? getPath(json, 'result')) as Record<string, unknown> | undefined;
    if (!result) throw new Error('AliExpress: produto não encontrado ou resposta em formato inesperado.');

    const images = (getPath(result, 'ae_multimedia_info_dto.image_urls') as string | undefined)?.split(';').filter(Boolean)
      ?? [];
    const skus = (getPath(result, 'ae_item_sku_info_dtos.ae_item_sku_info_d_t_o') as Array<Record<string, unknown>> | undefined) ?? [];

    return {
      externalId: productId,
      title: String(getPath(result, 'ae_item_base_info_dto.subject') ?? 'Produto AliExpress'),
      description: String(getPath(result, 'ae_item_base_info_dto.detail') ?? ''),
      images: images.length ? images : ['https://placehold.co/600x600?text=AliExpress'],
      costCents: Math.round(Number(getPath(result, 'ae_item_base_info_dto.sale_price') ?? 0) * 100),
      currency: String(getPath(result, 'ae_item_base_info_dto.currency_code') ?? 'USD'),
      variants: skus.map((s) => ({
        externalId: String(getPath(s, 'sku_id') ?? ''),
        name: String(getPath(s, 'sku_attr') ?? 'Padrão'),
        options: {},
        priceCents: Math.round(Number(getPath(s, 'offer_sale_price') ?? 0) * 100),
        stock: Number(getPath(s, 'sku_available_stock') ?? 0),
      })),
      raw: result,
    };
  }

  async syncStock(externalIds: string[]): Promise<StockUpdate[]> {
    const out: StockUpdate[] = [];
    for (const id of externalIds) {
      const p = await this.importProduct(id);
      out.push({ externalId: id, stock: p.variants[0]?.stock ?? 0, priceCents: p.costCents });
    }
    return out;
  }

  syncPrice(externalIds: string[]): Promise<StockUpdate[]> {
    return this.syncStock(externalIds);
  }

  async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    const json = await signedCall('aliexpress.ds.order.create', {
      product_id: input.externalId,
      sku_id: input.variantExternalId ?? '',
      quantity: String(input.quantity),
      logistics_address: JSON.stringify({
        contact_person: input.shipTo.recipient,
        address: input.shipTo.street,
        city: input.shipTo.city,
        province: input.shipTo.state,
        zip: input.shipTo.zip,
        country: input.shipTo.country,
        phone_country: '+55',
        mobile_no: input.shipTo.phone,
      }),
    });
    return {
      providerOrderId: String(getPath(json, 'aliexpress_ds_order_create_response.result.order_list.0') ?? ''),
      status: 'CREATED',
    };
  }

  async getTrackingInfo(providerOrderId: string): Promise<TrackingInfo> {
    const json = await signedCall('aliexpress.logistics.buyer.freight.calculate', { order_id: providerOrderId });
    return { status: String(getPath(json, 'result.status') ?? 'unknown') };
  }
}
