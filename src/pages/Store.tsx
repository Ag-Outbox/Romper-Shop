import { Link, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import SiteFooter from '../components/SiteFooter';
import Reveal from '../components/Reveal';
import ProductCard from '../components/ProductCard';
import { useAsync } from '../lib/useAsync';
import { fetchStore } from '../lib/api';

/* ---------------------------------------------------------------------------
   ROMPER SHOP — Loja pública do vendedor (/loja/:slug)
   Cabeçalho com identidade e reputação da loja + grid de produtos ativos.
   Dados via lib/api (mock agora, Supabase quando configurado).
--------------------------------------------------------------------------- */

export default function Store() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data, loading } = useAsync(() => fetchStore(slug), [slug]);

  if (loading) {
    return (
      <>
        <TopBar />
        <main className="px-5 md:px-10 py-10 pb-24">
          <div className="h-32 animate-pulse rounded-xl2 bg-line/30" />
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-xl2 bg-line/30" />
            ))}
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <TopBar />
        <main className="px-5 md:px-10 py-32 text-center">
          <p className="font-mono text-xs text-volt tracking-widest mb-4">404</p>
          <h1 className="font-display text-4xl md:text-6xl font-semibold">Loja não encontrada</h1>
          <p className="mt-5 text-fog">Esta loja não existe ou foi desativada.</p>
          <Link to="/" className="mt-8 inline-block rounded-full bg-volt px-7 py-3 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
            Voltar ao início
          </Link>
        </main>
        <SiteFooter />
      </>
    );
  }

  const { seller, products } = data;

  return (
    <>
      <TopBar />
      <main className="px-5 md:px-10 py-10 pb-24">
        {/* cabeçalho da loja */}
        <Reveal>
          <div className="flex flex-wrap items-center gap-5 rounded-xl2 border border-line bg-surface p-6 md:p-8">
            <div className="grid h-16 w-16 md:h-20 md:w-20 place-items-center rounded-full bg-volt/15 font-display text-3xl text-volt">
              {seller.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-48">
              <p className="font-mono text-xs text-volt tracking-widest mb-1">LOJA</p>
              <h1 className="font-display text-3xl md:text-5xl font-semibold">{seller.name}</h1>
            </div>
            <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div>
                <dt className="font-mono text-xs text-fog">NOTA</dt>
                <dd className="mt-1 text-volt">★ {seller.ratingAvg.toFixed(1)} <span className="text-fog">({seller.ratingCount.toLocaleString('pt-BR')})</span></dd>
              </div>
              <div>
                <dt className="font-mono text-xs text-fog">PRODUTOS</dt>
                <dd className="mt-1 text-mist">{seller.productCount}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs text-fog">VENDAS</dt>
                <dd className="mt-1 text-mist">{seller.salesCount.toLocaleString('pt-BR')}</dd>
              </div>
            </dl>
          </div>
        </Reveal>

        {/* produtos */}
        <section className="mt-10">
          <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6">Produtos da loja</h2>
          {products.length === 0 ? (
            <p className="text-fog">Esta loja ainda não publicou produtos.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i, 8) * 0.04} y={16}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
