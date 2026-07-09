import { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import TopBar from '../components/TopBar';
import SiteFooter from '../components/SiteFooter';
import Reveal from '../components/Reveal';
import { getProductBySlug, getRelated } from '../lib/catalog';
import { formatBRL, discountPercent } from '../lib/format';
import { useCart } from '../lib/useCart';
import type { CartItem, Product, ProductVariant } from '../lib/types';

/* ---------------------------------------------------------------------------
   ROMPER SHOP — Página de produto (/produto/:slug)
   Dados vêm do catálogo mock (lib/catalog) até o Supabase estar ligado.
   Preços em centavos; formatação só na exibição. COD por produto respeitado.
--------------------------------------------------------------------------- */

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span aria-hidden className="text-volt tracking-tight">
      {'★'.repeat(full)}
      <span className="text-line">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

function Gallery({ images, activeIndex, onSelect }: {
  images: Product['images'];
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  const main = images[activeIndex] ?? images[0];
  return (
    <div className="flex flex-col-reverse md:flex-row gap-4">
      <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible">
        {images.map((im, i) => (
          <button
            key={im.url}
            onClick={() => onSelect(i)}
            aria-label={`Ver imagem ${i + 1}`}
            aria-current={i === activeIndex}
            className={`shrink-0 h-16 w-16 md:h-20 md:w-20 overflow-hidden rounded-lg border bg-surface transition-colors ${
              i === activeIndex ? 'border-volt' : 'border-line hover:border-fog'
            }`}
          >
            <img src={im.url} alt={im.alt} loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden rounded-xl2 border border-line bg-surface aspect-square">
        <img
          src={main.url}
          alt={main.alt}
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}

function RelatedCard({ product }: { product: Product }) {
  const off = discountPercent(product.priceCents, product.compareAtCents);
  return (
    <Link
      to={`/produto/${product.slug}`}
      className="group rounded-xl2 border border-line bg-surface overflow-hidden transition-colors hover:border-volt"
    >
      <div className="aspect-square overflow-hidden bg-ink">
        <img
          src={product.images[0].url}
          alt={product.images[0].alt}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <p className="text-sm text-mist line-clamp-1 group-hover:text-volt transition-colors">{product.title}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="font-display text-lg">{formatBRL(product.priceCents)}</span>
          {off && <span className="font-mono text-xs text-ember">-{off}%</span>}
        </div>
      </div>
    </Link>
  );
}

export default function Product() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { add } = useCart();
  const product = slug ? getProductBySlug(slug) : undefined;

  // Estado de seleção (hooks antes de qualquer return condicional)
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    product?.optionGroups.forEach((g) => {
      if (g.values.length) init[g.name] = g.values[0];
    });
    return init;
  });
  const [qty, setQty] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [imgOverride, setImgOverride] = useState<number | null>(null);

  // Variação que casa com todas as opções escolhidas.
  const variant: ProductVariant | undefined = useMemo(() => {
    if (!product || product.variants.length === 0) return undefined;
    return product.variants.find((v) =>
      Object.entries(selected).every(([k, val]) => v.options[k] === val),
    );
  }, [product, selected]);

  if (!product) {
    return (
      <>
        <TopBar />
        <main className="px-5 md:px-10 py-32 text-center">
          <p className="font-mono text-xs text-volt tracking-widest mb-4">404</p>
          <h1 className="font-display text-4xl md:text-6xl font-semibold">Produto não encontrado</h1>
          <p className="mt-5 text-fog">O item que você procura saiu de linha ou o link está errado.</p>
          <Link
            to="/"
            className="mt-8 inline-block rounded-full bg-volt px-7 py-3 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors"
          >
            Voltar ao início
          </Link>
        </main>
        <SiteFooter />
      </>
    );
  }

  const unitCents = variant?.priceCents ?? product.priceCents;
  const off = discountPercent(unitCents, product.compareAtCents);
  const stock = variant?.stock ?? product.stock;
  const activeImg = imgOverride ?? variant?.imageIndex ?? 0;
  const codEligible = product.codAvailable && (!product.codMaxCents || unitCents * qty <= product.codMaxCents);
  const related = getRelated(product);

  const buildCartItem = (): CartItem => ({
    productId: product.id,
    slug: product.slug,
    title: product.title,
    image: product.images[0].url,
    unitCents,
    qty,
    variantId: variant?.id,
    variantName: variant?.name,
    codAvailable: product.codAvailable,
    sellerSlug: product.seller.slug,
    sellerName: product.seller.name,
  });

  const addToBag = () => {
    add(buildCartItem());
    setToast('Adicionado à sacola');
    window.clearTimeout((addToBag as unknown as { t?: number }).t);
    (addToBag as unknown as { t?: number }).t = window.setTimeout(() => setToast(null), 2200);
  };

  const buyNow = () => {
    add(buildCartItem());
    navigate('/checkout');
  };

  const pickOption = (group: string, value: string) => {
    setSelected((s) => ({ ...s, [group]: value }));
    setImgOverride(null); // deixa a imagem seguir a variação
  };

  return (
    <>
      <TopBar />

      <main className="px-5 md:px-10 pb-24">
        {/* breadcrumb */}
        <nav className="flex flex-wrap items-center gap-2 py-6 text-sm text-fog">
          <Link to="/" className="hover:text-mist transition-colors">Início</Link>
          <span className="text-line">/</span>
          <Link to={`/#categorias`} className="hover:text-mist transition-colors">{product.categoryName}</Link>
          <span className="text-line">/</span>
          <span className="text-mist line-clamp-1">{product.title}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14">
          {/* galeria */}
          <Reveal y={16}>
            <Gallery images={product.images} activeIndex={activeImg} onSelect={setImgOverride} />
          </Reveal>

          {/* info */}
          <div className="flex flex-col">
            <p className="font-mono text-xs text-volt tracking-widest mb-3">
              {product.brand ? `${product.brand.toUpperCase()} · ` : ''}{product.categoryName.toUpperCase()}
            </p>
            <h1 className="font-display text-3xl md:text-5xl font-semibold text-balance">{product.title}</h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="flex items-center gap-2">
                <Stars value={product.ratingAvg} />
                <span className="text-mist">{product.ratingAvg.toFixed(1)}</span>
                <span className="text-fog">({product.ratingCount.toLocaleString('pt-BR')})</span>
              </span>
              <span className="text-line">•</span>
              <span className="text-fog">{product.salesCount.toLocaleString('pt-BR')} vendidos</span>
            </div>

            {/* preço */}
            <div className="mt-6 flex items-end gap-3">
              <span className="font-display text-4xl md:text-5xl font-semibold">{formatBRL(unitCents)}</span>
              {product.compareAtCents && product.compareAtCents > unitCents && (
                <span className="mb-1 text-fog line-through">{formatBRL(product.compareAtCents)}</span>
              )}
              {off && (
                <span className="mb-1.5 rounded-full bg-ember/15 px-2.5 py-1 font-mono text-xs text-ember">-{off}%</span>
              )}
            </div>

            {/* badge COD */}
            {product.codAvailable && (
              <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-volt/40 bg-volt/10 px-4 py-2 text-sm text-volt">
                <span aria-hidden>◎</span> Pague na entrega disponível
              </div>
            )}

            {/* seletor de variação */}
            {product.optionGroups.map((g) => (
              <div key={g.name} className="mt-7">
                <div className="mb-3 flex items-center gap-2 text-sm">
                  <span className="text-fog">{g.name}:</span>
                  <span className="text-mist">{selected[g.name]}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {g.values.map((val) => {
                    const active = selected[g.name] === val;
                    return (
                      <button
                        key={val}
                        onClick={() => pickOption(g.name, val)}
                        aria-pressed={active}
                        className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                          active
                            ? 'border-volt bg-volt text-ink font-medium'
                            : 'border-line text-mist hover:border-fog'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* quantidade + estoque */}
            <div className="mt-7 flex items-center gap-5">
              <div className="flex items-center rounded-full border border-line">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Diminuir quantidade"
                  className="h-11 w-11 text-lg text-fog hover:text-volt transition-colors disabled:opacity-40"
                  disabled={qty <= 1}
                >
                  −
                </button>
                <span className="w-10 text-center text-sm tabular-nums">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(stock, q + 1))}
                  aria-label="Aumentar quantidade"
                  className="h-11 w-11 text-lg text-fog hover:text-volt transition-colors disabled:opacity-40"
                  disabled={qty >= stock}
                >
                  +
                </button>
              </div>
              <span className="font-mono text-xs text-fog">
                {stock > 0 ? `${stock} em estoque` : 'Esgotado'}
              </span>
            </div>

            {/* ações */}
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <button
                onClick={addToBag}
                disabled={stock <= 0}
                className="flex-1 rounded-full border border-line px-7 py-3.5 text-sm font-medium hover:border-volt hover:text-volt transition-colors disabled:opacity-40"
              >
                Adicionar à sacola
              </button>
              <button
                onClick={buyNow}
                disabled={stock <= 0}
                className="flex-1 rounded-full bg-volt px-7 py-3.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors disabled:opacity-40"
              >
                Comprar agora
              </button>
            </div>
            {product.codAvailable && (
              <p className="mt-3 text-xs text-fog">
                {codEligible
                  ? 'Este pedido é elegível para pagamento na entrega (COD).'
                  : 'Acima do limite para pagamento na entrega neste pedido.'}
              </p>
            )}

            {/* vendedor */}
            <div className="mt-8 flex items-center justify-between rounded-xl2 border border-line bg-surface p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-volt/15 font-display text-volt">
                  {product.seller.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm text-mist">{product.seller.name}</p>
                  <p className="text-xs text-fog">
                    ★ {product.seller.ratingAvg.toFixed(1)} · {product.seller.ratingCount.toLocaleString('pt-BR')} avaliações
                  </p>
                </div>
              </div>
              <a href="#" className="text-sm text-fog hover:text-volt transition-colors">ver loja →</a>
            </div>
          </div>
        </div>

        {/* descrição */}
        <section className="mt-16 md:mt-24 grid md:grid-cols-2 gap-10 border-t border-line pt-12">
          <Reveal>
            <div>
              <p className="font-mono text-xs text-volt tracking-widest mb-4">DESCRIÇÃO</p>
              <p className="text-fog leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl2 border border-line bg-line">
              {[
                ['Marca', product.brand ?? '—'],
                ['Categoria', product.categoryName],
                ['Origem', product.source === 'dropship' ? 'Dropshipping' : 'Vendedor'],
                ['Avaliação', `${product.ratingAvg.toFixed(1)} / 5`],
                ['Vendidos', product.salesCount.toLocaleString('pt-BR')],
                ['Pague na entrega', product.codAvailable ? 'Sim' : 'Não'],
              ].map(([k, v]) => (
                <div key={k} className="bg-surface p-4">
                  <dt className="font-mono text-xs text-fog">{k}</dt>
                  <dd className="mt-1 text-sm text-mist">{v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </section>

        {/* relacionados */}
        {related.length > 0 && (
          <section className="mt-16 md:mt-24">
            <Reveal>
              <h2 className="font-display text-3xl md:text-4xl font-semibold mb-8">Você também pode gostar</h2>
            </Reveal>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {related.map((p, i) => (
                <Reveal key={p.id} delay={i * 0.05}>
                  <RelatedCard product={p} />
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-volt px-6 py-3 text-sm font-semibold text-ink shadow-lg"
          >
            {toast} ·{' '}
            <Link to="/checkout" className="underline underline-offset-2">ver sacola</Link>
          </motion.div>
        )}
      </AnimatePresence>

      <SiteFooter />
    </>
  );
}
