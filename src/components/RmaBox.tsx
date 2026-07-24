import { useState } from 'react';
import { getRma, requestRma, RMA_STATUS_LABEL, type RmaType } from '../lib/rma';
import type { Order, OrderSubOrder } from '../lib/types';

/* Página do pedido: cancelar (antes do envio) ou devolver (após entrega)
   um sub-pedido. Uma solicitação por sub-pedido; o vendedor resolve no painel. */

export default function RmaBox({ order, sub }: { order: Order; sub: OrderSubOrder }) {
  const [rma, setRma] = useState(() => getRma(order.id, sub.sellerSlug));
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const type: RmaType | null =
    sub.status === 'processing' || sub.status === 'awaiting_cod' ? 'cancel'
    : sub.status === 'delivered' ? 'return'
    : null; // enviado: nem cancela, nem devolve ainda

  if (rma) {
    return (
      <p className="mt-3 text-xs text-fog">
        {rma.type === 'cancel' ? 'Cancelamento' : 'Devolução'}:{' '}
        <span className={rma.status === 'approved' ? 'text-volt' : rma.status === 'rejected' ? 'text-ember' : ''}>
          {RMA_STATUS_LABEL[rma.status]}
        </span>
      </p>
    );
  }
  if (!type) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setRma(requestRma({
      orderId: order.id,
      sellerSlug: sub.sellerSlug,
      sellerName: sub.sellerName,
      type,
      reason: reason.trim(),
      amountCents: sub.subtotalCents,
    }));
  };

  return open ? (
    <form onSubmit={submit} className="mt-3 flex min-w-0 flex-col sm:flex-row gap-2">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={type === 'cancel' ? 'Por que quer cancelar?' : 'Por que quer devolver?'}
        aria-label="Motivo"
        className="min-w-0 flex-1 rounded-lg border border-line bg-ink/5 px-3 py-2 text-sm text-mist outline-none placeholder:text-fog/60 focus:border-volt transition-colors"
      />
      <div className="flex shrink-0 gap-2">
        <button type="submit" disabled={!reason.trim()} className="rounded-full bg-ember px-4 py-2 text-xs font-semibold text-ink hover:opacity-90 transition-opacity disabled:opacity-40">
          {type === 'cancel' ? 'Confirmar cancelamento' : 'Solicitar devolução'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-fog hover:text-mist transition-colors">voltar</button>
      </div>
    </form>
  ) : (
    <button onClick={() => setOpen(true)} className="mt-3 text-xs text-fog hover:text-ember transition-colors">
      {type === 'cancel' ? 'Cancelar este sub-pedido' : 'Solicitar devolução (até 7 dias)'}
    </button>
  );
}
