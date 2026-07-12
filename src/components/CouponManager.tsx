import { useState } from 'react';
import { listCoupons, createCoupon, toggleCoupon, deleteCoupon } from '../lib/coupons';
import { formatBRL } from '../lib/format';
import type { Coupon, CouponKind } from '../lib/types';

const KIND_LABEL: Record<CouponKind, string> = {
  percent: '% de desconto',
  fixed: 'Valor fixo (R$)',
  free_shipping: 'Frete grátis',
};

function couponValue(c: Coupon): string {
  if (c.kind === 'percent') return `${c.percent}%`;
  if (c.kind === 'fixed') return formatBRL(c.amountCents ?? 0);
  return 'Frete grátis';
}

const inputCls =
  'rounded-lg border border-line bg-ink px-3 py-2 text-sm text-mist outline-none placeholder:text-fog/60 focus:border-volt transition-colors';

/** Gestão de cupons — plataforma (admin) ou de uma loja (vendedor). */
export default function CouponManager({ scope, storeSlug }: { scope: 'platform' | 'store'; storeSlug?: string }) {
  const [coupons, setCoupons] = useState<Coupon[]>(() => listCoupons({ scope, storeSlug }));
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [kind, setKind] = useState<CouponKind>('percent');
  const [value, setValue] = useState('');
  const [minValue, setMinValue] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxUses, setMaxUses] = useState('');

  const refresh = () => setCoupons(listCoupons({ scope, storeSlug }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(value.replace(',', '.'));
    const res = createCoupon({
      code,
      kind,
      percent: kind === 'percent' ? num : undefined,
      amountCents: kind === 'fixed' ? Math.round(num * 100) : undefined,
      scope,
      storeSlug,
      minSubtotalCents: minValue ? Math.round(parseFloat(minValue.replace(',', '.')) * 100) : undefined,
      expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : undefined,
      maxUses: maxUses ? parseInt(maxUses, 10) : undefined,
    });
    if (!res.ok) { setError(res.reason); return; }
    setError('');
    setCode(''); setValue(''); setMinValue(''); setExpiresAt(''); setMaxUses('');
    setShowForm(false);
    refresh();
  };

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl font-semibold">Cupons</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-full border border-line px-5 py-2 text-sm hover:border-volt hover:text-volt transition-colors"
        >
          {showForm ? 'Fechar' : '+ Novo cupom'}
        </button>
      </div>
      <p className="mt-1 text-sm text-fog">
        {scope === 'platform'
          ? 'Valem em toda a plataforma, para qualquer vendedor.'
          : 'Valem só para os produtos da sua loja (mesmo em pedidos com outros vendedores).'}
      </p>

      {showForm && (
        <form onSubmit={submit} className="mt-5 grid grid-cols-2 gap-3 rounded-xl2 border border-line bg-surface p-5 sm:grid-cols-3">
          <label className="flex min-w-0 flex-col gap-1.5 col-span-2 sm:col-span-1">
            <span className="text-xs text-fog">Código</span>
            <input className={`${inputCls} font-mono uppercase`} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="EX.: PROMO15" required />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs text-fog">Tipo</span>
            <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as CouponKind)}>
              {(Object.keys(KIND_LABEL) as CouponKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </label>
          {kind !== 'free_shipping' && (
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs text-fog">{kind === 'percent' ? 'Percentual (1–90)' : 'Valor (R$)'}</span>
              <input className={inputCls} value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder={kind === 'percent' ? '10' : '20,00'} required />
            </label>
          )}
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs text-fog">Pedido mínimo (R$, opcional)</span>
            <input className={inputCls} value={minValue} onChange={(e) => setMinValue(e.target.value)} inputMode="decimal" placeholder="50,00" />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs text-fog">Validade (opcional)</span>
            <input type="date" className={inputCls} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs text-fog">Limite de usos (opcional)</span>
            <input className={inputCls} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} inputMode="numeric" placeholder="100" />
          </label>
          <div className="col-span-2 sm:col-span-3 flex items-center gap-4">
            <button type="submit" className="rounded-full bg-volt px-6 py-2.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
              Criar cupom
            </button>
            {error && <p className="text-xs text-ember">{error}</p>}
          </div>
        </form>
      )}

      <div className="mt-5 rounded-xl2 border border-line bg-surface overflow-hidden">
        {coupons.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-fog">Nenhum cupom ainda — crie o primeiro.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs text-fog">
                  <th className="px-5 py-3 font-normal">CÓDIGO</th>
                  <th className="px-5 py-3 font-normal">DESCONTO</th>
                  <th className="px-5 py-3 font-normal">MÍNIMO</th>
                  <th className="px-5 py-3 font-normal">USOS</th>
                  <th className="px-5 py-3 font-normal">VALIDADE</th>
                  <th className="px-5 py-3 font-normal">STATUS</th>
                  <th className="px-5 py-3 font-normal" />
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const expired = c.expiresAt ? new Date(c.expiresAt).getTime() < Date.now() : false;
                  return (
                    <tr key={c.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-3 font-mono text-mist">{c.code}</td>
                      <td className="px-5 py-3">{couponValue(c)}</td>
                      <td className="px-5 py-3 text-fog">{c.minSubtotalCents ? formatBRL(c.minSubtotalCents) : '—'}</td>
                      <td className="px-5 py-3 tabular-nums">{c.uses}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                      <td className="px-5 py-3 text-fog">
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs ${expired ? 'bg-ember/15 text-ember' : c.active ? 'bg-volt/15 text-volt' : 'bg-line text-fog'}`}>
                          {expired ? 'expirado' : c.active ? 'ativo' : 'pausado'}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-right">
                        <button onClick={() => { toggleCoupon(c.id); refresh(); }} className="text-xs text-fog hover:text-volt transition-colors">
                          {c.active ? 'pausar' : 'ativar'}
                        </button>
                        <button onClick={() => { deleteCoupon(c.id); refresh(); }} className="ml-4 text-xs text-fog hover:text-ember transition-colors">
                          excluir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
