import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import Stat from '../components/Stat';
import { useAuth } from '../lib/auth';
import { usePageMeta } from '../lib/usePageMeta';
import { PRODUCTS, CATEGORIES } from '../lib/catalog';
import { formatBRL } from '../lib/format';
import { listSellerSubOrders, updateSubOrderStatus, SUB_ORDER_STATUS_LABEL } from '../lib/orders';
import { confirmCommissionsForSubOrder } from '../lib/affiliates';
import { availableProviders, importFromProvider } from '../lib/dropship';
import { MANUAL_IMPORT_EXAMPLE } from '../lib/manualImport';
import { applyMarkup } from '../services/dropship/DropshipProvider';
import { PLATFORM_COMMISSION_PERCENT, platformCommissionCents } from '../lib/commission';
import type { SubOrderStatus } from '../lib/types';

const DEFAULT_MARKUP_PERCENT = 40;

/* ROMPER SHOP — Painel do vendedor (/vendedor).
   Catálogo/estoque em estado local (demo) seedado do catálogo. Publicar e
   importar dropship mutam a lista para exercitar o fluxo — no Supabase isso
   vira insert em `products` via a camada de dados. */

interface Row {
  id: string;
  title: string;
  category: string;
  priceCents: number;
  stock: number;
  sales: number;
  source: 'seller' | 'dropship';
  status: 'active' | 'draft';
}

const seed: Row[] = PRODUCTS.map((p) => ({
  id: p.id,
  title: p.title,
  category: p.categoryName,
  priceCents: p.priceCents,
  stock: p.stock,
  sales: p.salesCount,
  source: p.source,
  status: 'active',
}));

const inputCls = 'rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-mist outline-none placeholder:text-fog/60 focus:border-volt transition-colors';

/** Próxima etapa do fulfillment para cada status. */
const NEXT_STEP: Partial<Record<SubOrderStatus, { to: SubOrderStatus; label: string }>> = {
  paid: { to: 'shipped', label: 'Marcar enviado' },
  processing: { to: 'shipped', label: 'Marcar enviado' },
  awaiting_cod: { to: 'shipped', label: 'Marcar enviado' },
  shipped: { to: 'delivered', label: 'Marcar entregue' },
};

