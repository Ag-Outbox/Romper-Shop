import { useEffect, useState } from 'react';
import TopBar from '../components/TopBar';
import SiteFooter from '../components/SiteFooter';
import Reveal from '../components/Reveal';
import ProductCard from '../components/ProductCard';
import { useAsync } from '../lib/useAsync';
import { usePageMeta } from '../lib/usePageMeta';
import { fetchTrending } from '../lib/api';
import type { Product } from '../lib/types';

/* ---------------------------------------------------------------------------
   ROMPER SHOP — Em alta (/em-alta)
   Os produtos que mais vendem no site inteiro, em promoção ou não.
   Cada card ganha o número da posição no ranking.
--------------------------------------------------------------------------- */

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
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

export default function Trending() {
  usePageMeta('Em alta');

  const [items, setItems] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data: firstPage, loading, error } = useAsync(() => fetchTrending({ page: 1 }), []);

  useEffect(() => {
    if (!firstPage) return;
    setItems(firstPage.items);
    setHasMore(firstPage.hasMore);
    setPage(1);
  }, [firstPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = await fetchTrending({ page: page + 1 });
      setItems((prev) => [...prev, ...next.items]);
      setHasMore(next.hasMore);
      setPage(page + 1);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      <TopBar />
      <main className="px-5 md:px-10 py-10 pb-24">
        <Reveal>
          <p className="font-mono text-xs text-volt tracking-widest mb-2">🔥 MAIS VENDIDOS AGORA</p>
          <h1 className="font-display text-4xl md:text-6xl font-semibold">Em alta</h1>
          <p className="mt-2 text-fog max-w-lg">
            O ranking do que mais está saindo na loja — em promoção ou não, atualizado o tempo todo.
          </p>
        </Reveal>

        <div className="mt-10">
          {loading && <GridSkeleton />}

          {!loading && error && (
            <p className="text-fog">Não foi possível carregar o ranking. Tente novamente.</p>
          )}

          {!loading && !error && items.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((p, i) => (
                  <Reveal key={p.id} delay={Math.min(i, 8) * 0.04} y={16}>
                    <div className="relative">
                      <span className="absolute -left-2 -top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-mist font-display text-sm font-semibold text-ink shadow-lift">
                        {i + 1}
                      </span>
                      <ProductCard product={p} />
                    </div>
                  </Reveal>
                ))}
              </div>
              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="rounded-full border border-line px-7 py-3 text-sm hover:border-volt hover:text-volt transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? 'Carregando…' : 'Carregar mais'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
