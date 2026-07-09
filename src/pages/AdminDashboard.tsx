import { useMemo } from 'react';
import DashboardShell from '../components/DashboardShell';
import Stat from '../components/Stat';
import { PRODUCTS, CATEGORIES } from '../lib/catalog';
import { formatBRL } from '../lib/format';

/* ROMPER SHOP — Painel admin (/admin): visão da plataforma.
   Métricas agregadas do catálogo (mock). No Supabase, viram queries/views. */

export default function AdminDashboard() {
  const { sellers, gmvCents, codShare } = useMemo(() => {
    const map = new Map<string, { name: string; slug: string; products: number; sales: number; ratingAvg: number }>();
    for (const p of PRODUCTS) {
      const s = map.get(p.seller.slug) ?? { name: p.seller.name, slug: p.seller.slug, products: 0, sales: 0, ratingAvg: p.seller.ratingAvg };
      s.products += 1;
      s.sales += p.salesCount;
      map.set(p.seller.slug, s);
    }
    const gmv = PRODUCTS.reduce((n, p) => n + p.salesCount * p.priceCents, 0);
    const codCount = PRODUCTS.filter((p) => p.codAvailable).length;
    return {
      sellers: [...map.values()].sort((a, b) => b.sales - a.sales),
      gmvCents: gmv,
      codShare: Math.round((codCount / PRODUCTS.length) * 100),
    };
  }, []);

  return (
    <DashboardShell title="Visão geral" subtitle="Métricas da plataforma">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="GMV" value={formatBRL(gmvCents)} hint="volume transacionado (estimado)" />
        <Stat label="PRODUTOS" value={PRODUCTS.length} />
        <Stat label="VENDEDORES" value={sellers.length} />
        <Stat label="COD" value={`${codShare}%`} hint="dos produtos aceitam" />
      </div>

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
                  <tr key={s.slug} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 text-mist">{s.name}</td>
                    <td className="px-5 py-3 text-right text-fog">{s.products}</td>
                    <td className="px-5 py-3 text-right text-fog">{s.sales.toLocaleString('pt-BR')}</td>
                    <td className="px-5 py-3 text-right text-volt">★ {s.ratingAvg.toFixed(1)}</td>
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
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 text-mist">{p.title}</td>
                  <td className="px-5 py-3 text-fog">{p.seller.name}</td>
                  <td className="px-5 py-3 text-fog">{p.categoryName}</td>
                  <td className="px-5 py-3 text-right">{formatBRL(p.priceCents)}</td>
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
