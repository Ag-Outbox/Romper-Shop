import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Reveal from '../components/Reveal';
import SiteFooter from '../components/SiteFooter';
import ProductCard from '../components/ProductCard';
import Countdown from '../components/Countdown';
import NavTabs from '../components/NavTabs';
import RecentlyViewed from '../components/RecentlyViewed';
import { getFlashSale } from '../lib/flashSale';
import { useSmoothScroll } from '../lib/useSmoothScroll';
import { usePageMeta } from '../lib/usePageMeta';
import { useAsync } from '../lib/useAsync';
import { getRanking } from '../lib/catalog';
import { fetchAllProducts, fetchCategories, searchProducts, type ProductSort } from '../lib/api';
import type { Product } from '../lib/types';
import { useAuth, type Role } from '../lib/auth';
import { pendingActionCount } from '../lib/notifications';

const ACCOUNT_PATH: Record<Role, string> = { buyer: '/conta', seller: '/vendedor', admin: '/admin' };

/* ---------------------------------------------------------------------------
   ROMPER SHOP — Home
   Direção: vitrine clara (fundo branco) + verde-limão (volt) como assinatura.
   Hero = tese ("um lugar, tudo"), mais curto que a viewport para a Oferta
   Relâmpago já aparecer dobrando a tela — convite ao scroll, como na Shopee.
   Motion deliberado: reveal no scroll, marquee contínuo, parallax no título.
--------------------------------------------------------------------------- */

const CATEGORIES = [
  { name: 'Moda', slug: 'moda', tag: 'roupas & acessórios', count: '12.4k', span: 'md:col-span-3 md:row-span-2' },
  { name: 'Achadinhos', slug: 'achadinhos', tag: 'até R$ 29,90', count: '8.1k', span: 'md:col-span-3' },
  { name: 'Casa', slug: 'casa', tag: 'decor & utilidades', count: '5.7k', span: 'md:col-span-2' },
  { name: 'Tech', slug: 'tech', tag: 'gadgets & acessórios', count: '3.9k', span: 'md:col-span-1' },
  { name: 'Beleza', slug: 'beleza', tag: 'skincare & make', count: '4.2k', span: 'md:col-span-2' },
  { name: 'Fitness', slug: 'fitness', tag: 'treino & bem-estar', count: '2.3k', span: 'md:col-span-4' },
];

