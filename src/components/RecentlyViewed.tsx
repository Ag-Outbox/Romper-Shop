import ProductCard from './ProductCard';
import Reveal from './Reveal';
import { listRecentIds } from '../lib/recentlyViewed';
import { fetchProductById } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { Product } from '../lib/types';

/** Fileira "vistos recentemente" — só aparece se houver histórico. */
export default function RecentlyViewed({ excludeId, limit = 4 }: { excludeId?: string; limit?: number }) {
  const ids = listRecentIds(excludeId).slice(0, limit);
  const { data: products } = useAsync(async () => {
    const list = await Promise.all(ids.map(fetchProductById));
    return list.filter((p): p is Product => !!p);
  }, [ids.join(',')]);

  if (!products || products.length === 0) return null;

  return (
    <section className="px-5 md:px-10 py-14 border-t border-line">
      <Reveal>
        <p className="font-mono text-xs text-fog tracking-widest mb-6">VISTOS RECENTEMENTE</p>
      </Reveal>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((p, i) => (
          <Reveal key={p.id} delay={Math.min(i, 6) * 0.05} y={16}>
            <ProductCard product={p} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
