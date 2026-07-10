import { useMemo, useState } from 'react';
import DashboardShell from '../components/DashboardShell';
import Stat from '../components/Stat';
import Reveal from '../components/Reveal';
import { usePageMeta } from '../lib/usePageMeta';
import { PRODUCTS, CATEGORIES } from '../lib/catalog';
import { formatBRL } from '../lib/format';
import { availableProviders, importFromProvider } from '../lib/dropship';
import { MANUAL_IMPORT_EXAMPLE } from '../lib/manualImport';
import { applyMarkup } from '../services/dropship/DropshipProvider';
import { PLATFORM_COMMISSION_PERCENT, platformCommissionCents } from '../lib/commission';
import { listAllAffiliates } from '../lib/affiliates';
import { listPendingSellers, approveSeller, getSellerAccount } from '../lib/sellers';
import { listPendingPayouts, markPayoutPaid } from '../lib/payouts';
import type { SellerAccount } from '../lib/types';

/* ROMPER SHOP — Painel admin (/admin): visão da plataforma + catálogo
   administrado (produtos importados de fornecedores diretamente pela
   Romper Shop, sem vendedor no meio — ver lib/dropship.ts). */

interface AdminRow {
  id: string;
  title: string;
  category: string;
  priceCents: number;
  stock: number;
  status: 'active' | 'draft';
}

const inputCls = 'rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-mist outline-none placeholder:text-fog/60 focus:border-volt transition-colors';
const DEFAULT_MARKUP_PERCENT = 35;

