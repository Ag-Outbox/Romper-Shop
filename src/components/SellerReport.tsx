import { useMemo } from 'react';
import { listSellerSubOrders } from '../lib/orders';
import { formatBRL } from '../lib/format';

/* Painel do vendedor: relatório de vendas derivado dos sub-pedidos deste
   dispositivo — por produto e por dia (últimos 7). */

export default function SellerReport({ storeSlug }: { storeSlug: string }) {
  const { byProduct, byDay, totalCents, totalItems } = useMemo(() => {
    const subs = listSellerSubOrders(storeSlug);
    const prod = new Map<string, { title: string; qty: number; revenueCents: number }>();
    const day = new Map<string, number>();
    let total = 0;
    let items = 0;
    for (const s of subs) {
      const d = new Date(s.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      for (const it of s.items) {
        const p = prod.get(it.productId) ?? { title: it.title, qty: 0, revenueCents: 0 };
        p.qty += it.qty;
        p.revenueCents += it.unitCents * it.qty;
        prod.set(it.productId, p);
        total += it.unitCents * it.qty;
        items += it.qty;
      }
      day.set(d, (day.get(d) ?? 0) + s.subtotalCents);
    }
    return {
      byProduct: [...prod.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 8),
      byDay: [...day.entries()].slice(0, 7),
      totalCents: total,
      totalItems: items,
    };
  }, [storeSlug]);

  if (byProduct.length === 0) return null; // sem venda, sem relatório

  const maxDay = Math.max(...byDay.map(([, v]) => v), 1);

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold">Relatório de vendas</h2>
      <p className="mt-1 text-sm text-fog">
        {totalItems} {totalItems === 1 ? 'item vendido' : 'itens vendidos'} · {formatBRL(totalCents)} em receita (neste dispositivo)
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl2 border border-line bg-surface overflow-hidden">
          <h3 className="border-b border-line px-5 py-3 font-mono text-xs text-fog tracking-widest">POR PRODUTO</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {byProduct.map((p) => (
                  <tr key={p.title} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 text-mist">{p.title}</td>
                    <td className="px-5 py-3 text-right text-fog tabular-nums">{p.qty}×</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatBRL(p.revenueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl2 border border-line bg-surface p-5">
          <h3 className="font-mono text-xs text-fog tracking-widest">POR DIA</h3>
          <div className="mt-4 flex flex-col gap-2.5">
            {byDay.map(([d, cents]) => (
              <div key={d} className="flex items-center gap-3">
                <span className="w-12 shrink-0 font-mono text-xs text-fog">{d}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-line">
                  <div className="h-full rounded bg-volt" style={{ width: `${(cents / maxDay) * 100}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right text-sm tabular-nums">{formatBRL(cents)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
