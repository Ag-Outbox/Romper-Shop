import type { CartItem, Order, SubOrderStatus } from './types';

/* Pedidos persistidos no cliente (localStorage) até a tabela `orders` no
   Supabase. A modelagem já é a final: um Order (pai) com N sub_orders. */

const KEY = 'romper.orders.v1';

/** Rótulos de exibição dos status de sub-pedido (compartilhados pelas telas). */
export const SUB_ORDER_STATUS_LABEL: Record<SubOrderStatus, string> = {
  paid: 'Pago',
  processing: 'Em separação',
  awaiting_cod: 'Aguardando entrega',
  shipped: 'Enviado',
  delivered: 'Entregue',
};

function readAll(): Order[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}

function writeAll(orders: Order[]): void {
  localStorage.setItem(KEY, JSON.stringify(orders));
}

export function saveOrder(order: Order): void {
  const all = readAll();
  all.unshift(order);
  writeAll(all);
}

export function getOrder(id: string): Order | undefined {
  return readAll().find((o) => o.id === id);
}

/** Todos os pedidos deste dispositivo, mais recentes primeiro. */
export function listOrders(): Order[] {
  return readAll();
}

/* ---- Lado do vendedor: sub-pedidos endereçados à sua loja ---- */

export interface SellerSubOrder {
  orderId: string;
  createdAt: string;
  buyerName: string;
  city: string;
  uf: string;
  isCod: boolean;
  status: SubOrderStatus;
  items: CartItem[];
  subtotalCents: number;
}

export function listSellerSubOrders(sellerSlug: string): SellerSubOrder[] {
  if (!sellerSlug) return [];
  return readAll().flatMap((o) =>
    o.subOrders
      .filter((s) => s.sellerSlug === sellerSlug)
      .map((s) => ({
        orderId: o.id,
        createdAt: o.createdAt,
        buyerName: o.address.recipient,
        city: o.address.city,
        uf: o.address.uf,
        isCod: o.isCod,
        status: s.status,
        items: s.items,
        subtotalCents: s.subtotalCents,
      })),
  );
}

/** Avança o status de UM sub-pedido (fulfillment do vendedor) e registra
 *  o evento na linha do tempo de rastreio. */
export function updateSubOrderStatus(orderId: string, sellerSlug: string, status: SubOrderStatus): void {
  const all = readAll();
  const order = all.find((o) => o.id === orderId);
  const sub = order?.subOrders.find((s) => s.sellerSlug === sellerSlug);
  if (!order || !sub) return;
  sub.status = status;
  sub.history = [...(sub.history ?? []), { status, at: new Date().toISOString() }];
  writeAll(all);
}

/** Nº de pedido curto e legível (ex.: RS-LQ9F3K). */
export function newOrderId(): string {
  return `RS-${Date.now().toString(36).toUpperCase()}`;
}