export default function AdminDashboard() {
  usePageMeta('Painel admin');

  const { sellers, gmvCents, codShare, platformRevenueCents } = useMemo(() => {
    const map = new Map<string, { name: string; slug: string; products: number; sales: number; ratingAvg: number }>();
    let revenue = 0;
    for (const p of PRODUCTS) {
      const s = map.get(p.seller.slug) ?? { name: p.seller.name, slug: p.seller.slug, products: 0, sales: 0, ratingAvg: p.seller.ratingAvg };
      s.products += 1;
      s.sales += p.salesCount;
      map.set(p.seller.slug, s);
      revenue += platformCommissionCents(p.source, p.salesCount * p.priceCents);
    }
    const gmv = PRODUCTS.reduce((n, p) => n + p.salesCount * p.priceCents, 0);
    const codCount = PRODUCTS.filter((p) => p.codAvailable).length;
    return {
      sellers: [...map.values()].sort((a, b) => b.sales - a.sales),
      gmvCents: gmv,
      codShare: Math.round((codCount / PRODUCTS.length) * 100),
      platformRevenueCents: revenue,
    };
  }, []);

  const affiliates = useMemo(() => listAllAffiliates(), []);
  const [pendingSellers, setPendingSellers] = useState<SellerAccount[]>(() => listPendingSellers());
  const approve = (slug: string) => {
    approveSeller(slug);
    setPendingSellers(listPendingSellers());
  };

  const [pendingPayouts, setPendingPayouts] = useState(() => listPendingPayouts());
  const payoutOwnerLabel = (p: (typeof pendingPayouts)[number]) => {
    if (p.ownerType === 'seller') return getSellerAccount(p.ownerId)?.name ?? p.ownerId;
    return `Afiliado ${affiliates.find((a) => a.id === p.ownerId)?.code ?? p.ownerId}`;
  };
  const payOut = (id: string) => {
    markPayoutPaid(id);
    setPendingPayouts(listPendingPayouts());
  };

  // Catálogo administrado pela plataforma (dropship direto, sem vendedor no meio)
  const providers = useMemo(() => availableProviders(), []);
  const [adminRows, setAdminRows] = useState<AdminRow[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [importSlug, setImportSlug] = useState(providers[0]?.slug ?? 'example');
  const [importInput, setImportInput] = useState('');
  const [importCategory, setImportCategory] = useState(CATEGORIES[0].name);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const flash = (msg: string) => {
    setNote(msg);
    window.setTimeout(() => setNote(null), 2500);
  };

  const importDropship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importInput.trim()) return;
    setImportBusy(true);
    setImportError(null);
    try {
      const normalized = await importFromProvider(importSlug, importInput.trim());
      const sellCents = applyMarkup(normalized.costCents, DEFAULT_MARKUP_PERCENT);
      const stockTotal = normalized.variants.length ? normalized.variants.reduce((n, v) => n + v.stock, 0) : 999;
      setAdminRows((r) => [
        { id: `admin-imp-${Date.now()}`, title: normalized.title, category: importCategory, priceCents: sellCents, stock: stockTotal, status: 'draft' },
        ...r,
      ]);
      setImportInput('');
      setShowImport(false);
      flash(`"${normalized.title}" importado diretamente para o catálogo da Romper Shop.`);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Falha ao importar produto.');
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <DashboardShell title="Visão geral" subtitle="Métricas da plataforma">
      <Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="GMV" value={formatBRL(gmvCents)} hint="volume transacionado (estimado)" />
          <Stat label="RECEITA DA PLATAFORMA" value={formatBRL(platformRevenueCents)} hint={`comissão: ${PLATFORM_COMMISSION_PERCENT.seller}% vendedor · ${PLATFORM_COMMISSION_PERCENT.dropship}% dropship`} />
          <Stat label="VENDEDORES" value={sellers.length} />
          <Stat label="COD" value={`${codShare}%`} hint="dos produtos aceitam" />
        </div>
      </Reveal>

      {/* Catálogo administrado — importação dropship direta da plataforma */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-2xl font-semibold">Catálogo administrado (dropship direto)</h2>
          <button onClick={() => setShowImport((s) => !s)} className="rounded-full bg-volt px-5 py-2 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
            {showImport ? 'Fechar' : 'Importar produto'}
          </button>
          {note && <span className="font-mono text-xs text-volt">{note}</span>}
        </div>
        <p className="mt-2 text-sm text-fog max-w-2xl">
          Produtos ligados diretamente de um fornecedor pela própria Romper Shop, sem vendedor
          no meio — a plataforma fica com a margem inteira (menos o custo do fornecedor).
        </p>

        {showImport && (
          <form onSubmit={importDropship} className="mt-4 flex flex-col gap-3 rounded-xl2 border border-line bg-surface p-5">
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
                <textarea className={`${inputCls} font-mono text-xs`} rows={8} value={importInput} onChange={(e) => setImportInput(e.target.value)} placeholder={MANUAL_IMPORT_EXAMPLE} />
              ) : (
                <input className={inputCls} value={importInput} onChange={(e) => setImportInput(e.target.value)} placeholder={importSlug === 'example' ? 'qualquer texto (ex.: 123)' : 'cole a URL ou o ID do produto'} />
              )}
            </label>
            {importError && <p className="text-sm text-ember">{importError}</p>}
            <button type="submit" disabled={importBusy} className="self-start rounded-full bg-volt px-6 py-2.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors disabled:opacity-60">
              {importBusy ? 'Importando…' : `Importar (markup de ${DEFAULT_MARKUP_PERCENT}%)`}
            </button>
          </form>
        )}

        {adminRows.length > 0 && (
          <div className="mt-4 rounded-xl2 border border-line bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs text-fog">
                  <th className="px-5 py-3 font-normal">PRODUTO</th>
                  <th className="px-5 py-3 font-normal">CATEGORIA</th>
                  <th className="px-5 py-3 font-normal text-right">PREÇO</th>
                  <th className="px-5 py-3 font-normal text-right">ESTOQUE</th>
                  <th className="px-5 py-3 font-normal">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {adminRows.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-line/20 transition-colors">
                    <td className="px-5 py-3 text-mist">{r.title}</td>
                    <td className="px-5 py-3 text-fog">{r.category}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatBRL(r.priceCents)}</td>
                    <td className="px-5 py-3 text-right text-fog tabular-nums">{r.stock}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-line px-2.5 py-1 font-mono text-xs text-fog">{r.status === 'active' ? 'ativo' : 'rascunho'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Vendedores pendentes de aprovação (auto-cadastro via /vender) */}
      {pendingSellers.length > 0 && (
        <section className="mt-10 rounded-xl2 border border-volt/40 bg-volt/5 p-5">
          <h2 className="font-mono text-xs text-volt tracking-widest mb-4">
            {pendingSellers.length} LOJA{pendingSellers.length > 1 ? 'S' : ''} AGUARDANDO APROVAÇÃO
          </h2>
          <div className="flex flex-col gap-2">
            {pendingSellers.map((s) => (
              <div key={s.slug} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                <div>
                  <p className="text-sm text-mist">{s.name}</p>
                  <p className="text-xs text-fog">/loja/{s.slug} · criada em {new Date(s.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <button onClick={() => approve(s.slug)} className="rounded-full bg-volt px-4 py-1.5 text-xs font-semibold text-ink hover:bg-volt-dim transition-colors">
                  Aprovar loja
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {pendingPayouts.length > 0 && (
        <section className="mt-10 rounded-xl2 border border-volt/40 bg-volt/5 p-5">
          <h2 className="font-mono text-xs text-volt tracking-widest mb-4">
            {pendingPayouts.length} SAQUE{pendingPayouts.length > 1 ? 'S' : ''} PENDENTE{pendingPayouts.length > 1 ? 'S' : ''}
          </h2>
          <div className="flex flex-col gap-2">
            {pendingPayouts.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                <div>
                  <p className="text-sm text-mist">{payoutOwnerLabel(p)}</p>
                  <p className="text-xs text-fog">
                    {p.ownerType === 'seller' ? 'vendedor' : 'afiliado'} · solicitado em {new Date(p.requestedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg">{formatBRL(p.amountCents)}</span>
                  <button onClick={() => payOut(p.id)} className="rounded-full bg-volt px-4 py-1.5 text-xs font-semibold text-ink hover:bg-volt-dim transition-colors">
                    Marcar como pago
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 grid lg:grid-cols-2 gap-6 items-start">
        {/* Vendedores */}
        <section className="rounded-xl2 border border-line bg-surface overflow-hidden">
          <h2 className="border-b border-line px-5 py-3 font-mono text-xs text-fog tracking-widest">VENDEDORES</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs text-fog">
                  <th className="px-5 py-3 font-normal">LOJA</th>
                  <th className="px-5 py-3 font-normal text-right">PRODUTOS</th>
                  <th className="px-5 py-3 font-normal text-right">VENDAS</th>
                  <th className="px-5 py-3 font-normal text-right">NOTA</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((s) => (
                  <tr key={s.slug} className="border-b border-line last:border-0 hover:bg-line/20 transition-colors">
                    <td className="px-5 py-3 text-mist">{s.name}</td>
                    <td className="px-5 py-3 text-right text-fog tabular-nums">{s.products}</td>
                    <td className="px-5 py-3 text-right text-fog tabular-nums">{s.sales.toLocaleString('pt-BR')}</td>
                    <td className="px-5 py-3 text-right text-volt tabular-nums">★ {s.ratingAvg.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Categorias */}
        <section className="rounded-xl2 border border-line bg-surface overflow-hidden">
          <h2 className="border-b border-line px-5 py-3 font-mono text-xs text-fog tracking-widest">CATEGORIAS</h2>
          <div className="p-5 grid grid-cols-2 gap-3">
            {CATEGORIES.map((c) => {
              const count = PRODUCTS.filter((p) => p.categorySlug === c.slug).length;
              return (
                <div key={c.slug} className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
                  <span className="text-mist">{c.name}</span>
                  <span className="font-mono text-xs text-fog">{count} {count === 1 ? 'produto' : 'produtos'}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Afiliados */}
      <section className="mt-6 rounded-xl2 border border-line bg-surface overflow-hidden">
        <h2 className="border-b border-line px-5 py-3 font-mono text-xs text-fog tracking-widest">
          AFILIADOS {affiliates.length > 0 && `(${affiliates.length})`}
        </h2>
        {affiliates.length === 0 ? (
          <p className="p-5 text-sm text-fog">Ninguém aderiu ao programa de afiliados ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs text-fog">
                  <th className="px-5 py-3 font-normal">CÓDIGO</th>
                  <th className="px-5 py-3 font-normal text-right">CLIQUES</th>
                  <th className="px-5 py-3 font-normal text-right">COMISSÃO</th>
                  <th className="px-5 py-3 font-normal text-right">PENDENTE</th>
                  <th className="px-5 py-3 font-normal text-right">CONFIRMADA</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map((a) => (
                  <tr key={a.id} className="border-b border-line last:border-0 hover:bg-line/20 transition-colors">
                    <td className="px-5 py-3 font-mono text-mist">{a.code}</td>
                    <td className="px-5 py-3 text-right text-fog tabular-nums">{a.clicks}</td>
                    <td className="px-5 py-3 text-right text-fog tabular-nums">{a.commissionPercent}%</td>
                    <td className="px-5 py-3 text-right text-fog tabular-nums">{formatBRL(a.pendingCents)}</td>
                    <td className="px-5 py-3 text-right text-volt tabular-nums">{formatBRL(a.balanceCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Produtos recentes */}
      <section className="mt-6 rounded-xl2 border border-line bg-surface overflow-hidden">
        <h2 className="border-b border-line px-5 py-3 font-mono text-xs text-fog tracking-widest">PRODUTOS</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-xs text-fog">
                <th className="px-5 py-3 font-normal">PRODUTO</th>
                <th className="px-5 py-3 font-normal">VENDEDOR</th>
                <th className="px-5 py-3 font-normal">CATEGORIA</th>
                <th className="px-5 py-3 font-normal text-right">PREÇO</th>
                <th className="px-5 py-3 font-normal">COD</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTS.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-line/20 transition-colors">
                  <td className="px-5 py-3 text-mist">{p.title}</td>
                  <td className="px-5 py-3 text-fog">{p.seller.name}</td>
                  <td className="px-5 py-3 text-fog">{p.categoryName}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatBRL(p.priceCents)}</td>
                  <td className="px-5 py-3">
                    <span className={`font-mono text-xs ${p.codAvailable ? 'text-volt' : 'text-fog'}`}>{p.codAvailable ? 'sim' : 'não'}</span>
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
