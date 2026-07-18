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

/** Filtros aplicáveis a listagem de categoria e busca. */
export interface ProductFilters {
  priceMinCents?: number;
  priceMaxCents?: number;
  minRating?: number;
  codOnly?: boolean;
  discountOnly?: boolean;
  /** Uma ou mais categorias (checkbox estilo Nike na coluna de filtros). */
  categorySlugs?: string[];
}

export interface ProductQueryOptions {
  sort?: ProductSort;
  filters?: ProductFilters;
  /** Página 1-based. */
  page?: number;
  pageSize?: number;
}

export interface PagedProducts {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const DEFAULT_PAGE_SIZE = 12;

function matchesFilters(p: Product, f?: ProductFilters): boolean {
  if (!f) return true;
  if (f.priceMinCents != null && p.priceCents < f.priceMinCents) return false;
  if (f.priceMaxCents != null && p.priceCents > f.priceMaxCents) return false;
  if (f.minRating != null && p.ratingAvg < f.minRating) return false;
  if (f.codOnly && !p.codAvailable) return false;
  if (f.discountOnly && !(p.compareAtCents && p.compareAtCents > p.priceCents)) return false;
  if (f.categorySlugs && f.categorySlugs.length > 0 && !f.categorySlugs.includes(p.categorySlug)) return false;
  return true;
}

function paginate(list: Product[], page: number, pageSize: number): PagedProducts {
  const total = list.length;
  const start = (page - 1) * pageSize;
  const items = list.slice(start, start + pageSize);
  return { items, total, page, pageSize, hasMore: start + items.length < total };
}

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

export async function fetchProductsByCategory(slug: string, options: ProductQueryOptions = {}): Promise<PagedProducts> {
  const { sort = 'relevance', filters, page = 1, pageSize = DEFAULT_PAGE_SIZE } = options;

  if (!isSupabaseConfigured || !supabase) {
    const list = sortProducts(
      MOCK_PRODUCTS.filter((p) => p.categorySlug === slug && matchesFilters(p, filters)),
      sort,
    );
    return paginate(list, page, pageSize);
  }

  let q = supabase
    .from('products')
    .select(PRODUCT_SELECT, { count: 'exact' })
    .eq('status', 'active')
    .eq('categories.slug', slug);
  if (filters?.priceMinCents != null) q = q.gte('price_cents', filters.priceMinCents);
  if (filters?.priceMaxCents != null) q = q.lte('price_cents', filters.priceMaxCents);
  if (filters?.minRating != null) q = q.gte('rating_avg', filters.minRating);
  if (filters?.codOnly) q = q.eq('cod_available', true);
  // discountOnly (compare_at_cents > price_cents) compara duas colunas — o
  // query builder do supabase-js não faz isso direto; precisa de uma view
  // ou RPC no banco. Aplicamos como refinamento client-side abaixo.
  const { data, error, count } = await q.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw error;
  let list = ((data as unknown as ProductRow[]) ?? []).map(rowToProduct);
  if (filters?.discountOnly) list = list.filter((p) => matchesFilters(p, { discountOnly: true }));
  return { items: sortProducts(list, sort), total: count ?? list.length, page, pageSize, hasMore: page * pageSize < (count ?? 0) };
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
  const { items } = await fetchProductsByCategory(product.categorySlug, { sort: 'best_selling', pageSize: limit + 1 });
  return items.filter((p) => p.id !== product.id).slice(0, limit);
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

export async function searchProducts(query: string, options: ProductQueryOptions = {}): Promise<PagedProducts> {
  const { sort = 'relevance', filters, page = 1, pageSize = DEFAULT_PAGE_SIZE } = options;
  const q = query.trim();
  if (!q) return { items: [], total: 0, page, pageSize, hasMore: false };

  if (!isSupabaseConfigured || !supabase) {
    const low = q.toLowerCase();
    const list = sortProducts(
      MOCK_PRODUCTS.filter(
        (p) =>
          (p.title.toLowerCase().includes(low) ||
            (p.brand?.toLowerCase().includes(low) ?? false) ||
            p.categoryName.toLowerCase().includes(low) ||
            p.description.toLowerCase().includes(low)) &&
          matchesFilters(p, filters),
      ),
      sort,
    );
    return paginate(list, page, pageSize);
  }

  // Full-text no Postgres (search_vector já existe no schema, config 'portuguese').
  let sq = supabase
    .from('products')
    .select(PRODUCT_SELECT, { count: 'exact' })
    .eq('status', 'active')
    .textSearch('search_vector', q, { type: 'websearch', config: 'portuguese' });
  if (filters?.categorySlugs && filters.categorySlugs.length > 0) sq = sq.in('categories.slug', filters.categorySlugs);
  if (filters?.priceMinCents != null) sq = sq.gte('price_cents', filters.priceMinCents);
  if (filters?.priceMaxCents != null) sq = sq.lte('price_cents', filters.priceMaxCents);
  if (filters?.minRating != null) sq = sq.gte('rating_avg', filters.minRating);
  if (filters?.codOnly) sq = sq.eq('cod_available', true);
  const { data, error, count } = await sq.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw error;
  let list = ((data as unknown as ProductRow[]) ?? []).map(rowToProduct);
  if (filters?.discountOnly) list = list.filter((p) => matchesFilters(p, { discountOnly: true }));
  return { items: sortProducts(list, sort), total: count ?? list.length, page, pageSize, hasMore: page * pageSize < (count ?? 0) };
}

/* ----------------------- Vitrines (Home / Promoções / Em alta) -------------- */

/** Listagem geral do catálogo (todas as categorias, ou uma via `categorySlug`).
 *  Alimenta os "recomendados" da Home. */
export async function fetchAllProducts(
  options: ProductQueryOptions & { categorySlug?: string } = {},
): Promise<PagedProducts> {
  const { sort = 'relevance', filters, page = 1, pageSize = DEFAULT_PAGE_SIZE, categorySlug } = options;

  if (!isSupabaseConfigured || !supabase) {
    const list = sortProducts(
      MOCK_PRODUCTS.filter(
        (p) => (!categorySlug || p.categorySlug === categorySlug) && matchesFilters(p, filters),
      ),
      sort,
    );
    return paginate(list, page, pageSize);
  }

  let q = supabase
    .from('products')
    .select(PRODUCT_SELECT, { count: 'exact' })
    .eq('status', 'active');
  if (categorySlug) q = q.eq('categories.slug', categorySlug);
  if (filters?.categorySlugs && filters.categorySlugs.length > 0) q = q.in('categories.slug', filters.categorySlugs);
  if (filters?.priceMinCents != null) q = q.gte('price_cents', filters.priceMinCents);
  if (filters?.priceMaxCents != null) q = q.lte('price_cents', filters.priceMaxCents);
  if (filters?.minRating != null) q = q.gte('rating_avg', filters.minRating);
  if (filters?.codOnly) q = q.eq('cod_available', true);
  const { data, error, count } = await q.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw error;
  let list = ((data as unknown as ProductRow[]) ?? []).map(rowToProduct);
  if (filters?.discountOnly) list = list.filter((p) => matchesFilters(p, { discountOnly: true }));
  return { items: sortProducts(list, sort), total: count ?? list.length, page, pageSize, hasMore: page * pageSize < (count ?? 0) };
}

/** Promoções: só produtos com desconto real (compareAt > price), maiores
 *  descontos primeiro. Página /promocoes. */
export async function fetchDeals(options: ProductQueryOptions = {}): Promise<PagedProducts> {
  const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = options;
  const all = await fetchAllProducts({ ...options, page: 1, pageSize: 1000, filters: { ...options.filters, discountOnly: true } });
  const byDiscount = all.items.slice().sort((a, b) => {
    const da = (a.compareAtCents ?? a.priceCents) - a.priceCents;
    const db = (b.compareAtCents ?? b.priceCents) - b.priceCents;
    return db / (b.compareAtCents ?? 1) - da / (a.compareAtCents ?? 1);
  });
  return paginate(options.sort && options.sort !== 'relevance' ? sortProducts(byDiscount, options.sort) : byDiscount, page, pageSize);
}

/** Em alta: mais vendidos do site inteiro, em promoção ou não. Página /em-alta. */
export async function fetchTrending(options: ProductQueryOptions = {}): Promise<PagedProducts> {
  return fetchAllProducts({ ...options, sort: 'best_selling' });
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
