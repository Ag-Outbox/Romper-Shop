import { supabase, isSupabaseConfigured } from './supabase';
import {
  CATEGORIES as MOCK_CATEGORIES,
  PRODUCTS as MOCK_PRODUCTS,
  getProductBySlug as mockBySlug,
  getRelated as mockRelated,
} from './catalog';
import type { Product, ProductOptionGroup, ProductVariant } from './types';

/* ---------------------------------------------------------------------------
   CAMADA DE DADOS — uma API para o app inteiro.
   Se o Supabase estiver configurado (lib/supabase), faz as queries reais;
   senão, resolve com o catálogo mock (lib/catalog). Os componentes não sabem
   de onde vêm os dados — trocar de mock para real é só preencher o .env.
--------------------------------------------------------------------------- */

export interface Category {
  name: string;
  slug: string;
}

export type ProductSort = 'relevance' | 'price_asc' | 'price_desc' | 'best_selling' | 'top_rated';

/* ----------------------------- Mapeamento DB -> Product --------------------- */

interface VariantRow {
  id: string;
  name: string;
  options: Record<string, string> | null;
  price_cents: number | null;
  stock: number;
  image_url: string | null;
}
interface ImageRow {
  url: string;
  alt: string | null;
  position: number;
}
interface ProductRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  brand: string | null;
  source: 'seller' | 'dropship';
  price_cents: number;
  compare_at_cents: number | null;
  currency: string;
  stock: number;
  cod_available: boolean;
  cod_max_cents: number | null;
  rating_avg: number;
  rating_count: number;
  sales_count: number;
  category: { name: string; slug: string } | null;
  seller: { store_name: string; store_slug: string; rating_avg: number; rating_count: number } | null;
  images: ImageRow[] | null;
  variants: VariantRow[] | null;
}

const PRODUCT_SELECT = `
  id, slug, title, description, brand, source, price_cents, compare_at_cents, currency,
  stock, cod_available, cod_max_cents, rating_avg, rating_count, sales_count,
  category:categories!inner ( name, slug ),
  seller:sellers ( store_name, store_slug, rating_avg, rating_count ),
  images:product_images ( url, alt, position ),
  variants:product_variants ( id, name, options, price_cents, stock, image_url )
`;

function buildOptionGroups(variants: VariantRow[]): ProductOptionGroup[] {
  const groups = new Map<string, string[]>();
  for (const v of variants) {
    for (const [k, val] of Object.entries(v.options ?? {})) {
      const arr = groups.get(k) ?? [];
      if (!arr.includes(val)) arr.push(val);
      groups.set(k, arr);
    }
  }
  return [...groups.entries()].map(([name, values]) => ({ name, values }));
}

function rowToProduct(row: ProductRow): Product {
  const images = (row.images ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((im) => ({ url: im.url, alt: im.alt ?? row.title }));
  const rawVariants = row.variants ?? [];
  const variants: ProductVariant[] = rawVariants.map((v) => ({
    id: v.id,
    name: v.name,
    options: v.options ?? {},
    priceCents: v.price_cents ?? undefined,
    stock: v.stock,
    imageIndex: v.image_url ? images.findIndex((im) => im.url === v.image_url) : undefined,
  }));
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? '',
    brand: row.brand ?? undefined,
    categoryName: row.category?.name ?? '—',
    categorySlug: row.category?.slug ?? '',
    source: row.source,
    priceCents: row.price_cents,
    compareAtCents: row.compare_at_cents ?? undefined,
    currency: row.currency,
    stock: row.stock,
    codAvailable: row.cod_available,
    codMaxCents: row.cod_max_cents ?? undefined,
    ratingAvg: Number(row.rating_avg),
    ratingCount: row.rating_count,
    salesCount: row.sales_count,
    images,
    optionGroups: buildOptionGroups(rawVariants),
    variants,
    seller: {
      name: row.seller?.store_name ?? 'Loja',
      slug: row.seller?.store_slug ?? '',
      ratingAvg: Number(row.seller?.rating_avg ?? 0),
      ratingCount: row.seller?.rating_count ?? 0,
    },
  };
}

/* ----------------------------- Ordenação ----------------------------------- */

function sortProducts(list: Product[], sort: ProductSort): Product[] {
  const arr = list.slice();
  switch (sort) {
    case 'price_asc': return arr.sort((a, b) => a.priceCents - b.priceCents);
    case 'price_desc': return arr.sort((a, b) => b.priceCents - a.priceCents);
    case 'best_selling': return arr.sort((a, b) => b.salesCount - a.salesCount);
    case 'top_rated': return arr.sort((a, b) => b.ratingAvg - a.ratingAvg);
    default: return arr;
  }
}

/* ----------------------------- API pública --------------------------------- */

export async function fetchCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured || !supabase) return MOCK_CATEGORIES;
  const { data, error } = await supabase
    .from('categories')
    .select('name, slug')
    .eq('is_active', true)
    .order('position');
  if (error) throw error;
  return (data as Category[]) ?? [];
}

export async function fetchProductBySlug(slug: string): Promise<Product | undefined> {
  if (!isSupabaseConfigured || !supabase) return mockBySlug(slug);
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProduct(data as unknown as ProductRow) : undefined;
}

export async function fetchProductsByCategory(slug: string, sort: ProductSort = 'relevance'): Promise<Product[]> {
  if (!isSupabaseConfigured || !supabase) {
    const list = MOCK_PRODUCTS.filter((p) => p.categorySlug === slug);
    return sortProducts(list, sort);
  }
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('status', 'active')
    .eq('categories.slug', slug);
  if (error) throw error;
  const list = ((data as unknown as ProductRow[]) ?? []).map(rowToProduct);
  return sortProducts(list, sort);
}

export async function fetchRelated(product: Product, limit = 4): Promise<Product[]> {
  if (!isSupabaseConfigured || !supabase) return mockRelated(product, limit);
  const list = await fetchProductsByCategory(product.categorySlug, 'best_selling');
  return list.filter((p) => p.id !== product.id).slice(0, limit);
}
