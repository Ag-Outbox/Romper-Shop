import type { NormalizedProduct } from '../services/dropship/DropshipProvider';

/* ---------------------------------------------------------------------------
   Importação manual — funciona para QUALQUER plataforma de dropshipping/COD,
   mesmo as que não têm API pública (ou cujo acesso é sob aprovação). O
   vendedor cola o JSON exportado do fornecedor (ou monta um manualmente) e a
   gente normaliza aqui mesmo, sem chamada de rede e sem precisar de Supabase.
   É o caminho mais lento (não é "1 clique"), mas nunca fica bloqueado
   esperando aprovação de app ou chave de API.
--------------------------------------------------------------------------- */

export const MANUAL_IMPORT_EXAMPLE = JSON.stringify(
  {
    title: 'Nome do produto',
    description: 'Descrição copiada do fornecedor',
    costCents: 2990,
    currency: 'BRL',
    images: ['https://exemplo.com/foto1.jpg'],
    variants: [{ name: 'Padrão', priceCents: 2990, stock: 50 }],
  },
  null,
  2,
);

export function parseManualImport(raw: string): NormalizedProduct {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('JSON inválido. Cole o produto no formato do exemplo (título, preço em centavos, imagens, variações).');
  }

  const obj = data as Record<string, unknown>;
  if (!obj || typeof obj.title !== 'string' || !obj.title.trim()) {
    throw new Error('Faltando "title" no JSON colado.');
  }
  const costCents = Number(obj.costCents);
  if (!Number.isFinite(costCents) || costCents <= 0) {
    throw new Error('"costCents" precisa ser um número maior que zero (preço em centavos).');
  }

  const images = Array.isArray(obj.images) ? (obj.images as unknown[]).map(String).filter(Boolean) : [];
  const rawVariants = Array.isArray(obj.variants) ? (obj.variants as Array<Record<string, unknown>>) : [];

  return {
    externalId: `manual-${Date.now()}`,
    title: obj.title.trim(),
    description: typeof obj.description === 'string' ? obj.description : '',
    brand: typeof obj.brand === 'string' ? obj.brand : undefined,
    images: images.length ? images : ['https://placehold.co/600x600?text=Produto'],
    costCents,
    currency: typeof obj.currency === 'string' ? obj.currency : 'BRL',
    variants: rawVariants.map((v, i) => ({
      externalId: String(v.externalId ?? `manual-v${i}`),
      name: String(v.name ?? 'Padrão'),
      options: (v.options as Record<string, string>) ?? {},
      priceCents: Number(v.priceCents ?? costCents),
      stock: Number(v.stock ?? 0),
      imageUrl: typeof v.imageUrl === 'string' ? v.imageUrl : undefined,
    })),
    raw: obj,
  };
}