const MARQUEE = ['MODA', 'ACHADINHOS', 'CASA', 'TECH', 'BELEZA', 'FITNESS', 'PET', 'INFANTIL'];

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [term, setTerm] = useState('');
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '30%']);
  const op = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const v = term.trim();
    navigate(v ? `/busca?q=${encodeURIComponent(v)}` : '/busca');
  };

  return (
    <section ref={ref} className="relative min-h-[82svh] md:min-h-[88svh] flex flex-col justify-between px-5 pt-6 pb-10 md:px-10 overflow-hidden">
      {/* atmosfera: glows volt + monograma gigante vazado */}
      <div aria-hidden className="pointer-events-none absolute -top-1/4 -right-1/4 h-[52rem] w-[52rem] rounded-full bg-volt/[0.09] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-1/3 -left-1/4 h-[40rem] w-[40rem] rounded-full bg-volt/[0.05] blur-3xl" />
      <div
        aria-hidden
        className="pointer-events-none select-none absolute -right-16 md:right-0 top-1/2 -translate-y-1/2 font-display font-semibold leading-none text-outline text-[22rem] md:text-[36rem]"
      >
        R.
      </div>

      {/* topbar + abas principais */}
      <div className="relative">
        <nav className="flex items-center justify-between gap-4">
          <span className="font-display text-xl font-semibold tracking-tight">Romper<span className="text-volt">.</span></span>
          <NavTabs className="hidden md:block" />
          <Link
            to={user ? ACCOUNT_PATH[user.role] : '/entrar'}
            className="relative shrink-0 rounded-full border border-line px-4 py-2 text-sm hover:border-volt hover:text-volt transition-colors"
          >
            {user ? user.fullName.split(' ')[0] : 'Entrar'}
            {pendingActionCount(user) > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-ember px-1.5 min-w-5 h-5 text-xs font-semibold text-ink">
                {pendingActionCount(user)}
              </span>
            )}
          </Link>
        </nav>
        <NavTabs className="md:hidden mt-3 -mx-5 px-5 border-b border-line" />
      </div>

      {/* hero thesis */}
      <motion.div style={{ y, opacity: op }} className="relative flex-1 flex flex-col justify-center">
        <p className="font-mono text-xs md:text-sm text-volt mb-5 tracking-widest">
          <span aria-hidden className="mr-3 inline-block h-2 w-2 rounded-full bg-volt align-middle animate-pulse" />
          MARKETPLACE MULTI-CATEGORIA
        </p>
        <h1 className="font-display text-hero font-semibold text-balance">
          Um lugar.<br />
          <span className="text-fog">Tudo que</span> você<br />
          <span className="text-volt">procura.</span>
        </h1>
        <form onSubmit={search} className="mt-8 flex flex-col sm:flex-row gap-4 sm:items-center max-w-xl">
          <div className="flex-1 flex items-center rounded-full border border-line bg-surface/80 backdrop-blur px-5 py-3 transition-all duration-300 focus-within:border-volt focus-within:shadow-volt">
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-fog"
              placeholder="Busque por moda, achadinhos, gadgets…"
              aria-label="Buscar produtos"
            />
            <span className="font-mono text-xs text-fog">↵</span>
          </div>
          <button
            type="submit"
            className="rounded-full bg-volt px-7 py-3 text-sm font-semibold text-ink transition-all duration-300 ease-smooth hover:bg-volt-dim hover:shadow-volt hover:-translate-y-0.5"
          >
            Explorar
          </button>
        </form>
      </motion.div>

      {/* stat strip */}
      <div className="relative flex flex-wrap gap-x-12 gap-y-4 border-t border-line pt-6 text-sm text-fog">
        {([['36k+', 'produtos'], ['2.1k', 'vendedores'], ['COD', 'pague na entrega']] as const).map(([n, l]) => (
          <span key={l} className="flex items-baseline gap-2.5">
            <b className="font-display text-2xl md:text-3xl font-semibold text-mist tabular-nums">{n}</b>
            <span className="font-mono text-xs tracking-widest uppercase">{l}</span>
          </span>
        ))}
      </div>
    </section>
  );
}

/* Faixa invertida (escura) — momento de contraste que segura a identidade
   editorial no tema claro. */
