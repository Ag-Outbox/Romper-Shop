import { Link, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import SiteFooter from '../components/SiteFooter';
import Reveal from '../components/Reveal';
import ProductCard from '../components/ProductCard';
import { useAsync } from '../lib/useAsync';
import { usePageMeta } from '../lib/usePageMeta';
import { fetchStore } from '../lib/api';
import { getStoreProfile, BANNER_COLORS } from '../lib/storeProfile';
import StoreBadges from '../components/StoreBadges';
import { formatBRL } from '../lib/format';

/* ---------------------------------------------------------------------------
   ROMPER SHOP — Loja pública do vendedor (/loja/:slug)
   Cabeçalho com identidade e reputação da loja + grid de produtos ativos.
   Dados via lib/api (mock agora, Supabase quando configurado).
--------------------------------------------------------------------------- */

export default function Store() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data, loading } = useAsync(() => fetchStore(slug), [slug]);
  usePageMeta(data?.seller.name);

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
  const profile = getStoreProfile(slug);
  const bannerCls = BANNER_COLORS.find((c) => c.id === profile?.bannerColor)?.cls ?? 'bg-surface';

  return (
    <>
      <TopBar />
      <main className="px-5 md:px-10 py-10 pb-24">
        {/* cabeçalho da loja */}
        <Reveal>
          <div className={`flex flex-wrap items-center gap-5 rounded-xl2 border border-line p-6 md:p-8 ${bannerCls}`}>
            <div className="grid h-16 w-16 md:h-20 md:w-20 place-items-center rounded-full bg-volt/15 font-display text-3xl text-volt">
              {seller.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-48">
              <p className="font-mono text-xs text-volt tracking-widest mb-1">LOJA</p>
              <h1 className="font-display text-3xl md:text-5xl font-semibold">{seller.name}</h1>
              {profile?.tagline && <p className="mt-1 text-fog">{profile.tagline}</p>}
              <div className="mt-2">
                <StoreBadges seller={{ slug, ratingAvg: seller.ratingAvg, ratingCount: seller.ratingCount }} />
              </div>
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

        {/* sobre + políticas (perfil editável do vendedor) */}
        {profile && (profile.description || profile.returnsPolicy) && (
          <Reveal delay={0.05}>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
              {profile.description && (
                <div className="rounded-xl2 border border-line bg-surface p-5">
                  <p className="font-mono text-xs text-fog tracking-widest mb-2">SOBRE A LOJA</p>
                  <p className="text-sm text-fog leading-relaxed">{profile.description}</p>
                </div>
              )}
              <div className="rounded-xl2 border border-line bg-surface p-5 text-sm">
                <p className="font-mono text-xs text-fog tracking-widest mb-2">COMO A LOJA TRABALHA</p>
                <ul className="space-y-1.5 text-fog">
                  <li>📦 Posta em até <b className="text-mist">{profile.shippingDays}</b> {profile.shippingDays === 1 ? 'dia útil' : 'dias úteis'}</li>
                  {profile.freeShippingOverCents && (
                    <li>🚚 Frete grátis acima de <b className="text-mist">{formatBRL(profile.freeShippingOverCents)}</b></li>
                  )}
                  {profile.returnsPolicy && <li>↩️ {profile.returnsPolicy}</li>}
                </ul>
                <Link
                  to={`/mensagens?loja=${slug}&nome=${encodeURIComponent(seller.name)}`}
                  className="mt-3 inline-block rounded-full border border-line px-4 py-2 text-xs hover:border-volt hover:text-volt transition-colors"
                >
                  💬 Conversar com a loja
                </Link>
              </div>
            </div>
          </Reveal>
        )}

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
