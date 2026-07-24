import { Link, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import SiteFooter from '../components/SiteFooter';
import Reveal from '../components/Reveal';
import OrderTimeline from '../components/OrderTimeline';
import RmaBox from '../components/RmaBox';
import { getOrder, SUB_ORDER_STATUS_LABEL } from '../lib/orders';
import { usePageMeta } from '../lib/usePageMeta';
import { formatBRL } from '../lib/format';
import type { OrderPaymentMethod } from '../lib/types';

/* ---------------------------------------------------------------------------
   ROMPER SHOP — Confirmação de pedido (/pedido/:id)
   Lê o pedido salvo (localStorage) e mostra o resumo: sub-pedidos por vendedor,
   forma de pagamento e — no COD — o status do fluxo de pagamento na entrega.
--------------------------------------------------------------------------- */

const PAYMENT_LABEL: Record<OrderPaymentMethod, string> = {
  pix: 'Pix',
  card: 'Cartão de crédito',
  cod: 'Pagamento na entrega (COD)',
};

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>();
  const order = id ? getOrder(id) : undefined;
  usePageMeta(order ? `Pedido ${order.id}` : 'Pedido');

  if (!order) {
    return (
      <>
        <TopBar />
        <main className="px-5 md:px-10 py-32 text-center">
          <p className="font-mono text-xs text-volt tracking-widest mb-4">PEDIDO</p>
          <h1 className="font-display text-4xl md:text-6xl font-semibold">Pedido não encontrado</h1>
          <p className="mt-5 text-fog">Não localizamos este pedido neste dispositivo.</p>
          <Link to="/" className="mt-8 inline-block rounded-full bg-volt px-7 py-3 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
            Voltar ao início
          </Link>
        </main>
        <SiteFooter />
      </>
    );
  }

  const date = new Date(order.createdAt).toLocaleString('pt-BR');

  return (
    <>
      <TopBar />
      <main className="px-5 md:px-10 py-12 pb-24 max-w-3xl mx-auto">
        <Reveal>
          <div className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-volt text-ink text-3xl">✓</div>
            <h1 className="mt-6 font-display text-4xl md:text-5xl font-semibold">{order.statusLabel}</h1>
            <p className="mt-3 text-fog">
              Pedido <span className="font-mono text-mist">{order.id}</span> · {date}
            </p>
            {order.isCod && (
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-volt/40 bg-volt/10 px-4 py-2 text-sm text-volt">
                <span aria-hidden>◎</span> Você pagará {formatBRL(order.totalCents)} na entrega
              </div>
            )}
          </div>
        </Reveal>

        {/* pagamento + entrega */}
        <div className="mt-10 grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl2 border border-line bg-surface p-5">
            <p className="font-mono text-xs text-fog tracking-widest mb-2">PAGAMENTO</p>
            <p className="text-sm text-mist">{PAYMENT_LABEL[order.paymentMethod]}</p>
          </div>
          <div className="rounded-xl2 border border-line bg-surface p-5">
            <p className="font-mono text-xs text-fog tracking-widest mb-2">ENTREGA</p>
            <p className="text-sm text-mist">{order.address.recipient}</p>
            <p className="text-sm text-fog">
              {order.address.street}, {order.address.number}
              {order.address.complement ? ` — ${order.address.complement}` : ''}
            </p>
            <p className="text-sm text-fog">
              {order.address.district} · {order.address.city}/{order.address.uf} · {order.address.cep}
            </p>
          </div>
        </div>

        {/* sub-pedidos */}
        <section className="mt-6 rounded-xl2 border border-line bg-surface overflow-hidden">
          <h2 className="border-b border-line px-5 py-3 font-mono text-xs text-fog tracking-widest">
            {order.subOrders.length} SUB-PEDIDO{order.subOrders.length > 1 ? 'S' : ''}
          </h2>
          {order.subOrders.map((s) => (
            <div key={s.sellerSlug} className="border-b border-line last:border-0 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-volt/15 font-display text-xs text-volt">
                    {s.sellerName.charAt(0)}
                  </span>
                  <span className="text-mist">{s.sellerName}</span>
                </div>
                <span className="rounded-full border border-line px-3 py-1 font-mono text-xs text-fog">
                  {SUB_ORDER_STATUS_LABEL[s.status]}
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {s.items.map((it) => (
                  <div key={`${it.productId}:${it.variantId ?? ''}`} className="flex items-center gap-3">
                    <img src={it.image} alt={it.title} className="h-12 w-12 rounded-lg border border-line object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-mist line-clamp-1">{it.title}</p>
                      <p className="text-xs text-fog">
                        {it.variantName ? `${it.variantName} · ` : ''}{it.qty} × {formatBRL(it.unitCents)}
                      </p>
                    </div>
                    <span className="text-sm">{formatBRL(it.unitCents * it.qty)}</span>
                  </div>
                ))}
              </div>

              {/* rastreio */}
              <details className="mt-4 group" open={order.subOrders.length === 1}>
                <summary className="cursor-pointer select-none font-mono text-xs text-fog tracking-widest hover:text-volt transition-colors">
                  RASTREIO <span className="group-open:hidden">▸</span><span className="hidden group-open:inline">▾</span>
                </summary>
                <OrderTimeline sub={s} createdAt={order.createdAt} isCod={order.isCod} />
              </details>

              <RmaBox order={order} sub={s} />
            </div>
          ))}
        </section>

        {/* totais */}
        <dl className="mt-6 rounded-xl2 border border-line bg-surface p-6 space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-fog">Subtotal</dt><dd className="text-mist">{formatBRL(order.subtotalCents)}</dd></div>
          {order.discountCents ? (
            <div className="flex justify-between">
              <dt className="text-fog">Desconto{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
              <dd className="text-volt">−{formatBRL(order.discountCents)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-fog">Frete</dt>
            <dd className={order.shippingCents === 0 ? 'text-volt' : 'text-mist'}>{order.shippingCents === 0 ? 'Grátis' : formatBRL(order.shippingCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base">
            <dt className="text-mist">Total</dt><dd className="font-display text-xl">{formatBRL(order.totalCents)}</dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="rounded-full bg-volt px-7 py-3 text-center text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
            Continuar comprando
          </Link>
          <Link to="/conta" className="rounded-full border border-line px-7 py-3 text-center text-sm hover:border-volt hover:text-volt transition-colors">
            Ver meus pedidos
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
