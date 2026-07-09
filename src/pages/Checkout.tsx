import { useState } from 'react';
import { Link } from 'react-router-dom';
import TopBar from '../components/TopBar';
import SiteFooter from '../components/SiteFooter';
import { useCart, lineKey } from '../lib/useCart';
import { formatBRL } from '../lib/format';
import type { CartItem } from '../lib/types';

/* ---------------------------------------------------------------------------
   ROMPER SHOP — Sacola / Checkout (/checkout)
   Já exibe o carrinho agrupado por vendedor (cada grupo vira um sub_order no
   backend). As abas de pagamento Online/COD estão preparadas visualmente —
   o processamento é o PRÓXIMO passo (Edge Functions + provedor de pagamento).
--------------------------------------------------------------------------- */

type PayTab = 'online' | 'cod';

function groupBySeller(items: CartItem[]): Array<{ sellerName: string; sellerSlug: string; items: CartItem[] }> {
  const map = new Map<string, { sellerName: string; sellerSlug: string; items: CartItem[] }>();
  for (const it of items) {
    const g = map.get(it.sellerSlug) ?? { sellerName: it.sellerName, sellerSlug: it.sellerSlug, items: [] };
    g.items.push(it);
    map.set(it.sellerSlug, g);
  }
  return [...map.values()];
}

export default function Checkout() {
  const { items, setQty, remove, subtotalCents, count } = useCart();
  const [tab, setTab] = useState<PayTab>('online');

  const groups = groupBySeller(items);
  const codEligibleAll = items.length > 0 && items.every((i) => i.codAvailable);
  const shippingCents = subtotalCents > 0 && subtotalCents < 19900 ? 1490 : 0;
  const totalCents = subtotalCents + shippingCents;

  if (items.length === 0) {
    return (
      <>
        <TopBar />
        <main className="px-5 md:px-10 py-32 text-center">
          <p className="font-mono text-xs text-volt tracking-widest mb-4">SACOLA</p>
          <h1 className="font-display text-4xl md:text-6xl font-semibold">Sua sacola está vazia</h1>
          <p className="mt-5 text-fog">Explore as categorias e adicione o que curtir.</p>
          <Link
            to="/"
            className="mt-8 inline-block rounded-full bg-volt px-7 py-3 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors"
          >
            Começar a explorar
          </Link>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <TopBar />
      <main className="px-5 md:px-10 py-10 pb-24">
        <h1 className="font-display text-4xl md:text-6xl font-semibold">Sacola</h1>
        <p className="mt-2 text-fog">{count} {count === 1 ? 'item' : 'itens'} · {groups.length} {groups.length === 1 ? 'vendedor' : 'vendedores'}</p>

        <div className="mt-10 grid lg:grid-cols-[1fr_360px] gap-10 items-start">
          {/* itens agrupados por vendedor (sub_orders) */}
          <div className="flex flex-col gap-6">
            {groups.map((g) => (
              <div key={g.sellerSlug} className="rounded-xl2 border border-line bg-surface overflow-hidden">
                <div className="flex items-center gap-2 border-b border-line px-5 py-3 text-sm">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-volt/15 font-display text-xs text-volt">
                    {g.sellerName.charAt(0)}
                  </span>
                  <span className="text-mist">{g.sellerName}</span>
                  <span className="font-mono text-xs text-fog">· sub-pedido</span>
                </div>

                {g.items.map((it) => {
                  const key = lineKey(it);
                  return (
                    <div key={key} className="flex gap-4 p-5 border-b border-line last:border-0">
                      <Link to={`/produto/${it.slug}`} className="shrink-0">
                        <img src={it.image} alt={it.title} className="h-20 w-20 rounded-lg border border-line object-cover" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/produto/${it.slug}`} className="text-sm text-mist hover:text-volt transition-colors line-clamp-2">
                          {it.title}
                        </Link>
                        {it.variantName && <p className="mt-1 text-xs text-fog">{it.variantName}</p>}
                        {it.codAvailable && <p className="mt-1 font-mono text-xs text-volt">◎ aceita COD</p>}

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex items-center rounded-full border border-line">
                            <button
                              onClick={() => setQty(key, it.qty - 1)}
                              aria-label="Diminuir"
                              className="h-8 w-8 text-fog hover:text-volt transition-colors disabled:opacity-40"
                              disabled={it.qty <= 1}
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-sm tabular-nums">{it.qty}</span>
                            <button
                              onClick={() => setQty(key, it.qty + 1)}
                              aria-label="Aumentar"
                              className="h-8 w-8 text-fog hover:text-volt transition-colors"
                            >
                              +
                            </button>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-display text-lg">{formatBRL(it.unitCents * it.qty)}</span>
                            <button
                              onClick={() => remove(key)}
                              className="text-xs text-fog hover:text-ember transition-colors"
                            >
                              remover
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* resumo + pagamento */}
          <aside className="rounded-xl2 border border-line bg-surface p-6 lg:sticky lg:top-24">
            <h2 className="font-display text-2xl font-semibold">Resumo</h2>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-fog">Subtotal</dt><dd className="text-mist">{formatBRL(subtotalCents)}</dd></div>
              <div className="flex justify-between">
                <dt className="text-fog">Frete</dt>
                <dd className={shippingCents === 0 ? 'text-volt' : 'text-mist'}>{shippingCents === 0 ? 'Grátis' : formatBRL(shippingCents)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-base">
                <dt className="text-mist">Total</dt><dd className="font-display text-xl">{formatBRL(totalCents)}</dd>
              </div>
            </dl>

            {/* abas de pagamento — preparadas para o próximo passo */}
            <div className="mt-6">
              <p className="font-mono text-xs text-fog tracking-widest mb-3">PAGAMENTO</p>
              <div className="grid grid-cols-2 gap-2 rounded-full border border-line p-1">
                <button
                  onClick={() => setTab('online')}
                  className={`rounded-full py-2 text-sm transition-colors ${tab === 'online' ? 'bg-volt text-ink font-medium' : 'text-fog hover:text-mist'}`}
                >
                  Online
                </button>
                <button
                  onClick={() => setTab('cod')}
                  disabled={!codEligibleAll}
                  className={`rounded-full py-2 text-sm transition-colors disabled:opacity-40 ${tab === 'cod' ? 'bg-volt text-ink font-medium' : 'text-fog hover:text-mist'}`}
                >
                  Na entrega
                </button>
              </div>

              <div className="mt-4 rounded-lg border border-line bg-ink/40 p-4 text-sm text-fog">
                {tab === 'online' ? (
                  <p>Pix, cartão de crédito ou débito. Confirmação na hora e envio imediato pelo vendedor.</p>
                ) : (
                  <p>
                    Pague em dinheiro quando o produto chegar.{' '}
                    {codEligibleAll ? 'Disponível para todos os itens desta sacola.' : 'Só quando todos os itens aceitarem COD.'}
                  </p>
                )}
              </div>
            </div>

            <button
              className="mt-6 w-full rounded-full bg-volt px-7 py-3.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors"
              onClick={() => alert('Finalização de pagamento é o próximo passo (Online/COD).')}
            >
              Finalizar compra
            </button>
            <p className="mt-3 text-center font-mono text-[11px] text-fog tracking-widest">
              PROCESSAMENTO DE PAGAMENTO · PRÓXIMO PASSO
            </p>

            <Link to="/" className="mt-4 block text-center text-sm text-fog hover:text-volt transition-colors">
              continuar comprando
            </Link>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