export default function SellerDashboard() {
  usePageMeta('Painel do vendedor');
  const { user } = useAuth();
  const storeSlug = user?.storeSlug ?? '';
  const [rows, setRows] = useState<Row[]>(seed);
  const [subOrders, setSubOrders] = useState(() => listSellerSubOrders(storeSlug));

  const advance = (orderId: string, to: SubOrderStatus) => {
    updateSubOrderStatus(orderId, storeSlug, to);
    if (to === 'delivered') confirmCommissionsForSubOrder(orderId, storeSlug);
    setSubOrders(listSellerSubOrders(storeSlug));
  };
  const [showForm, setShowForm] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].name);

  const providers = useMemo(() => availableProviders(), []);
  const [showImport, setShowImport] = useState(false);
  const [importSlug, setImportSlug] = useState(providers[0]?.slug ?? 'example');
  const [importInput, setImportInput] = useState('');
  const [importCategory, setImportCategory] = useState(CATEGORIES[0].name);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const active = rows.filter((r) => r.status === 'active').length;
    const sales = rows.reduce((n, r) => n + r.sales, 0);
    const revenue = rows.reduce((n, r) => n + r.sales * r.priceCents, 0);
    // Dropship rende mais para a plataforma (conexão com fornecedor é dela) — comissão maior nesses itens.
    const commission = rows.reduce((n, r) => n + platformCommissionCents(r.source, r.sales * r.priceCents), 0);
    return { active, sales, revenue, netCents: revenue - commission };
  }, [rows]);

  const flash = (msg: string) => {
    setNote(msg);
    window.setTimeout(() => setNote(null), 2500);
  };

  const publish = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(price.replace(',', '.')) * 100);
    if (!title.trim() || Number.isNaN(cents)) return;
    setRows((r) => [
      { id: `new-${Date.now()}`, title: title.trim(), category, priceCents: cents, stock: parseInt(stock || '0', 10), sales: 0, source: 'seller', status: 'active' },
      ...r,
    ]);
    setTitle(''); setPrice(''); setStock('');
    setShowForm(false);
    flash('Produto publicado.');
  };

  const importDropship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importInput.trim()) return;
    setImportBusy(true);
    setImportError(null);
    try {
      const normalized = await importFromProvider(importSlug, importInput.trim());
      const sellCents = applyMarkup(normalized.costCents, DEFAULT_MARKUP_PERCENT);
      const stockTotal = normalized.variants.length
        ? normalized.variants.reduce((n, v) => n + v.stock, 0)
        : 999;
      setRows((r) => [
        {
          id: `imp-${Date.now()}`,
          title: normalized.title,
          category: importCategory,
          priceCents: sellCents,
          stock: stockTotal,
          sales: 0,
          source: 'dropship',
          status: 'draft',
        },
        ...r,
      ]);
      setImportInput('');
      setShowImport(false);
      flash(`"${normalized.title}" importado como rascunho (markup de ${DEFAULT_MARKUP_PERCENT}% aplicado) — revise antes de publicar.`);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Falha ao importar produto.');
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <DashboardShell title={user?.storeSlug ? 'Sua loja' : 'Painel do vendedor'} subtitle="Gerencie catálogo, estoque e vendas">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="FATURAMENTO" value={formatBRL(kpis.revenue)} hint="acumulado (estimado)" />
        <Stat label="VENDAS" value={kpis.sales.toLocaleString('pt-BR')} />
        <Stat label="PRODUTOS ATIVOS" value={kpis.active} />
        <Stat label="SALDO A RECEBER" value={formatBRL(kpis.netCents)} hint={`após comissão (${PLATFORM_COMMISSION_PERCENT.seller}% próprio / ${PLATFORM_COMMISSION_PERCENT.dropship}% dropship)`} />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button onClick={() => setShowForm((s) => !s)} className="rounded-full bg-volt px-6 py-2.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
          {showForm ? 'Fechar' : 'Publicar produto'}
        </button>
        <button onClick={() => setShowImport((s) => !s)} className="rounded-full border border-line px-6 py-2.5 text-sm hover:border-volt hover:text-volt transition-colors">
          {showImport ? 'Fechar' : 'Importar dropship'}
        </button>
        {note && <span className="font-mono text-xs text-volt">{note}</span>}
      </div>

      {showImport && (
        <form onSubmit={importDropship} className="mt-5 flex flex-col gap-3 rounded-xl2 border border-line bg-surface p-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-fog">Fornecedor</span>
              <select className={inputCls} value={importSlug} onChange={(e) => setImportSlug(e.target.value)}>
                {providers.map((p) => <option key={p.slug} value={p.slug}>{p.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-fog">Categoria de destino</span>
              <select className={inputCls} value={importCategory} onChange={(e) => setImportCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c.slug} value={c.name}>{c.name}</option>)}
              </select>
            </label>
          </div>

          {providers.find((p) => p.slug === importSlug)?.hint && (
            <p className="font-mono text-xs text-fog">{providers.find((p) => p.slug === importSlug)?.hint}</p>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-fog">
              {importSlug === 'manual' ? 'Cole o JSON do produto' : 'URL ou ID do produto no fornecedor'}
            </span>
            {importSlug === 'manual' ? (
              <textarea
                className={`${inputCls} font-mono text-xs`}
                rows={8}
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                placeholder={MANUAL_IMPORT_EXAMPLE}
              />
            ) : (
              <input
                className={inputCls}
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                placeholder={importSlug === 'example' ? 'qualquer texto (ex.: 123)' : 'cole a URL ou o ID do produto'}
              />
            )}
          </label>

          {importError && <p className="text-sm text-ember">{importError}</p>}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={importBusy} className="rounded-full bg-volt px-6 py-2.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors disabled:opacity-60">
              {importBusy ? 'Importando…' : 'Importar como rascunho'}
            </button>
            <span className="text-xs text-fog">markup padrão de {DEFAULT_MARKUP_PERCENT}% sobre o custo do fornecedor</span>
          </div>
        </form>
      )}

      {showForm && (
        <form onSubmit={publish} className="mt-5 grid sm:grid-cols-4 gap-3 rounded-xl2 border border-line bg-surface p-5">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs text-fog">Título</span>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do produto" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-fog">Preço (R$)</span>
            <input className={inputCls} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="29,90" inputMode="decimal" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-fog">Estoque</span>
            <input className={inputCls} value={stock} onChange={(e) => setStock(e.target.value)} placeholder="100" inputMode="numeric" />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs text-fog">Categoria</span>
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.slug} value={c.name}>{c.name}</option>)}
            </select>
          </label>
          <div className="sm:col-span-2 flex items-end">
            <button type="submit" className="rounded-full bg-volt px-6 py-2.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
              Publicar
            </button>
          </div>
        </form>
      )}

      {/* Pedidos recebidos (sub-pedidos da loja) */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold mb-5">
          Pedidos recebidos
          {subOrders.length > 0 && (
            <span className="ml-3 rounded-full bg-volt px-2.5 py-1 align-middle font-mono text-xs text-ink">{subOrders.length}</span>
          )}
        </h2>

        {subOrders.length === 0 ? (
          <div className="rounded-xl2 border border-line bg-surface p-8 text-center text-fog text-sm">
            Nenhum pedido para sua loja ainda. Quando um comprador finalizar uma compra
            com itens seus, o sub-pedido aparece aqui.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {subOrders.map((so) => {
              const next = NEXT_STEP[so.status];
              const done = so.status === 'delivered';
              return (
                <div key={so.orderId} className="rounded-xl2 border border-line bg-surface p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link to={`/pedido/${so.orderId}`} className="font-mono text-sm text-mist hover:text-volt transition-colors">
                        {so.orderId}
                      </Link>
                      <span className="text-xs text-fog">
                        {new Date(so.createdAt).toLocaleDateString('pt-BR')} · {so.buyerName} · {so.city}/{so.uf}
                      </span>
                      {so.isCod && (
                        <span className="rounded-full border border-volt/40 px-2.5 py-0.5 font-mono text-[11px] text-volt">◎ COD</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 font-mono text-xs ${done ? 'bg-volt/15 text-volt' : 'border border-line text-fog'}`}>
                        {SUB_ORDER_STATUS_LABEL[so.status]}
                      </span>
                      {next && (
                        <button
                          onClick={() => advance(so.orderId, next.to)}
                          className="rounded-full bg-volt px-4 py-1.5 text-xs font-semibold text-ink hover:bg-volt-dim transition-colors"
                        >
                          {next.label}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
                    <span className="text-fog">
                      {so.items.map((i) => `${i.qty}× ${i.title}${i.variantName ? ` (${i.variantName})` : ''}`).join(' · ')}
                    </span>
                    <span className="font-display">{formatBRL(so.subtotalCents)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <h2 className="mt-10 font-display text-2xl font-semibold">Catálogo</h2>
      <section className="mt-5 rounded-xl2 border border-line bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-xs text-fog">
                <th className="px-5 py-3 font-normal">PRODUTO</th>
                <th className="px-5 py-3 font-normal">CATEGORIA</th>
                <th className="px-5 py-3 font-normal text-right">PREÇO</th>
                <th className="px-5 py-3 font-normal text-right">ESTOQUE</th>
                <th className="px-5 py-3 font-normal text-right">VENDIDOS</th>
                <th className="px-5 py-3 font-normal">ORIGEM</th>
                <th className="px-5 py-3 font-normal">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 text-mist">{r.title}</td>
                  <td className="px-5 py-3 text-fog">{r.category}</td>
                  <td className="px-5 py-3 text-right">{formatBRL(r.priceCents)}</td>
                  <td className="px-5 py-3 text-right text-fog">{r.stock}</td>
                  <td className="px-5 py-3 text-right text-fog">{r.sales.toLocaleString('pt-BR')}</td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-fog">{r.source === 'dropship' ? 'dropship' : 'próprio'}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 font-mono text-xs ${r.status === 'active' ? 'bg-volt/15 text-volt' : 'bg-line text-fog'}`}>
                      {r.status === 'active' ? 'ativo' : 'rascunho'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}
