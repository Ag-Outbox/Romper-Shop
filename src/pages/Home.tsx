import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal';
import SiteFooter from '../components/SiteFooter';
import { useSmoothScroll } from '../lib/useSmoothScroll';
import { getRanking } from '../lib/catalog';

/* ---------------------------------------------------------------------------
   ROMPER SHOP — Home
   Direção: dark editorial + verde-limão elétrico (volt) como cor de assinatura.
   Hero = tese ("um lugar, tudo"). Motion deliberado: reveal no scroll,
   marquee contínuo, parallax sutil no título. Dados são MOCK até ligar o
   Supabase (products / product_scores).
--------------------------------------------------------------------------- */

const CATEGORIES = [
  { name: 'Moda', tag: 'roupas & acessórios', count: '12.4k', span: 'md:col-span-3 md:row-span-2' },
  { name: 'Achadinhos', tag: 'até R$ 29,90', count: '8.1k', span: 'md:col-span-3' },
  { name: 'Casa', tag: 'decor & utilidades', count: '5.7k', span: 'md:col-span-2' },
  { name: 'Tech', tag: 'gadgets & acessórios', count: '3.9k', span: 'md:col-span-1' },
  { name: 'Beleza', tag: 'skincare & make', count: '4.2k', span: 'md:col-span-2' },
  { name: 'Fitness', tag: 'treino & bem-estar', count: '2.3k', span: 'md:col-span-4' },
];

const MARQUEE = ['MODA', 'ACHADINHOS', 'CASA', 'TECH', 'BELEZA', 'FITNESS', 'PET', 'INFANTIL'];

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '30%']);
  const op = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-[100svh] flex flex-col justify-between px-5 pt-6 pb-10 md:px-10">
      {/* topbar */}
      <nav className="flex items-center justify-between">
        <span className="font-display text-xl font-semibold tracking-tight">Romper<span className="text-volt">.</span></span>
        <div className="hidden md:flex items-center gap-8 text-sm text-fog">
          <a className="hover:text-mist transition-colors" href="#categorias">Categorias</a>
          <a className="hover:text-mist transition-colors" href="#algoritmo">Em alta</a>
          <a className="hover:text-mist transition-colors" href="#cod">Pague na entrega</a>
          <a className="hover:text-mist transition-colors" href="#vender">Vender</a>
        </div>
        <button className="rounded-full border border-line px-4 py-2 text-sm hover:border-volt hover:text-volt transition-colors">
          Entrar
        </button>
      </nav>

      {/* hero thesis */}
      <motion.div style={{ y, opacity: op }} className="flex-1 flex flex-col justify-center">
        <p className="font-mono text-xs md:text-sm text-volt mb-5 tracking-widest">
          MARKETPLACE MULTI-CATEGORIA
        </p>
        <h1 className="font-display text-hero font-semibold text-balance">
          Um lugar.<br />
          <span className="text-fog">Tudo que</span> você<br />
          <span className="text-volt">procura.</span>
        </h1>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 sm:items-center max-w-xl">
          <div className="flex-1 flex items-center rounded-full border border-line bg-surface px-5 py-3">
            <input
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-fog"
              placeholder="Busque por moda, achadinhos, gadgets…"
              aria-label="Buscar produtos"
            />
            <span className="font-mono text-xs text-fog">↵</span>
          </div>
          <button className="rounded-full bg-volt px-7 py-3 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
            Explorar
          </button>
        </div>
      </motion.div>

      {/* stat strip */}
      <div className="flex flex-wrap gap-x-10 gap-y-3 text-sm text-fog">
        <span><b className="text-mist">36k+</b> produtos</span>
        <span><b className="text-mist">2.1k</b> vendedores</span>
        <span><b className="text-mist">Pague na entrega</b> disponível</span>
      </div>
    </section>
  );
}

function Marquee() {
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <div className="border-y border-line overflow-hidden py-4 select-none">
      <div className="marquee-track flex whitespace-nowrap gap-8">
        {items.map((w, i) => (
          <span key={i} className="font-display text-2xl md:text-4xl font-medium text-fog flex items-center gap-8">
            {w} <span className="text-volt">✦</span>
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
          <Reveal key={c.name} delay={i * 0.05}>
            <a
              href="#"
              className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-xl2 border border-line bg-surface p-5 transition-colors hover:border-volt ${c.span}`}
            >
              <span className="font-mono text-xs text-fog">{c.count} itens</span>
              <div>
                <h3 className="font-display text-2xl md:text-3xl font-medium group-hover:text-volt transition-colors">{c.name}</h3>
                <p className="text-sm text-fog">{c.tag}</p>
              </div>
              <span className="absolute right-5 top-5 text-volt opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">↗</span>
            </a>
          </Reveal>
        ))}
      </div>
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
          <div className="rounded-xl2 border border-line bg-surface p-6">
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
    <section id="cod" className="mx-5 md:mx-10 my-10 rounded-xl2 bg-volt text-ink p-8 md:p-14">
      <Reveal>
        <p className="font-mono text-xs tracking-widest mb-4">SEM CARTÃO? SEM PROBLEMA.</p>
        <h2 className="font-display text-4xl md:text-7xl font-semibold max-w-3xl text-balance">
          Pague na entrega, com toda a segurança.
        </h2>
        <p className="mt-5 max-w-lg text-ink/70">
          Cash on Delivery integrado: peça agora e pague só quando o produto chegar na sua
          porta, onde a modalidade estiver disponível.
        </p>
        <button className="mt-8 rounded-full bg-ink px-7 py-3 text-sm font-semibold text-volt hover:bg-black transition-colors">
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
          </div>
          <div className="flex gap-4">
            <button className="rounded-full bg-volt px-7 py-3 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
              Abrir loja
            </button>
            <button className="rounded-full border border-line px-7 py-3 text-sm hover:border-volt hover:text-volt transition-colors">
              Importar dropship
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export default function Home() {
  useSmoothScroll();
  return (
    <main>
      <Hero />
      <Marquee />
      <CategoryGrid />
      <AlgorithmTeaser />
      <CODBand />
      <SellerCTA />
      <SiteFooter />
    </main>
  );
}