function Marquee() {
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <div className="bg-mist overflow-hidden py-6 select-none">
      <div className="marquee-track flex whitespace-nowrap gap-8">
        {items.map((w, i) => (
          <span key={i} className="font-display text-2xl md:text-4xl font-semibold flex items-center gap-8">
            <span className={i % 2 === 0 ? 'text-ink' : 'text-outline-light'}>{w}</span>
            <span className="text-volt text-lg">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function CategoryGrid() {
  return (
    <section id="categorias" className="px-5 md:px-10 py-20 md:py-28">
      <Reveal>
        <div className="flex items-end justify-between mb-10">
          <h2 className="font-display text-4xl md:text-6xl font-semibold">Categorias</h2>
          <a href="#" className="text-sm text-fog hover:text-volt transition-colors">ver todas →</a>
        </div>
      </Reveal>
      <div className="grid grid-cols-2 md:grid-cols-6 auto-rows-[160px] md:auto-rows-[200px] gap-3">
        {CATEGORIES.map((c, i) => (
          <Reveal key={c.name} delay={i * 0.05} className={c.span}>
            <Link
              to={`/categoria/${c.slug}`}
              className="group relative flex h-full flex-col justify-between overflow-hidden rounded-xl2 border border-line card-grad p-5 transition-all duration-300 ease-smooth hover:border-volt hover:-translate-y-1 hover:shadow-lift"
            >
              {/* numeral editorial vazado — vira volt no hover */}
              <span
                aria-hidden
                className="pointer-events-none select-none absolute -bottom-4 -right-1 font-display font-semibold leading-none text-7xl md:text-8xl text-outline transition-all duration-300 group-hover:text-outline-volt"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="relative font-mono text-xs text-fog">{c.count} itens</span>
              <div className="relative">
                <h3 className="font-display text-2xl md:text-3xl font-medium group-hover:text-volt transition-colors">{c.name}</h3>
                <p className="text-sm text-fog">{c.tag}</p>
              </div>
              <span className="absolute right-5 top-5 text-volt opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">↗</span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* Logo abaixo do hero — o topo desta seção já aparece na primeira dobra,
   puxando o scroll (padrão Shopee de oferta relâmpago na entrada). */
function FlashSale() {
  const { endsAt, products } = getFlashSale();
  if (products.length === 0) return null;
  return (
    <section id="relampago" className="px-5 md:px-10 pt-10 pb-16 md:pt-12 md:pb-24 border-t border-line">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-ember tracking-widest mb-4">⚡ OFERTA RELÂMPAGO</p>
            <h2 className="font-display text-4xl md:text-6xl font-semibold text-balance">
              Preço derretendo. <span className="text-fog">Por pouco tempo.</span>
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-xl2 border border-ember/40 bg-ember/10 px-5 py-3">
              <p className="font-mono text-[10px] text-fog tracking-widest">TERMINA EM</p>
              <Countdown endsAt={endsAt} className="text-2xl text-ember" />
            </div>
            <Link to="/promocoes" className="text-sm text-fog hover:text-volt transition-colors">
              ver todas →
            </Link>
          </div>
        </div>
      </Reveal>
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p, i) => (
          <Reveal key={p.id} delay={Math.min(i, 6) * 0.05} y={16}>
            <ProductCard product={p} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* Vitrine "recomendados": catálogo inteiro com chips de categoria, busca
   rápida e ordenação — o usuário filtra sem sair da Home. */
function Recommended() {
  const [cat, setCat] = useState('');
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState<ProductSort>('relevance');
  const [items, setItems] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Debounce da busca para não consultar a cada tecla
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 350);
    return () => clearTimeout(t);
  }, [term]);

  const { data: categories } = useAsync(fetchCategories, []);
  const fetchPage = (p: number) =>
    debounced
      ? searchProducts(debounced, { sort, page: p, pageSize: 8 })
      : fetchAllProducts({ categorySlug: cat || undefined, sort, page: p, pageSize: 8 });
  const { data: firstPage, loading } = useAsync(
    () => fetchPage(1),
    [cat, debounced, sort],
  );

  useEffect(() => {
    if (!firstPage) return;
    setItems(firstPage.items);
    setHasMore(firstPage.hasMore);
    setPage(1);
  }, [firstPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = await fetchPage(page + 1);
      setItems((prev) => [...prev, ...next.items]);
      setHasMore(next.hasMore);
      setPage(page + 1);
    } finally {
      setLoadingMore(false);
    }
  };

  const chipCls = (active: boolean) =>
    `shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
      active ? 'border-volt bg-volt text-ink font-semibold' : 'border-line text-fog hover:border-volt hover:text-volt'
    }`;

  return (
    <section id="recomendados" className="px-5 md:px-10 py-20 md:py-28 border-t border-line">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="font-mono text-xs text-volt tracking-widest mb-4">PARA VOCÊ</p>
            <h2 className="font-display text-4xl md:text-6xl font-semibold">Recomendados</h2>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-fog">Ordenar:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as ProductSort)}
              className="rounded-lg border border-line bg-ink px-3 py-2 text-sm text-mist outline-none focus:border-volt transition-colors"
            >
              <option value="relevance">Relevância</option>
              <option value="price_asc">Menor preço</option>
              <option value="price_desc">Maior preço</option>
              <option value="best_selling">Mais vendidos</option>
              <option value="top_rated">Melhor avaliação</option>
            </select>
          </label>
        </div>
      </Reveal>

      {/* chips de categoria + busca rápida */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          <button onClick={() => setCat('')} className={chipCls(cat === '' && !debounced)}>Tudo</button>
          {(categories ?? []).map((c) => (
            <button key={c.slug} onClick={() => { setCat(c.slug); setTerm(''); }} className={chipCls(cat === c.slug && !debounced)}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-full border border-line bg-ink px-4 py-2 md:ml-auto md:w-64 focus-within:border-volt transition-colors">
          <span className="text-fog text-sm">⌕</span>
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar nos recomendados…"
            aria-label="Buscar produtos recomendados"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fog"
          />
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      )}

      {!loading && items.length === 0 && (
        <div className="rounded-xl2 border border-line bg-surface p-12 text-center">
          <p className="font-display text-2xl">Nada por aqui</p>
          <p className="mt-2 text-fog">Nenhum produto encontrado — tente outra categoria ou termo.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
    </section>
  );
}

function AlgorithmTeaser() {
  return (
    <section id="algoritmo" className="px-5 md:px-10 py-20 md:py-28 border-t border-line">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <Reveal>
          <div>
            <p className="font-mono text-xs text-volt tracking-widest mb-4">RANKING INTELIGENTE</p>
            <h2 className="font-display text-4xl md:text-6xl font-semibold text-balance">
              O melhor de cada categoria, no topo.
            </h2>
            <p className="mt-5 text-fog max-w-md">
              Um motor de recomendação avalia conversão, velocidade de vendas, avaliações
              e reputação do vendedor para destacar o que realmente vale a pena — atualizado
              o tempo todo.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="rounded-xl2 border border-line card-grad p-6 shadow-lift">
            <div className="flex items-center justify-between mb-5 text-xs font-mono text-fog">
              <span>EM ALTA · ACHADINHOS</span><span className="text-volt">● ao vivo</span>
            </div>
            {getRanking('achadinhos').map((p, i) => (
              <Link
                key={p.id}
                to={`/produto/${p.slug}`}
                className="group flex items-center gap-4 py-3 border-t border-line first:border-0"
              >
                <span className="font-display text-xl text-fog w-6">{i + 1}</span>
                <span className="flex-1 text-sm group-hover:text-volt transition-colors">{p.title}</span>
                <div className="w-24 h-1 rounded bg-line overflow-hidden">
                  <div className="h-full bg-volt" style={{ width: `${p.score}%` }} />
                </div>
                <span className="font-mono text-xs text-volt w-8 text-right">{p.score}</span>
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CODBand() {
  return (
    <section id="cod" className="relative mx-5 md:mx-10 my-10 overflow-hidden rounded-xl2 bg-volt text-ink p-8 md:p-14">
      {/* marca d'água gigante do símbolo COD */}
      <span
        aria-hidden
        className="pointer-events-none select-none absolute -right-10 -bottom-24 font-display leading-none text-[14rem] md:text-[22rem] text-ink/10"
      >
        ◎
      </span>
      <Reveal>
        <p className="font-mono text-xs tracking-widest mb-4">SEM CARTÃO? SEM PROBLEMA.</p>
        <h2 className="font-display text-4xl md:text-7xl font-semibold max-w-3xl text-balance">
          Pague na entrega, com toda a segurança.
        </h2>
        <p className="mt-5 max-w-lg text-ink/70">
          Cash on Delivery integrado: peça agora e pague só quando o produto chegar na sua
          porta, onde a modalidade estiver disponível.
        </p>
        <button className="mt-8 rounded-full bg-mist px-7 py-3 text-sm font-semibold text-ink transition-all duration-300 ease-smooth hover:bg-black hover:-translate-y-0.5">
          Como funciona
        </button>
      </Reveal>
    </section>
  );
}

function SellerCTA() {
  return (
    <section id="vender" className="px-5 md:px-10 py-20 md:py-28 border-t border-line">
      <Reveal>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h2 className="font-display text-4xl md:text-6xl font-semibold max-w-xl text-balance">
              Tem produto pra vender? O balcão é seu.
            </h2>
            <p className="mt-5 text-fog max-w-md">
              Cadastre sua loja, publique produtos e alcance milhares de compradores.
              Ou importe de fornecedores dropship em poucos cliques.
            </p>
            <Link to="/afiliado" className="mt-4 inline-block text-sm text-fog hover:text-volt transition-colors">
              Prefere só indicar produtos e ganhar comissão? Vire afiliado →
            </Link>
          </div>
          <div className="flex gap-4">
            <Link to="/vender" className="rounded-full bg-volt px-7 py-3 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
              Abrir loja
            </Link>
            <Link to="/vender" className="rounded-full border border-line px-7 py-3 text-sm hover:border-volt hover:text-volt transition-colors">
              Importar dropship
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export default function Home() {
  useSmoothScroll();
  usePageMeta();
  return (
    <main>
      <Hero />
      <FlashSale />
      <Marquee />
      <CategoryGrid />
      <Recommended />
      <AlgorithmTeaser />
      <CODBand />
      <RecentlyViewed />
      <SellerCTA />
      <SiteFooter />
    </main>
  );
}
