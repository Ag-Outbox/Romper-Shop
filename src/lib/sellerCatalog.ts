import { PRODUCTS } from './catalog';

/* ---------------------------------------------------------------------------
   Catálogo do vendedor, por loja (localStorage) — até virar tabela `products`
   de verdade no Supabase, filtrada por seller_id.

   Antes, o painel do vendedor mostrava sempre os MESMOS 6 produtos do
   catálogo mock, não importa quem estivesse logado — então uma loja nova
   (criada em /vender) aparecia com o catálogo da Casa Nova. Agora cada loja
   tem seu próprio catálogo: a loja demo ('casa-nova', dona dos produtos
   seed) nasce com os produtos que já tinha; lojas novas nascem vazias, e
   publicar/importar persiste de verdade (sobrevive a reload/login/logout).
--------------------------------------------------------------------------- */

export interface SellerCatalogRow {
  id: string;
  title: string;
  category: string;
  priceCents: number;
  stock: number;
  sales: number;
  source: 'seller' | 'dropship';
  status: 'active' | 'draft';
}

const keyFor = (storeSlug: string) => `romper.seller_catalog.${storeSlug}`;

function seedFor(storeSlug: string): SellerCatalogRow[] {
  return PRODUCTS.filter((p) => p.seller.slug === storeSlug).map((p) => ({
    id: p.id,
    title: p.title,
    category: p.categoryName,
    priceCents: p.priceCents,
    stock: p.stock,
    sales: p.salesCount,
    source: p.source,
    status: 'active',
  }));
}

export function getSellerCatalog(storeSlug: string): SellerCatalogRow[] {
  if (!storeSlug) return [];
  try {
    const raw = localStorage.getItem(keyFor(storeSlug));
    if (raw) return JSON.parse(raw) as SellerCatalogRow[];
  } catch {
    // segue para o seed
  }
  const seeded = seedFor(storeSlug);
  localStorage.setItem(keyFor(storeSlug), JSON.stringify(seeded));
  return seeded;
}

export function addSellerCatalogRow(storeSlug: string, row: SellerCatalogRow): SellerCatalogRow[] {
  const next = [row, ...getSellerCatalog(storeSlug)];
  localStorage.setItem(keyFor(storeSlug), JSON.stringify(next));
  return next;
}
