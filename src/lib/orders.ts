import type { Order } from './types';

/* Pedidos persistidos no cliente (localStorage) até a tabela `orders` no
   Supabase. A modelagem já é a final: um Order (pai) com N sub_orders. */

const KEY = 'romper.orders.v1';

function readAll(): Order[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}

export function saveOrder(order: Order): void {
  const all = readAll();
  all.unshift(order);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function getOrder(id: string): Order | undefined {
  return readAll().find((o) => o.id === id);
}

/** Nº de pedido curto e legível (ex.: RS-L  Q9F3K). */
export function newOrderId(): string {
  return `RS-${Date.now().toString(36).toUpperCase()}`;
}
