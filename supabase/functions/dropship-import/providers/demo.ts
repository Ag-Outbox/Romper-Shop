/**
 * Provider de demonstração — sem chamadas de rede, sem segredos.
 * Serve para testar o deploy da function e o fluxo de importação de ponta a
 * ponta antes de configurar um fornecedor real.
 */
import type { DropshipProvider, NormalizedProduct, PlaceOrderInput, PlaceOrderResult, StockUpdate, TrackingInfo } from '../types.ts';

export class DemoProvider implements DropshipProvider {
  readonly slug = 'demo';

  async importProduct(urlOrId: string): Promise<NormalizedProduct> {
    return {
      externalId: urlOrId,
      title: 'Produto de demonstração',
      description: 'Produto de exemplo devolvido pelo conector demo — sem chamada de rede real.',
      brand: 'Demo',
      images: ['https://placehold.co/600x600?text=Demo'],
      costCents: 2990,
      currency: 'BRL',
      variants: [{ externalId: `${urlOrId}-padrao`, name: 'Padrão', options: {}, priceCents: 2990, stock: 50 }],
    };
  }

  async syncStock(externalIds: string[]): Promise<StockUpdate[]> {
    return externalIds.map((id) => ({ externalId: id, stock: 50, priceCents: 2990 }));
  }

  syncPrice(externalIds: string[]): Promise<StockUpdate[]> {
    return this.syncStock(externalIds);
  }

  async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    return { providerOrderId: `DEMO-${Date.now()}`, status: 'placed', estimatedCostCents: 2990 * input.quantity };
  }

  async getTrackingInfo(providerOrderId: string): Promise<TrackingInfo> {
    return { code: `BR${providerOrderId}`, carrier: 'Demo Log', status: 'in_transit' };
  }
}
