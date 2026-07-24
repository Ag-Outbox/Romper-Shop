import { useState } from 'react';
import { listPricingRules, addPricingRule, removePricingRule, FALLBACK_MARKUP_PERCENT } from '../lib/pricingRules';
import { PROVIDER_OPTIONS } from '../lib/dropship';
import { CATEGORIES } from '../lib/catalog';

/* Admin: regras de markup automático por fornecedor/categoria. A mais
   específica vence na importação (fornecedor+categoria > fornecedor >
   categoria > padrão de ${FALLBACK_MARKUP_PERCENT}%). */

const inputCls =
  'rounded-lg border border-line bg-ink px-3 py-2 text-sm text-mist outline-none placeholder:text-fog/60 focus:border-volt transition-colors';

export default function PricingRulesManager() {
  const [rules, setRules] = useState(() => listPricingRules());
  const [showForm, setShowForm] = useState(false);
  const [provider, setProvider] = useState('*');
  const [category, setCategory] = useState('*');
  const [markup, setMarkup] = useState('35');
  const [round99, setRound99] = useState(true);
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseFloat(markup.replace(',', '.'));
    if (!(pct > 0 && pct <= 500)) { setError('Markup precisa estar entre 1 e 500%.'); return; }
    addPricingRule({ providerSlug: provider, category, markupPercent: pct, roundTo99: round99 });
    setRules(listPricingRules());
    setShowForm(false);
    setError('');
  };

  const providerLabel = (slug: string) =>
    slug === '*' ? 'Qualquer fornecedor' : PROVIDER_OPTIONS.find((p) => p.slug === slug)?.label ?? slug;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl font-semibold">Regras de preço (importação)</h2>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-full border border-line px-5 py-2 text-sm hover:border-volt hover:text-volt transition-colors">
          {showForm ? 'Fechar' : '+ Nova regra'}
        </button>
      </div>
      <p className="mt-1 text-sm text-fog max-w-2xl">
        Markup aplicado automaticamente ao importar. A regra mais específica vence; sem regra,
        vale o padrão de {FALLBACK_MARKUP_PERCENT}%.
      </p>

      {showForm && (
        <form onSubmit={submit} className="mt-4 grid grid-cols-2 gap-3 rounded-xl2 border border-line bg-surface p-5 sm:grid-cols-4">
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs text-fog">Fornecedor</span>
            <select className={inputCls} value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="*">Qualquer</option>
              {PROVIDER_OPTIONS.map((p) => <option key={p.slug} value={p.slug}>{p.label}</option>)}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs text-fog">Categoria</span>
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="*">Qualquer</option>
              {CATEGORIES.map((c) => <option key={c.slug} value={c.name}>{c.name}</option>)}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs text-fog">Markup (%)</span>
            <input className={inputCls} value={markup} onChange={(e) => setMarkup(e.target.value)} inputMode="decimal" placeholder="35" />
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-fog">
            <input type="checkbox" checked={round99} onChange={(e) => setRound99(e.target.checked)} className="h-4 w-4 accent-[#5C940B]" />
            preço termina em ,99
          </label>
          <div className="col-span-2 sm:col-span-4 flex items-center gap-4">
            <button type="submit" className="rounded-full bg-volt px-6 py-2.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
              Criar regra
            </button>
            {error && <p className="text-xs text-ember">{error}</p>}
          </div>
        </form>
      )}

      {rules.length > 0 && (
        <div className="mt-4 rounded-xl2 border border-line bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs text-fog">
                  <th className="px-5 py-3 font-normal">FORNECEDOR</th>
                  <th className="px-5 py-3 font-normal">CATEGORIA</th>
                  <th className="px-5 py-3 font-normal text-right">MARKUP</th>
                  <th className="px-5 py-3 font-normal">,99</th>
                  <th className="px-5 py-3 font-normal" />
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 text-mist">{providerLabel(r.providerSlug)}</td>
                    <td className="px-5 py-3 text-fog">{r.category === '*' ? 'Qualquer' : r.category}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{r.markupPercent}%</td>
                    <td className="px-5 py-3">{r.roundTo99 ? 'sim' : '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => { removePricingRule(r.id); setRules(listPricingRules()); }} className="text-xs text-fog hover:text-ember transition-colors">
                        excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
