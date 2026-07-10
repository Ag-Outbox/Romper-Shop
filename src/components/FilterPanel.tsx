import type { ProductFilters } from '../lib/api';

const RATING_OPTIONS = [
  { value: 0, label: 'Qualquer nota' },
  { value: 4, label: '4.0 ou mais' },
  { value: 4.5, label: '4.5 ou mais' },
];

const inputCls = 'w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-mist outline-none placeholder:text-fog/60 focus:border-volt transition-colors';

function hasActiveFilters(f: ProductFilters): boolean {
  return !!(f.priceMinCents || f.priceMaxCents || f.minRating || f.codOnly || f.discountOnly);
}

/** Painel de filtros para categoria/busca — preço, nota, COD, desconto. */
export default function FilterPanel({ filters, onChange }: {
  filters: ProductFilters;
  onChange: (f: ProductFilters) => void;
}) {
  const set = (patch: Partial<ProductFilters>) => onChange({ ...filters, ...patch });

  const toReais = (cents?: number) => (cents != null ? String(cents / 100) : '');
  const fromReais = (v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
  };

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="rounded-xl2 border border-line card-grad p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-mono text-xs text-fog tracking-widest">FILTROS</h2>
          {hasActiveFilters(filters) && (
            <button
              onClick={() => onChange({})}
              className="font-mono text-xs text-volt hover:underline"
            >
              limpar
            </button>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xs text-fog mb-2">Preço</p>
            <div className="flex items-center gap-2">
              <input
                className={inputCls}
                placeholder="mín."
                inputMode="decimal"
                value={toReais(filters.priceMinCents)}
                onChange={(e) => set({ priceMinCents: fromReais(e.target.value) })}
              />
              <span className="text-fog text-xs">—</span>
              <input
                className={inputCls}
                placeholder="máx."
                inputMode="decimal"
                value={toReais(filters.priceMaxCents)}
                onChange={(e) => set({ priceMaxCents: fromReais(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-fog mb-2">Avaliação</p>
            <select
              className={inputCls}
              value={filters.minRating ?? 0}
              onChange={(e) => set({ minRating: Number(e.target.value) || undefined })}
            >
              {RATING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-mist cursor-pointer">
            <input
              type="checkbox"
              checked={!!filters.codOnly}
              onChange={(e) => set({ codOnly: e.target.checked || undefined })}
              className="h-4 w-4 rounded border-line accent-volt"
            />
            ◎ Aceita pague na entrega
          </label>

          <label className="flex items-center gap-2.5 text-sm text-mist cursor-pointer">
            <input
              type="checkbox"
              checked={!!filters.discountOnly}
              onChange={(e) => set({ discountOnly: e.target.checked || undefined })}
              className="h-4 w-4 rounded border-line accent-volt"
            />
            Só com desconto
          </label>
        </div>
      </div>
    </aside>
  );
}
