import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import TopBar from '../components/TopBar';
import SiteFooter from '../components/SiteFooter';
import Reveal from '../components/Reveal';
import ProductCard from '../components/ProductCard';
import SmartImage from '../components/SmartImage';
import { useAsync } from '../lib/useAsync';
import { usePageMeta } from '../lib/usePageMeta';
import { fetchProductBySlug, fetchRelated, fetchReviews, submitReview } from '../lib/api';
import { recordView } from '../lib/recentlyViewed';
import RecentlyViewed from '../components/RecentlyViewed';
import StoreBadges from '../components/StoreBadges';
import { hasVerifiedPurchase, hasReviewed, hasVotedHelpful, toggleHelpful } from '../lib/reviewsStore';
import { listQuestions, askQuestion } from '../lib/qna';
import { formatBRL, discountPercent } from '../lib/format';
import { useCart } from '../lib/useCart';
import { useFavorites } from '../lib/useFavorites';
import { useAuth } from '../lib/auth';
import { getAffiliateByProfile } from '../lib/affiliates';
import type { CartItem, Product, ProductVariant, Review } from '../lib/types';

/* ---------------------------------------------------------------------------
   ROMPER SHOP — Página de produto (/produto/:slug)
   Dados via lib/api (mock agora, Supabase quando configurado). Preços em
   centavos; formatação só na exibição. COD por produto respeitado.
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

function Gallery({ images, activeIndex, onSelect, title }: {
  images: Product['images'];
  activeIndex: number;
  onSelect: (i: number) => void;
  title: string;
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
            className={`shrink-0 h-16 w-16 md:h-20 md:w-20 rounded-lg border transition-colors ${
              i === activeIndex ? 'border-volt' : 'border-line hover:border-fog'
            }`}
          >
            <SmartImage src={im.url} alt={im.alt} label={title} className="h-full w-full rounded-lg" />
          </button>
        ))}
      </div>
      <SmartImage
        src={main.url}
        alt={main.alt}
        label={title}
        className="flex-1 rounded-xl2 border border-line aspect-square"
      />
    </div>
  );
}

function ReviewCard({ review, sellerName }: { review: Review; sellerName: string }) {
  const [count, setCount] = useState(review.helpfulCount ?? 0);
  const [voted, setVoted] = useState(() => hasVotedHelpful(review.id));
  return (
    <div className="rounded-xl2 border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Stars value={review.rating} />
          <span className="text-sm text-mist">{review.buyerName}</span>
          {review.isVerified && (
            <span className="rounded-full border border-volt/40 px-2 py-0.5 font-mono text-[10px] text-volt">compra verificada</span>
          )}
        </div>
        <span className="font-mono text-[11px] text-fog">{new Date(review.createdAt).toLocaleDateString('pt-BR')}</span>
      </div>
      {review.title && <p className="mt-3 text-sm text-mist font-medium">{review.title}</p>}
      {review.body && <p className="mt-1 text-sm text-fog leading-relaxed">{review.body}</p>}

      {review.sellerReply && (
        <div className="mt-3 rounded-lg border border-line bg-ink/40 p-3">
          <p className="font-mono text-[10px] text-volt tracking-widest">RESPOSTA DE {sellerName.toUpperCase()}</p>
          <p className="mt-1 text-sm text-fog leading-relaxed">{review.sellerReply.body}</p>
        </div>
      )}

      <button
        onClick={() => { setCount(toggleHelpful(review.id)); setVoted((v) => !v); }}
        aria-pressed={voted}
        className={`mt-3 rounded-full border px-3 py-1 text-xs transition-colors ${
          voted ? 'border-volt text-volt' : 'border-line text-fog hover:border-fog'
        }`}
      >
        Útil{count > 0 ? ` (${count})` : ''}
      </button>
    </div>
  );
}

function QnA({ productId, sellerName }: { productId: string; sellerName: string }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState(() => listQuestions(productId));
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setQuestions(listQuestions(productId));
    setSent(false);
    setBody('');
  }, [productId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !body.trim()) return;
    askQuestion(productId, user.fullName, body);
    setQuestions(listQuestions(productId));
    setBody('');
    setSent(true);
  };

  return (
    <section className="mt-16 md:mt-24 border-t border-line pt-12">
      <h2 className="font-display text-3xl md:text-4xl font-semibold mb-8">
        Perguntas e respostas {questions.length > 0 && <span className="text-fog font-sans text-lg">({questions.length})</span>}
      </h2>

      {user ? (
        <form onSubmit={submit} className="mb-8 flex min-w-0 flex-col sm:flex-row gap-3">
          <input
            value={body}
            onChange={(e) => { setBody(e.target.value); setSent(false); }}
            placeholder={`Pergunte algo para ${sellerName}…`}
            aria-label="Sua pergunta"
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-mist outline-none placeholder:text-fog/60 focus:border-volt transition-colors"
          />
          <button type="submit" disabled={!body.trim()} className="shrink-0 rounded-full bg-volt px-6 py-3 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors disabled:opacity-50">
            Perguntar
          </button>
        </form>
      ) : (
        <p className="mb-8 text-sm text-fog">
          <Link to="/entrar" className="text-volt hover:underline">Entre</Link> para perguntar ao vendedor.
        </p>
      )}
      {sent && <p className="-mt-4 mb-8 text-xs text-volt">Pergunta enviada — o vendedor responde por aqui.</p>}

      {questions.length === 0 ? (
        <p className="text-sm text-fog">Ninguém perguntou ainda. Quebre o gelo.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {questions.map((q) => (
            <div key={q.id} className="rounded-xl2 border border-line bg-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-mist"><span className="text-fog">P:</span> {q.body}</p>
                <span className="shrink-0 font-mono text-[11px] text-fog">{new Date(q.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
              <p className="mt-1 text-xs text-fog">{q.authorName}</p>
              {q.answer ? (
                <div className="mt-3 rounded-lg border border-line bg-ink/40 p-3">
                  <p className="text-sm text-fog leading-relaxed"><span className="text-volt">R:</span> {q.answer.body}</p>
                  <p className="mt-1 font-mono text-[10px] text-fog">{sellerName} · {new Date(q.answer.at).toLocaleDateString('pt-BR')}</p>
                </div>
              ) : (
                <p className="mt-3 font-mono text-[11px] text-fog">aguardando resposta do vendedor…</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Reviews({ productId, sellerName }: { productId: string; sellerName: string }) {
  const { user } = useAuth();
  const { data: reviews, loading } = useAsync(() => fetchReviews(productId), [productId]);
  const [localReviews, setLocalReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const all = [...localReviews, ...(reviews ?? [])];
  const eligible = !!user && hasVerifiedPurchase(productId) && !hasReviewed(productId, user.id) &&
    !localReviews.some((r) => r.buyerId === user.id);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const created = await submitReview({ productId, buyerId: user.id, buyerName: user.fullName, rating, title: title.trim() || undefined, body: body.trim() || undefined });
      setLocalReviews((r) => [created, ...r]);
      setShowForm(false);
      setTitle(''); setBody(''); setRating(5);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-16 md:mt-24 border-t border-line pt-12">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h2 className="font-display text-3xl md:text-4xl font-semibold">
          Avaliações {all.length > 0 && <span className="text-fog font-sans text-lg">({all.length})</span>}
        </h2>
        {eligible && !showForm && (
          <button onClick={() => setShowForm(true)} className="rounded-full border border-line px-5 py-2 text-sm hover:border-volt hover:text-volt transition-colors">
            Avaliar produto
          </button>
        )}
      </div>

      {eligible && showForm && (
        <form onSubmit={submit} className="mb-8 rounded-xl2 border border-line bg-surface p-5 flex flex-col gap-3">
          <label className="flex items-center gap-3 text-sm">
            <span className="text-fog">Sua nota:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} estrelas`}
                  className={`text-xl ${n <= rating ? 'text-volt' : 'text-line'}`}>★</button>
              ))}
            </div>
          </label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (opcional)"
            className="rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-mist outline-none placeholder:text-fog/60 focus:border-volt transition-colors" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Conte como foi sua experiência (opcional)" rows={3}
            className="rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-mist outline-none placeholder:text-fog/60 focus:border-volt transition-colors resize-none" />
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className="rounded-full bg-volt px-6 py-2.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors disabled:opacity-60">
              {busy ? 'Enviando…' : 'Enviar avaliação'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-fog hover:text-mist transition-colors">cancelar</button>
          </div>
        </form>
      )}

      {loading && <p className="text-fog text-sm">Carregando avaliações…</p>}

      {!loading && all.length === 0 && (
        <p className="text-fog text-sm">
          Este produto ainda não tem avaliações.
          {user ? '' : ' Entre e compre para ser o primeiro a avaliar.'}
        </p>
      )}

      {!loading && all.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {all.map((r) => <ReviewCard key={r.id} review={r} sellerName={sellerName} />)}
        </div>
      )}
    </section>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 pt-6">
      <div className="aspect-square animate-pulse rounded-xl2 bg-line/30" />
      <div className="space-y-4">
        <div className="h-4 w-32 animate-pulse rounded bg-line/30" />
        <div className="h-10 w-4/5 animate-pulse rounded bg-line/30" />
        <div className="h-10 w-40 animate-pulse rounded bg-line/30" />
        <div className="h-11 w-full animate-pulse rounded bg-line/30" />
        <div className="h-12 w-full animate-pulse rounded-full bg-line/30" />
      </div>
    </div>
  );
}

export default function Product() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { add } = useCart();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const { user } = useAuth();
  const affiliate = user ? getAffiliateByProfile(user.id) : undefined;

  const { data: product, loading } = useAsync(
    () => (slug ? fetchProductBySlug(slug) : Promise.resolve(undefined)),
    [slug],
  );
  const { data: related } = useAsync(
    () => (product ? fetchRelated(product, 4) : Promise.resolve([])),
    [product?.id],
  );

  // Estado de seleção (hooks sempre na mesma ordem, antes de returns).
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [imgOverride, setImgOverride] = useState<number | null>(null);

  // Reinicializa a seleção quando o produto carrega/muda.
  useEffect(() => {
    const init: Record<string, string> = {};
    product?.optionGroups.forEach((g) => {
      if (g.values.length) init[g.name] = g.values[0];
    });
    setSelected(init);
    setQty(1);
    setImgOverride(null);
    if (product) recordView(product.id);
  }, [product]);

  const variant: ProductVariant | undefined = useMemo(() => {
    if (!product || product.variants.length === 0) return undefined;
    return product.variants.find((v) =>
      Object.entries(selected).every(([k, val]) => v.options[k] === val),
    );
  }, [product, selected]);

  usePageMeta(product?.title, product ? product.description.slice(0, 155) : undefined);

  if (loading) {
    return (
      <>
        <TopBar />
        <main className="px-5 md:px-10 pb-24">
          <ProductSkeleton />
        </main>
        <SiteFooter />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <TopBar />
        <main className="px-5 md:px-10 py-32 text-center">
          <p className="font-mono text-xs text-volt tracking-widest mb-4">404</p>
          <h1 className="font-display text-4xl md:text-6xl font-semibold">Produto não encontrado</h1>
          <p className="mt-5 text-fog">O item que você procura saiu de linha ou o link está errado.</p>
          <Link to="/" className="mt-8 inline-block rounded-full bg-volt px-7 py-3 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
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
    setImgOverride(null);
  };

  return (
    <>
      <TopBar />

      <main className="px-5 md:px-10 pb-24">
        <nav className="flex flex-wrap items-center gap-2 py-6 text-sm text-fog">
          <Link to="/" className="hover:text-mist transition-colors">Início</Link>
          <span className="text-line">/</span>
          <Link to={`/categoria/${product.categorySlug}`} className="hover:text-mist transition-colors">{product.categoryName}</Link>
          <span className="text-line">/</span>
          <span className="text-mist line-clamp-1">{product.title}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14">
          <Reveal y={16}>
            <Gallery images={product.images} activeIndex={activeImg} onSelect={setImgOverride} title={product.title} />
          </Reveal>

          <div className="flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <p className="font-mono text-xs text-volt tracking-widest mb-3">
                {product.brand ? `${product.brand.toUpperCase()} · ` : ''}{product.categoryName.toUpperCase()}
              </p>
              <button
                onClick={() => toggleFavorite(product.id)}
                aria-label={isFavorite(product.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                aria-pressed={isFavorite(product.id)}
                className={`shrink-0 grid h-10 w-10 place-items-center rounded-full border transition-colors ${
                  isFavorite(product.id) ? 'border-volt bg-volt/10 text-volt' : 'border-line text-fog hover:text-volt hover:border-volt'
                }`}
              >
                <span aria-hidden className="text-lg">{isFavorite(product.id) ? '♥' : '♡'}</span>
              </button>
            </div>
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

            <div className="mt-6 flex items-end gap-3">
              <span className="font-display text-4xl md:text-5xl font-semibold">{formatBRL(unitCents)}</span>
              {product.compareAtCents && product.compareAtCents > unitCents && (
                <span className="mb-1 text-fog line-through">{formatBRL(product.compareAtCents)}</span>
              )}
              {off && <span className="mb-1.5 rounded-full bg-ember/15 px-2.5 py-1 font-mono text-xs text-ember">-{off}%</span>}
            </div>

            {product.codAvailable && (
              <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-volt/40 bg-volt/10 px-4 py-2 text-sm text-volt">
                <span aria-hidden>◎</span> Pague na entrega disponível
              </div>
            )}

            {affiliate && (
              <button
                onClick={async () => {
                  const link = `${window.location.origin}/produto/${product.slug}?ref=${affiliate.code}`;
                  await navigator.clipboard.writeText(link);
                  setToast('Link de afiliado copiado');
                  window.setTimeout(() => setToast(null), 2200);
                }}
                className="mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-fog hover:border-volt hover:text-volt transition-colors"
              >
                🔗 Copiar link de afiliado ({affiliate.commissionPercent}% de comissão)
              </button>
            )}

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
                          active ? 'border-volt bg-volt text-ink font-medium' : 'border-line text-mist hover:border-fog'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="mt-7 flex items-center gap-5">
              <div className="flex items-center rounded-full border border-line">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuir quantidade" disabled={qty <= 1}
                  className="h-11 w-11 text-lg text-fog hover:text-volt transition-colors disabled:opacity-40">−</button>
                <span className="w-10 text-center text-sm tabular-nums">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(stock, q + 1))} aria-label="Aumentar quantidade" disabled={qty >= stock}
                  className="h-11 w-11 text-lg text-fog hover:text-volt transition-colors disabled:opacity-40">+</button>
              </div>
              <span className="font-mono text-xs text-fog">{stock > 0 ? `${stock} em estoque` : 'Esgotado'}</span>
            </div>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <button onClick={addToBag} disabled={stock <= 0}
                className="flex-1 rounded-full border border-line px-7 py-3.5 text-sm font-medium hover:border-volt hover:text-volt transition-colors disabled:opacity-40">
                Adicionar à sacola
              </button>
              <button onClick={buyNow} disabled={stock <= 0}
                className="flex-1 rounded-full bg-volt px-7 py-3.5 text-sm font-semibold text-ink transition-all duration-300 ease-smooth hover:bg-volt-dim hover:shadow-volt hover:-translate-y-0.5 disabled:opacity-40">
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
                  <div className="mt-1.5">
                    <StoreBadges seller={product.seller} size="xs" />
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Link to={`/loja/${product.seller.slug}`} className="text-sm text-fog hover:text-volt transition-colors">ver loja →</Link>
                <Link
                  to={`/mensagens?loja=${product.seller.slug}&nome=${encodeURIComponent(product.seller.name)}`}
                  className="text-sm text-fog hover:text-volt transition-colors"
                >
                  💬 conversar
                </Link>
              </div>
            </div>
          </div>
        </div>

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

        <QnA productId={product.id} sellerName={product.seller.name} />
        <Reviews productId={product.id} sellerName={product.seller.name} />

        {related && related.length > 0 && (
          <section className="mt-16 md:mt-24">
            <Reveal>
              <h2 className="font-display text-3xl md:text-4xl font-semibold mb-8">Você também pode gostar</h2>
            </Reveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map((p, i) => (
                <Reveal key={p.id} delay={i * 0.05}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-volt px-6 py-3 text-sm font-semibold text-ink shadow-lg"
          >
            {toast}
            {toast === 'Adicionado à sacola' && (
              <>
                {' '}·{' '}
                <Link to="/checkout" className="underline underline-offset-2">ver sacola</Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <RecentlyViewed excludeId={product.id} />

      <SiteFooter />
    </>
  );
}
