import { supabase, isSupabaseConfigured } from './supabase';
import {
  CATEGORIES as MOCK_CATEGORIES,
  PRODUCTS as MOCK_PRODUCTS,
  getProductBySlug as mockBySlug,
  getProductById as mockById,
  getRelated as mockRelated,
} from './catalog';
import { getReviews as mockGetReviews, addReview as mockAddReview } from './reviewsStore';
import { getSellerAccount } from './sellers';
import type { Product, ProductOptionGroup, ProductVariant, Review } from './types';

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

export async function fetchProductById(id: string): Promise<Product | undefined> {
  if (!isSupabaseConfigured || !supabase) return mockById(id);
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProduct(data as unknown as ProductRow) : undefined;
}

export async function fetchRelated(product: Product, limit = 4): Promise<Product[]> {
  if (!isSupabaseConfigured || !supabase) return mockRelated(product, limit);
  const list = await fetchProductsByCategory(product.categorySlug, 'best_selling');
  return list.filter((p) => p.id !== product.id).slice(0, limit);
}

export interface StoreInfo {
  name: string;
  slug: string;
  ratingAvg: number;
  ratingCount: number;
  productCount: number;
  salesCount: number;
}

/** Loja pública do vendedor: dados da loja + produtos ativos. */
export async function fetchStore(slug: string): Promise<{ seller: StoreInfo; products: Product[] } | undefined> {
  if (!isSupabaseConfigured || !supabase) {
    const products = MOCK_PRODUCTS.filter((p) => p.seller.slug === slug);
    if (products.length > 0) {
      const s = products[0].seller;
      return {
        seller: {
          name: s.name,
          slug: s.slug,
          ratingAvg: s.ratingAvg,
          ratingCount: s.ratingCount,
          productCount: products.length,
          salesCount: products.reduce((n, p) => n + p.salesCount, 0),
        },
        products,
      };
    }
    // Loja auto-cadastrada via /vender, ainda sem produto nenhum.
    const account = getSellerAccount(slug);
    if (!account) return undefined;
    return {
      seller: { name: account.name, slug: account.slug, ratingAvg: 0, ratingCount: 0, productCount: 0, salesCount: 0 },
      products: [],
    };
  }

  const { data: sellerRow, error } = await supabase
    .from('sellers')
    .select('id, store_name, store_slug, rating_avg, rating_count, total_sales')
    .eq('store_slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!sellerRow) return undefined;

  const { data, error: e2 } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('status', 'active')
    .eq('seller_id', sellerRow.id as string);
  if (e2) throw e2;
  const products = ((data as unknown as ProductRow[]) ?? []).map(rowToProduct);
  return {
    seller: {
      name: sellerRow.store_name as string,
      slug: sellerRow.store_slug as string,
      ratingAvg: Number(sellerRow.rating_avg),
      ratingCount: sellerRow.rating_count as number,
      productCount: products.length,
      salesCount: sellerRow.total_sales as number,
    },
    products,
  };
}

export async function searchProducts(query: string, sort: ProductSort = 'relevance'): Promise<Product[]> {
  const q = query.trim();
  if (!q) return [];

  if (!isSupabaseConfigured || !supabase) {
    const low = q.toLowerCase();
    const list = MOCK_PRODUCTS.filter(
      (p) =>
        p.title.toLowerCase().includes(low) ||
        (p.brand?.toLowerCase().includes(low) ?? false) ||
        p.categoryName.toLowerCase().includes(low) ||
        p.description.toLowerCase().includes(low),
    );
    return sortProducts(list, sort);
  }

  // Full-text no Postgres (search_vector já existe no schema, config 'portuguese').
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('status', 'active')
    .textSearch('search_vector', q, { type: 'websearch', config: 'portuguese' })
    .limit(48);
  if (error) throw error;
  const list = ((data as unknown as ProductRow[]) ?? []).map(rowToProduct);
  return sortProducts(list, sort);
}

/* ----------------------------- Avaliações ----------------------------------- */

interface ReviewRow {
  id: string;
  product_id: string;
  buyer_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified: boolean;
  created_at: string;
  buyer: { full_name: string | null } | null;
}

function reviewRowToReview(row: ReviewRow): Review {
  return {
    id: row.id,
    productId: row.product_id,
    buyerId: row.buyer_id,
    buyerName: row.buyer?.full_name ?? 'Comprador',
    rating: row.rating,
    title: row.title ?? undefined,
    body: row.body ?? undefined,
    isVerified: row.is_verified,
    createdAt: row.created_at,
  };
}

export async function fetchReviews(productId: string): Promise<Review[]> {
  if (!isSupabaseConfigured || !supabase) return mockGetReviews(productId);
  const { data, error } = await supabase
    .from('reviews')
    .select('id, product_id, buyer_id, rating, title, body, is_verified, created_at, buyer:profiles(full_name)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as unknown as ReviewRow[]) ?? []).map(reviewRowToReview);
}

export async function submitReview(input: {
  productId: string;
  buyerId: string;
  buyerName: string;
  rating: number;
  title?: string;
  body?: string;
}): Promise<Review> {
  if (!isSupabaseConfigured || !supabase) return mockAddReview(input);
  const { data, error } = await supabase
    .from('reviews')
    .insert({ product_id: input.productId, buyer_id: input.buyerId, rating: input.rating, title: input.title, body: input.body })
    .select('id, product_id, buyer_id, rating, title, body, is_verified, created_at, buyer:profiles(full_name)')
    .single();
  if (error) throw error;
  return reviewRowToReview(data as unknown as ReviewRow);
}
