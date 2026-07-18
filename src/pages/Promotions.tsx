import { useEffect, useState } from 'react';
import TopBar from '../components/TopBar';
import SiteFooter from '../components/SiteFooter';
import Reveal from '../components/Reveal';
import ProductCard from '../components/ProductCard';
import Countdown from '../components/Countdown';
import { useAsync } from '../lib/useAsync';
import { usePageMeta } from '../lib/usePageMeta';
import { getFlashSale } from '../lib/flashSale';
import { fetchDeals } from '../lib/api';
import type { Product } from '../lib/types';

/* ---------------------------------------------------------------------------
   ROMPER SHOP — Promoções (/promocoes)
   Tudo que está com desconto real na loja, maiores descontos primeiro.
   No topo, a janela atual da Oferta Relâmpago com contagem regressiva.
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

export default function Promotions() {
  usePageMeta('Promoções');
  const { endsAt } = getFlashSale();

  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data: firstPage, loading, error } = useAsync(() => fetchDeals({ page: 1 }), []);

  useEffect(() => {
    if (!firstPage) return;
    setItems(firstPage.items);
    setTotal(firstPage.total);
    setHasMore(firstPage.hasMore);
    setPage(1);
  }, [firstPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = await fetchDeals({ page: page + 1 });
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
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-ember tracking-widest mb-2">⚡ TUDO EM PROMOÇÃO</p>
              <h1 className="font-display text-4xl md:text-6xl font-semibold">Promoções</h1>
              {!loading && <p className="mt-2 text-fog">{total} {total === 1 ? 'oferta ativa' : 'ofertas ativas'}</p>}
            </div>
            <div className="rounded-xl2 border border-ember/40 bg-ember/10 px-5 py-3">
              <p className="font-mono text-[10px] text-fog tracking-widest">RELÂMPAGO TERMINA EM</p>
              <Countdown endsAt={endsAt} className="text-2xl text-ember" />
            </div>
          </div>
        </Reveal>

        <div className="mt-10">
          {loading && <GridSkeleton />}

          {!loading && error && (
            <p className="text-fog">Não foi possível carregar as promoções. Tente novamente.</p>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="rounded-xl2 border border-line bg-surface p-12 text-center">
              <p className="font-display text-2xl">Sem promoções agora</p>
              <p className="mt-2 text-fog">Volte mais tarde — as ofertas relâmpago rotacionam ao longo do dia.</p>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((p, i) => (
                  <Reveal key={p.id} delay={Math.min(i, 8) * 0.04} y={16}>
                    <ProductCard product={p} />
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
