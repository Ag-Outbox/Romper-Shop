import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import SiteFooter from '../components/SiteFooter';
import Reveal from '../components/Reveal';
import ProductCard from '../components/ProductCard';
import { useAsync } from '../lib/useAsync';
import { fetchProductsByCategory, fetchCategories, type ProductSort } from '../lib/api';

/* ---------------------------------------------------------------------------
   ROMPER SHOP — Listagem de categoria (/categoria/:slug)
   Dados via lib/api (mock agora, Supabase quando configurado). Ordenação no
   cliente sobre o resultado. Cards levam à página de produto.
--------------------------------------------------------------------------- */

const SORTS: Array<{ value: ProductSort; label: string }> = [
  { value: 'relevance', label: 'Relevância' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'best_selling', label: 'Mais vendidos' },
  { value: 'top_rated', label: 'Melhor avaliação' },
];

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl2 border border-line bg-surface overflow-hidden">
          <div className="aspect-square animate-pulse bg-line/40" />
          <div className="p-4 space-y-2">
            <div className="h-3 w-4/5 animate-pulse rounded bg-line/40" />
            <div className="h-3 w-2/5 animate-pulse rounded bg-line/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Category() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [sort, setSort] = useState<ProductSort>('relevance');

  const { data: categories } = useAsync(fetchCategories, []);
  const { data: products, loading, error } = useAsync(() => fetchProductsByCategory(slug, sort), [slug, sort]);

  const categoryName = categories?.find((c) => c.slug === slug)?.name ?? slug;

  return (
    <>
      <TopBar />
      <main className="px-5 md:px-10 py-10 pb-24">
        <nav className="flex items-center gap-2 text-sm text-fog">
          <Link to="/" className="hover:text-mist transition-colors">Início</Link>
          <span className="text-line">/</span>
          <span className="text-mist capitalize">{categoryName}</span>
        </nav>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-volt tracking-widest mb-2">CATEGORIA</p>
            <h1 className="font-display text-4xl md:text-6xl font-semibold capitalize">{categoryName}</h1>
            {products && (
              <p className="mt-2 text-fog">{products.length} {products.length === 1 ? 'produto' : 'produtos'}</p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-fog">Ordenar:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as ProductSort)}
              className="rounded-lg border border-line bg-ink px-3 py-2 text-sm text-mist outline-none focus:border-volt transition-colors"
            >
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-10">
          {loading && <GridSkeleton />}

          {!loading && error && (
            <p className="text-fog">Não foi possível carregar os produtos. Tente novamente.</p>
          )}

          {!loading && !error && products && products.length === 0 && (
            <div className="rounded-xl2 border border-line bg-surface p-12 text-center">
              <p className="font-display text-2xl">Nada por aqui ainda</p>
              <p className="mt-2 text-fog">Esta categoria ainda não tem produtos publicados.</p>
              <Link to="/" className="mt-6 inline-block rounded-full bg-volt px-6 py-2.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
                Explorar outras
              </Link>
            </div>
          )}

          {!loading && !error && products && products.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i, 8) * 0.04} y={16}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
