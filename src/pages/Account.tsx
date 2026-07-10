import { Link } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import Stat from '../components/Stat';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../lib/auth';
import { usePageMeta } from '../lib/usePageMeta';
import { useAsync } from '../lib/useAsync';
import { useFavorites } from '../lib/useFavorites';
import { listOrders } from '../lib/orders';
import { fetchProductById } from '../lib/api';
import { formatBRL } from '../lib/format';
import type { Product } from '../lib/types';

/* ROMPER SHOP — Conta do comprador (/conta): perfil, reputação, pedidos e favoritos. */

export default function Account() {
  usePageMeta('Minha conta');
  const { user } = useAuth();
  const orders = listOrders();
  const totalSpent = orders.reduce((n, o) => n + o.totalCents, 0);

  const { ids: favoriteIds } = useFavorites();
  const { data: favorites, loading: loadingFavorites } = useAsync(async () => {
    const list = await Promise.all([...favoriteIds].map(fetchProductById));
    return list.filter((p): p is Product => !!p);
  }, [favoriteIds.size, [...favoriteIds].join(',')]);

  return (
    <DashboardShell title={`Olá, ${user?.fullName.split(' ')[0] ?? ''}`} subtitle="Seus pedidos e informações">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="PEDIDOS" value={orders.length} />
        <Stat label="TOTAL GASTO" value={formatBRL(totalSpent)} />
        <Stat label="REPUTAÇÃO" value="100" hint="Boa — habilita COD" />
        <Stat label="RECUSAS COD" value="0" />
      </div>

      {user?.role === 'buyer' && (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/vender" className="rounded-full border border-line px-5 py-2.5 text-sm hover:border-volt hover:text-volt transition-colors">
            Abrir minha loja →
          </Link>
          <Link to="/afiliado" className="rounded-full border border-line px-5 py-2.5 text-sm hover:border-volt hover:text-volt transition-colors">
            Virar afiliado e ganhar comissão →
          </Link>
        </div>
      )}

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold mb-5">Histórico de pedidos</h2>

        {orders.length === 0 ? (
          <div className="rounded-xl2 border border-line bg-surface p-12 text-center">
            <p className="font-display text-2xl">Nenhum pedido ainda</p>
            <p className="mt-2 text-fog">Quando você comprar, os pedidos aparecem aqui.</p>
            <Link to="/" className="mt-6 inline-block rounded-full bg-volt px-6 py-2.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
              Explorar produtos
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((o) => {
              const itemCount = o.subOrders.reduce((n, s) => n + s.items.reduce((m, i) => m + i.qty, 0), 0);
              return (
                <Link
                  key={o.id}
                  to={`/pedido/${o.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl2 border border-line bg-surface p-5 hover:border-volt transition-colors"
                >
                  <div>
                    <p className="font-mono text-sm text-mist">{o.id}</p>
                    <p className="text-xs text-fog">{new Date(o.createdAt).toLocaleDateString('pt-BR')} · {itemCount} {itemCount === 1 ? 'item' : 'itens'}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 font-mono text-xs ${o.isCod ? 'border-volt/40 text-volt' : 'border-line text-fog'}`}>
                    {o.isCod ? 'Pague na entrega' : 'Pago'}
                  </span>
                  <span className="font-display text-lg">{formatBRL(o.totalCents)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold mb-5">
          Favoritos {favorites && favorites.length > 0 && <span className="text-fog font-sans text-base">({favorites.length})</span>}
        </h2>

        {!loadingFavorites && (!favorites || favorites.length === 0) && (
          <div className="rounded-xl2 border border-line bg-surface p-12 text-center">
            <p className="font-display text-2xl">Nenhum favorito ainda</p>
            <p className="mt-2 text-fog">Toque no coração de um produto para guardá-lo aqui.</p>
            <Link to="/" className="mt-6 inline-block rounded-full bg-volt px-6 py-2.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
              Explorar produtos
            </Link>
          </div>
        )}

        {favorites && favorites.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {favorites.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
