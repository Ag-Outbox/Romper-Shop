import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import SiteFooter from '../components/SiteFooter';
import { useCart, lineKey } from '../lib/useCart';
import { formatBRL } from '../lib/format';
import { maskCep, isValidCep, lookupCep, codEligibility, UFS } from '../lib/cep';
import { saveOrder, newOrderId } from '../lib/orders';
import type { Address, CartItem, Order, OrderSubOrder, SubOrderStatus } from '../lib/types';

/* ---------------------------------------------------------------------------
   ROMPER SHOP — Checkout (/checkout)
   Fluxo completo: itens (agrupados por vendedor = sub_orders), entrega com
   CEP + validação, pagamento Online (Pix/Cartão) ou na Entrega (COD, conforme
   elegibilidade). Ao finalizar, monta o pedido (orders -> sub_orders) e leva
   à confirmação. O processamento real (Edge Functions + provedor) entra depois;
   aqui o resultado é simulado, mas a modelagem de dados já é a final.
--------------------------------------------------------------------------- */

type PayTab = 'online' | 'cod';
type OnlineMethod = 'pix' | 'card';

const EMPTY_ADDRESS: Address = {
  recipient: '', phone: '', cep: '', street: '', number: '',
  complement: '', district: '', city: '', uf: '',
};

function groupBySeller(items: CartItem[]): OrderSubOrder[] {
  const map = new Map<string, OrderSubOrder>();
  for (const it of items) {
    const g = map.get(it.sellerSlug) ?? {
      sellerSlug: it.sellerSlug, sellerName: it.sellerName, items: [], subtotalCents: 0, status: 'paid' as SubOrderStatus,
    };
    g.items.push(it);
    g.subtotalCents += it.unitCents * it.qty;
    map.set(it.sellerSlug, g);
  }
  return [...map.values()];
}

function Field({ label, children, error, className = '' }: {
  label: string; children: React.ReactNode; error?: string; className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs text-fog">{label}</span>
      {children}
      {error && <span className="text-xs text-ember">{error}</span>}
    </label>
  );
}

