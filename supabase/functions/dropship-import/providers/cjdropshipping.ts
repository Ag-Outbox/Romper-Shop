/**
 * =============================================================================
 * CJ Dropshipping — CJ Open API (developers.cjdropshipping.com)
 * =============================================================================
 * Baseado na documentação pública da CJ Open API v2 (auth por e-mail+senha de
 * API, devolve um accessToken usado nas chamadas seguintes). NÃO testado
 * contra o serviço ao vivo nesta sandbox (sem rede/credenciais) — confira os
 * nomes de campo e endpoints na documentação atual antes de ir para produção,
 * pois a CJ já teve mudanças de contrato entre versões da API.
 *
 * Segredos necessários (supabase secrets set ...):
 *   CJ_API_EMAIL     — e-mail cadastrado no CJ Open API
 *   CJ_API_KEY        — "API Key" (senha de API) gerada no painel da CJ
 *
 * urlOrId aceito por importProduct: o PID do produto na CJ (visível na URL
 * do produto, ex.: cjdropshipping.com/product/xxxx-p-123456.html -> "123456")
 * ou um link colado — o conector tenta extrair o número final da URL.
 * =============================================================================
 */
import type { DropshipProvider, NormalizedProduct, PlaceOrderInput, PlaceOrderResult, StockUpdate, TrackingInfo } from '../types.ts';
import { getPath } from '../types.ts';

const BASE = 'https://developers.cjdropshipping.com/api2.0/v1';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const email = Deno.env.get('CJ_API_EMAIL');
  const key = Deno.env.get('CJ_API_KEY');
  if (!email || !key) throw new Error('CJ Dropshipping: defina os secrets CJ_API_EMAIL e CJ_API_KEY.');

  const res = await fetch(`${BASE}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: key }),
  });
  if (!res.ok) throw new Error(`CJ Dropshipping: falha ao autenticar (HTTP ${res.status}).`);
  const json = await res.json();
  const token = getPath(json, 'data.accessToken') as string | undefined;
  if (!token) throw new Error('CJ Dropshipping: resposta de autenticação sem accessToken — verifique o contrato da API.');

  // Expiração típica de 15 dias na doc pública; usamos margem conservadora de 6h.
  cachedToken = { token, expiresAt: Date.now() + 6 * 60 * 60 * 1000 };
  return token;
}

function extractPid(urlOrId: string): string {
  const match = urlOrId.match(/(\d{5,})/g);
  return match ? match[match.length - 1] : urlOrId.trim();
}

async function cjFetch(path: string, init?: RequestInit): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), 'CJ-Access-Token': token, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`CJ Dropshipping: HTTP ${res.status} em ${path}`);
  return res.json();
}

export class CJDropshippingProvider implements DropshipProvider {
  readonly slug = 'cjdropshipping';

  async importProduct(urlOrId: string): Promise<NormalizedProduct> {
    const pid = extractPid(urlOrId);
    const json = await cjFetch(`/product/query?pid=${encodeURIComponent(pid)}&pageNum=1&pageSize=1`);
    const item = (getPath(json, 'data.list.0') ?? getPath(json, 'data')) as Record<string, unknown> | undefined;
    if (!item) throw new Error('CJ Dropshipping: produto não encontrado para este PID.');

    const images = (getPath(item, 'productImageSet') as string[] | undefined)
      ?? String(getPath(item, 'productImage') ?? '').split(',').filter(Boolean);

    const rawVariants = (getPath(item, 'variants') as Array<Record<string, unknown>> | undefined) ?? [];
    const costCents = Math.round(Number(getPath(item, 'sellPrice') ?? 0) * 100);

    return {
      externalId: String(getPath(item, 'pid') ?? pid),
      title: String(getPath(item, 'productNameEn') ?? getPath(item, 'productName') ?? 'Produto CJ Dropshipping'),
      description: String(getPath(item, 'description') ?? getPath(item, 'productNameEn') ?? ''),
      brand: getPath(item, 'brandName') as string | undefined,
      images: images.length ? images : ['https://placehold.co/600x600?text=CJ'],
      costCents,
      currency: 'USD', // CJ cota em USD por padrão; converta/ajuste markup conforme sua operação.
      variants: rawVariants.map((v) => ({
        externalId: String(getPath(v, 'vid') ?? getPath(v, 'variantSku') ?? ''),
        name: String(getPath(v, 'variantNameEn') ?? getPath(v, 'variantKey') ?? 'Padrão'),
        options: (getPath(v, 'variantKeyEn') as Record<string, string> | undefined) ?? {},
        priceCents: Math.round(Number(getPath(v, 'variantSellPrice') ?? getPath(item, 'sellPrice') ?? 0) * 100),
        stock: Number(getPath(v, 'variantStock') ?? 0),
        imageUrl: getPath(v, 'variantImage') as string | undefined,
      })),
      raw: item,
    };
  }

  async syncStock(externalIds: string[]): Promise<StockUpdate[]> {
    const out: StockUpdate[] = [];
    for (const id of externalIds) {
      const json = await cjFetch(`/product/query?pid=${encodeURIComponent(id)}&pageNum=1&pageSize=1`);
      const item = getPath(json, 'data.list.0') as Record<string, unknown> | undefined;
      out.push({
        externalId: id,
        stock: Number(getPath(item, 'inventoryNum') ?? 0),
        priceCents: Math.round(Number(getPath(item, 'sellPrice') ?? 0) * 100),
      });
    }
    return out;
  }

  syncPrice(externalIds: string[]): Promise<StockUpdate[]> {
    return this.syncStock(externalIds);
  }

  async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    const json = await cjFetch('/shopping/order/createOrder', {
      method: 'POST',
      body: JSON.stringify({
        products: [{ vid: input.variantExternalId, quantity: input.quantity }],
        shippingCountryCode: input.shipTo.country,
        shippingProvince: input.shipTo.state,
        shippingCity: input.shipTo.city,
        shippingAddress: input.shipTo.street,
        shippingCustomerName: input.shipTo.recipient,
        shippingZip: input.shipTo.zip,
        shippingPhone: input.shipTo.phone,
      }),
    });
    return {
      providerOrderId: String(getPath(json, 'data.orderId') ?? ''),
      status: String(getPath(json, 'data.orderStatus') ?? 'CREATED'),
    };
  }

  async getTrackingInfo(providerOrderId: string): Promise<TrackingInfo> {
    const json = await cjFetch(`/logistic/getTrackInfo?orderId=${encodeURIComponent(providerOrderId)}`);
    return {
      code: getPath(json, 'data.trackNumber') as string | undefined,
      carrier: getPath(json, 'data.logisticName') as string | undefined,
      status: String(getPath(json, 'data.trackStatus') ?? 'unknown'),
    };
  }
}
