/**
 * =============================================================================
 * Conector REST genérico — plugue QUALQUER fornecedor com API REST
 * (Zendrop, Spocket, DSers, ou qualquer outro) sem escrever código novo.
 * =============================================================================
 * Zendrop, Spocket e DSers têm APIs de parceiro com acesso restrito/sob
 * aprovação e formatos que mudam por conta — em vez de "adivinhar" endpoints
 * e arriscar te dar um conector que parece funcionar mas não bate com a sua
 * conta, este conector lê a configuração de `dropship_providers.config`
 * (coluna jsonb já prevista no schema) e faz a chamada REST descrita por ela.
 *
 * Formato esperado em `dropship_providers.config` (NÃO coloque a chave da
 * API aqui — só o NOME da variável de ambiente/secret que a contém):
 * {
 *   "baseUrl": "https://api.suaplataforma.com",
 *   "productPath": "/products/{id}",        // {id} é substituído pelo urlOrId
 *   "authHeader": "Authorization",
 *   "authValueEnv": "ZENDROP_API_KEY",       // nome do secret; valor lido via Deno.env
 *   "authValuePrefix": "Bearer ",             // opcional, ex.: "Bearer "
 *   "fieldMap": {
 *     "title": "product.title",
 *     "description": "product.description",
 *     "images": "product.images",             // array de URLs
 *     "costCents": "product.price",           // valor em UNIDADE (ex.: 29.90) — multiplicado por 100
 *     "currency": "product.currency",
 *     "variants": "product.variants"           // array [{id,name,price,stock}]
 *   }
 * }
 *
 * Registre um fornecedor novo com:
 *   insert into dropship_providers (name, slug, api_base_url, config) values
 *   ('Zendrop', 'zendrop', 'https://api.zendrop.com', '{"productPath":"/v1/products/{id}", ...}');
 * =============================================================================
 */
import type { DropshipProvider, NormalizedProduct, NormalizedVariant, PlaceOrderInput, PlaceOrderResult, StockUpdate, TrackingInfo } from '../types.ts';
import { getPath } from '../types.ts';

export interface GenericRestConfig {
  baseUrl: string;
  productPath: string;
  authHeader?: string;
  authValueEnv?: string;
  authValuePrefix?: string;
  fieldMap: {
    title: string;
    description?: string;
    images: string;
    costCents: string;
    currency?: string;
    variants?: string;
  };
}

export class GenericRestProvider implements DropshipProvider {
  readonly slug: string;
  private config: GenericRestConfig;

  constructor(slug: string, config: GenericRestConfig) {
    this.slug = slug;
    this.config = config;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.authHeader && this.config.authValueEnv) {
      const secret = Deno.env.get(this.config.authValueEnv);
      if (!secret) throw new Error(`${this.slug}: defina o secret ${this.config.authValueEnv}.`);
      h[this.config.authHeader] = `${this.config.authValuePrefix ?? ''}${secret}`;
    }
    return h;
  }

  async importProduct(urlOrId: string): Promise<NormalizedProduct> {
    const id = urlOrId.match(/(\d+)/)?.[1] ?? urlOrId.trim();
    const path = this.config.productPath.replace('{id}', encodeURIComponent(id));
    const res = await fetch(`${this.config.baseUrl}${path}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`${this.slug}: HTTP ${res.status} ao importar produto.`);
    const json = await res.json();

    const map = this.config.fieldMap;
    const images = getPath(json, map.images);
    const imageList = Array.isArray(images) ? (images as string[]) : [];
    const rawVariants = map.variants ? (getPath(json, map.variants) as Array<Record<string, unknown>> | undefined) ?? [] : [];

    const variants: NormalizedVariant[] = rawVariants.map((v) => ({
      externalId: String(v.id ?? v.externalId ?? ''),
      name: String(v.name ?? 'Padrão'),
      options: (v.options as Record<string, string>) ?? {},
      priceCents: Math.round(Number(v.price ?? v.priceCents ?? 0) * (v.priceCents ? 1 : 100)),
      stock: Number(v.stock ?? 0),
      imageUrl: v.imageUrl as string | undefined,
    }));

    return {
      externalId: id,
      title: String(getPath(json, map.title) ?? `Produto ${this.slug}`),
      description: String(map.description ? getPath(json, map.description) ?? '' : ''),
      images: imageList.length ? imageList : [`https://placehold.co/600x600?text=${this.slug}`],
      costCents: Math.round(Number(getPath(json, map.costCents) ?? 0) * 100),
      currency: String(map.currency ? getPath(json, map.currency) ?? 'USD' : 'USD'),
      variants,
      raw: json,
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

  placeOrder(_input: PlaceOrderInput): Promise<PlaceOrderResult> {
    throw new Error(`${this.slug}: placeOrder não configurado para o conector genérico — implemente um conector dedicado quando for automatizar pedidos com este fornecedor.`);
  }

  getTrackingInfo(_providerOrderId: string): Promise<TrackingInfo> {
    throw new Error(`${this.slug}: getTrackingInfo não configurado para o conector genérico.`);
  }
}