const inputCls =
  'rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-mist outline-none placeholder:text-fog/60 focus:border-volt transition-colors';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, setQty, remove, subtotalCents, count, clear } = useCart();

  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [errors, setErrors] = useState<Partial<Record<keyof Address, string>>>({});
  const [tab, setTab] = useState<PayTab>('online');
  const [onlineMethod, setOnlineMethod] = useState<OnlineMethod>('pix');
  const [cepLoading, setCepLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const groups = useMemo(() => groupBySeller(items), [items]);
  const shippingCents = subtotalCents > 0 && subtotalCents < 19900 ? 1490 : 0;
  const totalCents = subtotalCents + shippingCents;

  const cod = codEligibility({ items, totalCents, uf: address.uf });

  const set = (k: keyof Address, v: string) => {
    setAddress((a) => ({ ...a, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const onCepChange = async (raw: string) => {
    const masked = maskCep(raw);
    set('cep', masked);
    if (isValidCep(masked)) {
      setCepLoading(true);
      const info = await lookupCep(masked);
      setCepLoading(false);
      if (info) {
        setAddress((a) => ({
          ...a,
          street: info.street || a.street,
          district: info.district || a.district,
          city: info.city || a.city,
          uf: info.uf || a.uf,
        }));
      }
    }
  };

  const validate = (): boolean => {
    const req: Array<keyof Address> = ['recipient', 'phone', 'cep', 'street', 'number', 'district', 'city', 'uf'];
    const next: Partial<Record<keyof Address, string>> = {};
    for (const k of req) if (!String(address[k]).trim()) next[k] = 'Obrigatório';
    if (address.cep && !isValidCep(address.cep)) next.cep = 'CEP inválido';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const finalize = () => {
    if (!validate()) {
      document.getElementById('entrega')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (tab === 'cod' && !cod.ok) return;

    setSubmitting(true);
    const isCod = tab === 'cod';
    const status: SubOrderStatus = isCod ? 'awaiting_cod' : 'processing';
    const subOrders = groups.map((g) => ({ ...g, status }));
    const order: Order = {
      id: newOrderId(),
      createdAt: new Date().toISOString(),
      address,
      paymentMethod: isCod ? 'cod' : onlineMethod,
      isCod,
      subOrders,
      subtotalCents,
      shippingCents,
      totalCents,
      statusLabel: isCod ? 'Pedido confirmado — pague na entrega' : 'Pagamento aprovado',
    };
    saveOrder(order);
    clear();
    // Simula o retorno do provedor de pagamento antes de confirmar.
    setTimeout(() => navigate(`/pedido/${order.id}`), 400);
  };

  if (items.length === 0) {
    return (
      <>
        <TopBar />
        <main className="px-5 md:px-10 py-32 text-center">
          <p className="font-mono text-xs text-volt tracking-widest mb-4">SACOLA</p>
          <h1 className="font-display text-4xl md:text-6xl font-semibold">Sua sacola está vazia</h1>
          <p className="mt-5 text-fog">Explore as categorias e adicione o que curtir.</p>
          <Link to="/" className="mt-8 inline-block rounded-full bg-volt px-7 py-3 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
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
        <h1 className="font-display text-4xl md:text-6xl font-semibold">Finalizar compra</h1>
        <p className="mt-2 text-fog">
          {count} {count === 1 ? 'item' : 'itens'} · {groups.length} {groups.length === 1 ? 'vendedor' : 'vendedores'}
        </p>

        <div className="mt-10 grid lg:grid-cols-[1fr_380px] gap-8 lg:gap-10 items-start">
          <div className="flex flex-col gap-6">
            {/* ITENS por vendedor (sub_orders) */}
            <section className="rounded-xl2 border border-line bg-surface overflow-hidden">
              <h2 className="border-b border-line px-5 py-3 font-mono text-xs text-fog tracking-widest">ITENS</h2>
              {groups.map((g) => (
                <div key={g.sellerSlug} className="border-b border-line last:border-0">
                  <div className="flex items-center gap-2 px-5 pt-4 text-sm">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-volt/15 font-display text-xs text-volt">
                      {g.sellerName.charAt(0)}
                    </span>
                    <span className="text-mist">{g.sellerName}</span>
                    <span className="font-mono text-xs text-fog">· sub-pedido</span>
                  </div>
                  {g.items.map((it) => {
                    const key = lineKey(it);
                    return (
                      <div key={key} className="flex gap-4 p-5">
                        <Link to={`/produto/${it.slug}`} className="shrink-0">
                          <img src={it.image} alt={it.title} className="h-16 w-16 rounded-lg border border-line object-cover" />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link to={`/produto/${it.slug}`} className="text-sm text-mist hover:text-volt transition-colors line-clamp-1">
                            {it.title}
                          </Link>
                          {it.variantName && <p className="mt-0.5 text-xs text-fog">{it.variantName}</p>}
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <div className="flex items-center rounded-full border border-line">
                              <button onClick={() => setQty(key, it.qty - 1)} aria-label="Diminuir" disabled={it.qty <= 1}
                                className="h-8 w-8 text-fog hover:text-volt transition-colors disabled:opacity-40">−</button>
                              <span className="w-8 text-center text-sm tabular-nums">{it.qty}</span>
                              <button onClick={() => setQty(key, it.qty + 1)} aria-label="Aumentar"
                                className="h-8 w-8 text-fog hover:text-volt transition-colors">+</button>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm">{formatBRL(it.unitCents * it.qty)}</span>
                              <button onClick={() => remove(key)} className="text-xs text-fog hover:text-ember transition-colors">remover</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </section>

            {/* ENTREGA */}
            <section id="entrega" className="rounded-xl2 border border-line bg-surface p-5 md:p-6">
              <h2 className="font-mono text-xs text-fog tracking-widest mb-4">ENTREGA</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Destinatário" error={errors.recipient} className="col-span-2 sm:col-span-1">
                  <input className={inputCls} value={address.recipient} onChange={(e) => set('recipient', e.target.value)} placeholder="Nome completo" />
                </Field>
                <Field label="Telefone" error={errors.phone} className="col-span-2 sm:col-span-1">
                  <input className={inputCls} value={address.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(11) 90000-0000" />
                </Field>
                <Field label={cepLoading ? 'CEP (buscando…)' : 'CEP'} error={errors.cep} className="col-span-2 sm:col-span-1">
                  <input className={inputCls} value={address.cep} onChange={(e) => onCepChange(e.target.value)} inputMode="numeric" placeholder="00000-000" />
                </Field>
                <Field label="Rua / logradouro" error={errors.street} className="col-span-2">
                  <input className={inputCls} value={address.street} onChange={(e) => set('street', e.target.value)} placeholder="Av. Exemplo" />
                </Field>
                <Field label="Número" error={errors.number} className="col-span-1">
                  <input className={inputCls} value={address.number} onChange={(e) => set('number', e.target.value)} placeholder="123" />
                </Field>
                <Field label="Complemento" className="col-span-1">
                  <input className={inputCls} value={address.complement} onChange={(e) => set('complement', e.target.value)} placeholder="Apto, bloco…" />
                </Field>
                <Field label="Bairro" error={errors.district} className="col-span-2 sm:col-span-1">
                  <input className={inputCls} value={address.district} onChange={(e) => set('district', e.target.value)} placeholder="Centro" />
                </Field>
                <Field label="Cidade" error={errors.city} className="col-span-1">
                  <input className={inputCls} value={address.city} onChange={(e) => set('city', e.target.value)} placeholder="São Paulo" />
                </Field>
                <Field label="UF" error={errors.uf} className="col-span-1">
                  <select className={inputCls} value={address.uf} onChange={(e) => set('uf', e.target.value)}>
                    <option value="">—</option>
                    {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </Field>
              </div>
            </section>

            {/* PAGAMENTO */}
            <section className="rounded-xl2 border border-line bg-surface p-5 md:p-6">
              <h2 className="font-mono text-xs text-fog tracking-widest mb-4">PAGAMENTO</h2>
              <div className="grid grid-cols-2 gap-2 rounded-full border border-line p-1">
                <button onClick={() => setTab('online')}
                  className={`rounded-full py-2 text-sm transition-colors ${tab === 'online' ? 'bg-volt text-ink font-medium' : 'text-fog hover:text-mist'}`}>
                  Online
                </button>
                <button onClick={() => setTab('cod')} disabled={!cod.ok}
                  title={cod.ok ? '' : cod.reason}
                  className={`rounded-full py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tab === 'cod' ? 'bg-volt text-ink font-medium' : 'text-fog hover:text-mist'}`}>
                  Na entrega
                </button>
              </div>

              {tab === 'online' ? (
                <div className="mt-4 flex flex-col gap-2">
                  {(['pix', 'card'] as OnlineMethod[]).map((m) => (
                    <button key={m} onClick={() => setOnlineMethod(m)}
                      className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${onlineMethod === m ? 'border-volt text-mist' : 'border-line text-fog hover:border-fog'}`}>
                      <span>{m === 'pix' ? 'Pix — aprovação imediata' : 'Cartão de crédito'}</span>
                      <span className={`h-4 w-4 rounded-full border ${onlineMethod === m ? 'border-volt bg-volt' : 'border-line'}`} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-line bg-ink/40 p-4 text-sm text-fog">
                  {cod.ok
                    ? 'Pague em dinheiro quando o produto chegar. Você confirma o pedido por SMS/WhatsApp antes da entrega.'
                    : cod.reason}
                </div>
              )}
              {!cod.ok && (
                <p className="mt-3 text-xs text-fog">Pagamento na entrega indisponível: {cod.reason?.toLowerCase()}</p>
              )}
            </section>
          </div>

          {/* RESUMO */}
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

            <button onClick={finalize} disabled={submitting}
              className="mt-6 w-full rounded-full bg-volt px-7 py-3.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors disabled:opacity-60">
              {submitting ? 'Processando…' : tab === 'cod' ? 'Confirmar pedido (COD)' : 'Pagar e finalizar'}
            </button>
            <p className="mt-3 text-center text-xs text-fog">
              {tab === 'cod' ? 'Você paga na entrega.' : 'Ambiente de demonstração — pagamento simulado.'}
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
