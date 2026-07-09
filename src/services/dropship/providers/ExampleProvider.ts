/**
 * ExampleProvider — conector de EXEMPLO (mockado).
 * Serve de molde para conectores reais (CJDropshipping, DSers, Spocket...).
 * Retorna dados falsos p/ o fluxo funcionar ponta-a-ponta em dev.
 * Substitua o corpo dos métodos por chamadas REST/MCP reais na Edge Function.
 */
import {
  DropshipProvider,
  NormalizedProduct,
  StockUpdate,
  PlaceOrderInput,
  PlaceOrderResult,
  TrackingInfo,
} from '../DropshipProvider';

export class ExampleProvider implements DropshipProvider {
  readonly slug = 'example';

  async importProduct(urlOrId: string): Promise<NormalizedProduct> {
    // TODO(real): GET {api_base_url}/products/{id} + normalizar resposta.
    return {
      externalId: urlOrId,
      title: 'Produto de Exemplo',
      description: 'Descrição mockada importada do fornecedor.',
      brand: 'ExampleBrand',
      images: ['https://placehold.co/600x600'],
      costCents: 2990,
      currency: 'BRL',
      variants: [
        { externalId: `${urlOrId}-p`, name: 'Padrão', options: {}, priceCents: 2990, stock: 50 },
      ],
    };
  }

  async syncStock(externalIds: string[]): Promise<StockUpdate[]> {
    return externalIds.map((id) => ({ externalId: id, stock: 50, priceCents: 2990 }));
  }

  async syncPrice(externalIds: string[]): Promise<StockUpdate[]> {
    return this.syncStock(externalIds);
  }

  async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    // TODO(real): POST {api_base_url}/orders com os dados de envio.
    return {
      providerOrderId: `EX-${Date.now()}`,
      status: 'placed',
      estimatedCostCents: 2990 * input.quantity,
    };
  }

  async getTrackingInfo(providerOrderId: string): Promise<TrackingInfo> {
    return {
      code: `BR${providerOrderId}`,
      carrier: 'Correios',
      status: 'in_transit',
      events: [{ at: new Date().toISOString(), description: 'Objeto postado' }],
    };
  }
}
