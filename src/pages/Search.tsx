import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import SiteFooter from '../components/SiteFooter';
import Reveal from '../components/Reveal';
import ProductCard from '../components/ProductCard';
import { useAsync } from '../lib/useAsync';
import { searchProducts, type ProductSort } from '../lib/api';

/* ---------------------------------------------------------------------------
   ROMPER SHOP — Busca (/busca?q=)
   Usa a camada de dados (lib/api): filtro no mock agora, full-text no Postgres
   (search_vector) quando o Supabase estiver configurado.
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

export default function Search() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get('q') ?? '';

  const [term, setTerm] = useState(q);
  const [sort, setSort] = useState<ProductSort>('relevance');

  const { data: products, loading, error } = useAsync(() => searchProducts(q, sort), [q, sort]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = term.trim();
    navigate(v ? `/busca?q=${encodeURIComponent(v)}` : '/busca');
  };

  return (
    <>
      <TopBar />
      <main className="px-5 md:px-10 py-10 pb-24">
        <form onSubmit={submit} className="flex items-center gap-3 rounded-full border border-line bg-surface px-5 py-3 max-w-2xl focus-within:border-volt transition-colors">
          <span className="text-fog">⌕</span>
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Busque por moda, achadinhos, gadgets…"
            aria-label="Buscar produtos"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-fog"
          />
          <button type="submit" className="rounded-full bg-volt px-5 py-1.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
            Buscar
          </button>
        </form>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            {q ? (
              <>
                <p className="font-mono text-xs text-volt tracking-widest mb-2">RESULTADOS</p>
                <h1 className="font-display text-3xl md:text-5xl font-semibold">
                  “{q}”
                </h1>
                {products && <p className="mt-2 text-fog">{products.length} {products.length === 1 ? 'produto' : 'produtos'}</p>}
              </>
            ) : (
              <h1 className="font-display text-3xl md:text-5xl font-semibold">O que você procura?</h1>
            )}
          </div>
          {q && (
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
          )}
        </div>

        <div className="mt-10">
          {q && loading && <GridSkeleton />}

          {q && !loading && error && (
            <p className="text-fog">Não foi possível buscar agora. Tente novamente.</p>
          )}

          {q && !loading && !error && products && products.length === 0 && (
            <div className="rounded-xl2 border border-line bg-surface p-12 text-center">
              <p className="font-display text-2xl">Nada encontrado para “{q}”</p>
              <p className="mt-2 text-fog">Tente outra palavra ou explore as categorias.</p>
              <Link to="/" className="mt-6 inline-block rounded-full bg-volt px-6 py-2.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
                Ir para o início
              </Link>
            </div>
          )}

          {q && !loading && !error && products && products.length > 0 && (
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
