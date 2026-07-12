import type { OrderSubOrder, SubOrderStatus } from '../lib/types';

/* Linha do tempo de rastreio de um sub-pedido. Os passos canônicos dependem
   do pagamento: online passa por "Em separação", COD por "Aguardando entrega".
   Timestamps vêm do history (quando existir; pedidos antigos não têm). */

const STEP_LABEL: Record<SubOrderStatus, string> = {
  paid: 'Pagamento aprovado',
  processing: 'Em separação',
  awaiting_cod: 'Confirmado — pague na entrega',
  shipped: 'Enviado',
  delivered: 'Entregue',
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function OrderTimeline({ sub, createdAt, isCod }: {
  sub: OrderSubOrder;
  createdAt: string;
  isCod: boolean;
}) {
  const steps: SubOrderStatus[] = isCod
    ? ['awaiting_cod', 'shipped', 'delivered']
    : ['processing', 'shipped', 'delivered'];
  const currentIdx = steps.indexOf(sub.status);
  const at = (s: SubOrderStatus): string | undefined =>
    sub.history?.find((h) => h.status === s)?.at ?? (steps.indexOf(s) === 0 ? createdAt : undefined);

  return (
    <ol className="mt-4 flex flex-col gap-0">
      <li className="relative flex gap-3 pb-5 pl-1">
        <span className="absolute left-[7px] top-4 h-full w-px bg-line" aria-hidden />
        <span className="relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full bg-volt" aria-hidden />
        <div>
          <p className="text-sm text-mist">Pedido realizado</p>
          <p className="font-mono text-xs text-fog">{fmt(createdAt)}</p>
        </div>
      </li>
      {steps.map((s, i) => {
        const done = currentIdx >= i;
        const ts = done ? at(s) : undefined;
        const last = i === steps.length - 1;
        return (
          <li key={s} className={`relative flex gap-3 pl-1 ${last ? '' : 'pb-5'}`}>
            {!last && <span className="absolute left-[7px] top-4 h-full w-px bg-line" aria-hidden />}
            <span
              aria-hidden
              className={`relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full ${done ? 'bg-volt' : 'border border-line bg-surface'}`}
            />
            <div>
              <p className={`text-sm ${done ? 'text-mist' : 'text-fog'}`}>{STEP_LABEL[s]}</p>
              {ts && <p className="font-mono text-xs text-fog">{fmt(ts)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
