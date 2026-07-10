import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './auth';

/* ---------------------------------------------------------------------------
   Favoritos no cliente (localStorage), por comprador. Mesmo padrão do useCart:
   um CustomEvent mantém todas as instâncias (coração no card, na página de
   produto, na conta) em sincronia. No Supabase, cada toggle vira upsert/delete
   na tabela `favorites` (buyer_id, product_id) — ver migration 0004.
--------------------------------------------------------------------------- */

const EVT = 'romper:favorites';
const keyFor = (buyerId: string) => `romper.favorites.${buyerId}`;

function read(buyerId: string): Set<string> {
  try {
    const raw = localStorage.getItem(keyFor(buyerId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function write(buyerId: string, ids: Set<string>): void {
  localStorage.setItem(keyFor(buyerId), JSON.stringify([...ids]));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useFavorites() {
  const { user } = useAuth();
  const buyerId = user?.id ?? 'guest';
  const [ids, setIds] = useState<Set<string>>(() => read(buyerId));

  useEffect(() => {
    setIds(read(buyerId));
    const sync = () => setIds(read(buyerId));
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [buyerId]);

  const isFavorite = useCallback((productId: string) => ids.has(productId), [ids]);

  const toggle = useCallback(
    (productId: string) => {
      const cur = read(buyerId);
      if (cur.has(productId)) cur.delete(productId);
      else cur.add(productId);
      write(buyerId, cur);
    },
    [buyerId],
  );

  return { ids, isFavorite, toggle, isSignedIn: !!user };
}
