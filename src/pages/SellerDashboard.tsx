import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import Stat from '../components/Stat';
import Reveal from '../components/Reveal';
import { useAuth } from '../lib/auth';
import { usePageMeta } from '../lib/usePageMeta';
import { CATEGORIES } from '../lib/catalog';
import { formatBRL } from '../lib/format';
import { listSellerSubOrders, updateSubOrderStatus, SUB_ORDER_STATUS_LABEL } from '../lib/orders';
import { confirmCommissionsForSubOrder } from '../lib/affiliates';
import { availableProviders, importFromProvider } from '../lib/dropship';
import { MANUAL_IMPORT_EXAMPLE } from '../lib/manualImport';
import { applyMarkup } from '../services/dropship/DropshipProvider';
import { PLATFORM_COMMISSION_PERCENT, platformCommissionCents } from '../lib/commission';
import {
  getSellerCatalog, addSellerCatalogRow, updateSellerCatalogRow, removeSellerCatalogRow,
  type SellerCatalogRow as Row,
} from '../lib/sellerCatalog';
import { listPayouts, requestSellerPayout, totalWithdrawnBySeller } from '../lib/payouts';
import type { SubOrderStatus } from '../lib/types';

const DEFAULT_MARKUP_PERCENT = 40;

/* ROMPER SHOP — Painel do vendedor (/vendedor).
   Catálogo persistido por loja (lib/sellerCatalog, localStorage) — cada
   vendedor vê só o seu, não mais o mock inteiro. Publicar e importar
   dropship gravam de verdade; no Supabase isso vira insert em `products`
   com seller_id = a loja do usuário logado. */

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
  const [rows, setRows] = useState<Row[]>(() => getSellerCatalog(storeSlug));
  const [subOrders, setSubOrders] = useState(() => listSellerSubOrders(storeSlug));
  const [payouts, setPayouts] = useState(() => listPayouts('seller', storeSlug));
  const [payoutNote, setPayoutNote] = useState<string | null>(null);

  // Troca de loja (ex.: logout/login com outra conta) recarrega os dados certos.
  useEffect(() => {
    setRows(getSellerCatalog(storeSlug));
    setSubOrders(listSellerSubOrders(storeSlug));
    setPayouts(listPayouts('seller', storeSlug));
  }, [storeSlug]);

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
    const netCents = revenue - commission;
    const availableCents = Math.max(0, netCents - totalWithdrawnBySeller(storeSlug));
    return { active, sales, revenue, netCents, availableCents };
  }, [rows, storeSlug, payouts]);

  const withdraw = () => {
    if (kpis.availableCents <= 0) return;
    requestSellerPayout(storeSlug, kpis.availableCents);
    setPayouts(listPayouts('seller', storeSlug));
    setPayoutNote(`Saque de ${formatBRL(kpis.availableCents)} solicitado.`);
    window.setTimeout(() => setPayoutNote(null), 3000);
  };

  // Edição inline de produto
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');

  const startEdit = (r: Row) => {
    setEditingId(r.id);
    setEditPrice((r.priceCents / 100).toFixed(2).replace('.', ','));
    setEditStock(String(r.stock));
  };

  const saveEdit = (id: string) => {
    const cents = Math.round(parseFloat(editPrice.replace(',', '.')) * 100);
    const stockNum = parseInt(editStock || '0', 10);
    if (!Number.isNaN(cents)) {
      setRows(updateSellerCatalogRow(storeSlug, id, { priceCents: cents, stock: Number.isNaN(stockNum) ? 0 : stockNum }));
    }
    setEditingId(null);
  };

  const toggleStatus = (r: Row) => {
    setRows(updateSellerCatalogRow(storeSlug, r.id, { status: r.status === 'active' ? 'draft' : 'active' }));
  };

  const removeProduct = (r: Row) => {
    if (!window.confirm(`Remover "${r.title}" do catálogo?`)) return;
    setRows(removeSellerCatalogRow(storeSlug, r.id));
  };

  const flash = (msg: string) => {
    setNote(msg);
    window.setTimeout(() => setNote(null), 2500);
  };

  const publish = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(price.replace(',', '.')) * 100);
    if (!title.trim() || Number.isNaN(cents)) return;
    setRows(addSellerCatalogRow(storeSlug, {
      id: `new-${Date.now()}`, title: title.trim(), category, priceCents: cents, stock: parseInt(stock || '0', 10), sales: 0, source: 'seller', status: 'active',
    }));
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
      setRows(addSellerCatalogRow(storeSlug, {
        id: `imp-${Date.now()}`,
        title: normalized.title,
        category: importCategory,
        priceCents: sellCents,
        stock: stockTotal,
        sales: 0,
        source: 'dropship',
        status: 'draft',
      }));
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
      <Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="FATURAMENTO" value={formatBRL(kpis.revenue)} hint="acumulado (estimado)" />
          <Stat label="VENDAS" value={kpis.sales.toLocaleString('pt-BR')} />
          <Stat label="PRODUTOS ATIVOS" value={kpis.active} />
          <Stat label="SALDO DISPONÍVEL" value={formatBRL(kpis.availableCents)} hint={`após comissão (${PLATFORM_COMMISSION_PERCENT.seller}% próprio / ${PLATFORM_COMMISSION_PERCENT.dropship}% dropship)`} />
        </div>
      </Reveal>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={withdraw}
          disabled={kpis.availableCents <= 0}
          className="rounded-full border border-line px-5 py-2 text-sm hover:border-volt hover:text-volt transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Solicitar saque
        </button>
        {payoutNote && <span className="font-mono text-xs text-volt">{payoutNote}</span>}
      </div>

      {payouts.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {payouts.slice(0, 3).map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs text-fog">
              <span>Saque solicitado em {new Date(p.requestedAt).toLocaleDateString('pt-BR')}</span>
              <span className="font-mono">{formatBRL(p.amountCents)} · {p.status === 'paid' ? 'pago' : 'pendente'}</span>
            </div>
          ))}
        </div>
      )}

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
                <th className="px-5 py-3 font-normal">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const editing = editingId === r.id;
                return (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-line/20 transition-colors">
                    <td className="px-5 py-3 text-mist">{r.title}</td>
                    <td className="px-5 py-3 text-fog">{r.category}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {editing ? (
                        <input
                          className="w-24 rounded border border-line bg-ink px-2 py-1 text-right text-sm text-mist outline-none focus:border-volt"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          inputMode="decimal"
                        />
                      ) : formatBRL(r.priceCents)}
                    </td>
                    <td className="px-5 py-3 text-right text-fog tabular-nums">
                      {editing ? (
                        <input
                          className="w-16 rounded border border-line bg-ink px-2 py-1 text-right text-sm text-mist outline-none focus:border-volt"
                          value={editStock}
                          onChange={(e) => setEditStock(e.target.value)}
                          inputMode="numeric"
                        />
                      ) : r.stock}
                    </td>
                    <td className="px-5 py-3 text-right text-fog tabular-nums">{r.sales.toLocaleString('pt-BR')}</td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-fog">{r.source === 'dropship' ? 'dropship' : 'próprio'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleStatus(r)}
                        className={`rounded-full px-2.5 py-1 font-mono text-xs transition-colors ${r.status === 'active' ? 'bg-volt/15 text-volt hover:bg-volt/25' : 'bg-line text-fog hover:text-mist'}`}
                      >
                        {r.status === 'active' ? 'ativo' : 'rascunho'}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      {editing ? (
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(r.id)} className="text-xs text-volt hover:underline">salvar</button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-fog hover:underline">cancelar</button>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <button onClick={() => startEdit(r)} className="text-xs text-fog hover:text-volt transition-colors">editar</button>
                          <button onClick={() => removeProduct(r)} className="text-xs text-fog hover:text-ember transition-colors">remover</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}
