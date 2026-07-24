import { useRef, useState } from 'react';
import { availableProviders, importFromProvider } from '../lib/dropship';
import { priceFromRules } from '../lib/pricingRules';
import { CATEGORIES } from '../lib/catalog';
import { formatBRL } from '../lib/format';

/* Admin: importação em massa — uma URL/ID por linha, fila sequencial com
   status por item. O preço de venda sai das regras de precificação. */

export interface BulkImportedItem {
  title: string;
  category: string;
  priceCents: number;
  costCents: number;
  markupPercent: number;
  providerSlug: string;
  stock: number;
}

interface QueueItem {
  input: string;
  status: 'pending' | 'importing' | 'ok' | 'error';
  title?: string;
  priceCents?: number;
  error?: string;
}

const inputCls =
  'rounded-lg border border-line bg-ink px-3 py-2 text-sm text-mist outline-none placeholder:text-fog/60 focus:border-volt transition-colors';

export default function BulkImport({ onImported }: { onImported: (item: BulkImportedItem) => void }) {
  const providers = availableProviders().filter((p) => p.slug !== 'manual'); // massa = URL/ID por linha
  const [provider, setProvider] = useState(providers[0]?.slug ?? 'example');
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [text, setText] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const cancelRef = useRef(false);

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = [...new Set(text.split('\n').map((l) => l.trim()).filter(Boolean))];
    if (lines.length === 0 || running) return;
    cancelRef.current = false;
    setRunning(true);
    let items: QueueItem[] = lines.map((input) => ({ input, status: 'pending' }));
    setQueue(items);

    for (let i = 0; i < items.length; i++) {
      if (cancelRef.current) break;
      items = items.map((it, j) => (j === i ? { ...it, status: 'importing' } : it));
      setQueue(items);
      try {
        const normalized = await importFromProvider(provider, items[i].input);
        const { sellCents, markupPercent } = priceFromRules(normalized.costCents, provider, category);
        const stock = normalized.variants.length
          ? normalized.variants.reduce((n, v) => n + v.stock, 0)
          : 999;
        onImported({
          title: normalized.title,
          category,
          priceCents: sellCents,
          costCents: normalized.costCents,
          markupPercent,
          providerSlug: provider,
          stock,
        });
        items = items.map((it, j) => (j === i ? { ...it, status: 'ok', title: normalized.title, priceCents: sellCents } : it));
      } catch (err) {
        items = items.map((it, j) =>
          j === i ? { ...it, status: 'error', error: err instanceof Error ? err.message : 'Falha ao importar.' } : it,
        );
      }
      setQueue(items);
    }
    setRunning(false);
  };

  const done = queue.filter((q) => q.status === 'ok').length;
  const failed = queue.filter((q) => q.status === 'error').length;

  return (
    <form onSubmit={start} className="mt-4 flex flex-col gap-3 rounded-xl2 border border-line bg-surface p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs text-fog">Fornecedor</span>
          <select className={inputCls} value={provider} onChange={(e) => setProvider(e.target.value)}>
            {providers.map((p) => <option key={p.slug} value={p.slug}>{p.label}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs text-fog">Categoria de destino</span>
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.slug} value={c.name}>{c.name}</option>)}
          </select>
        </label>
      </div>
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className="text-xs text-fog">Uma URL ou ID por linha (duplicadas são ignoradas)</span>
        <textarea
          className={`${inputCls} font-mono text-xs`}
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'https://fornecedor.com/produto/123\nhttps://fornecedor.com/produto/456\n789'}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={running || !text.trim()}
          className="rounded-full bg-volt px-6 py-2.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors disabled:opacity-50"
        >
          {running ? 'Importando…' : 'Importar em massa'}
        </button>
        {running && (
          <button type="button" onClick={() => { cancelRef.current = true; }} className="text-sm text-fog hover:text-ember transition-colors">
            parar
          </button>
        )}
        {queue.length > 0 && !running && (
          <span className="font-mono text-xs text-fog">
            {done} importado{done !== 1 ? 's' : ''}{failed > 0 ? ` · ${failed} com erro` : ''}
          </span>
        )}
      </div>

      {queue.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-line pt-3">
          {queue.map((q, i) => (
            <div key={i} className="flex items-center gap-3 text-xs">
              <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${
                q.status === 'ok' ? 'bg-volt' : q.status === 'error' ? 'bg-ember' : q.status === 'importing' ? 'animate-pulse bg-fog' : 'bg-line'
              }`} />
              <span className="min-w-0 flex-1 truncate font-mono text-fog">{q.input}</span>
              {q.status === 'ok' && <span className="shrink-0 text-mist">{q.title} · {formatBRL(q.priceCents!)}</span>}
              {q.status === 'error' && <span className="shrink-0 text-ember">{q.error}</span>}
              {q.status === 'importing' && <span className="shrink-0 text-fog">importando…</span>}
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
