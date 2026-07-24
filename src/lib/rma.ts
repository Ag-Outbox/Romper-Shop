import { pushNotification } from './notificationsStore';

/* ---------------------------------------------------------------------------
   RMA — cancelamento e devolução (B6), mock em localStorage até as tabelas
   `rmas` + Edge Function de reembolso real. Regras:
   - CANCELAR: só antes do envio (processing / awaiting_cod).
   - DEVOLVER: só depois de entregue (delivered), janela de 7 dias.
   O vendedor aprova/recusa pelo painel; aprovar marca como reembolsado
   (reembolso real vem com o gateway na Fase 2).
--------------------------------------------------------------------------- */

export type RmaType = 'cancel' | 'return';
export type RmaStatus = 'requested' | 'approved' | 'rejected';

export interface Rma {
  id: string;
  orderId: string;
  sellerSlug: string;
  sellerName: string;
  type: RmaType;
  reason: string;
  amountCents: number;
  status: RmaStatus;
  createdAt: string;
  resolvedAt?: string;
}

const KEY = 'romper.rmas.v1';

function readAll(): Rma[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Rma[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: Rma[]): void {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getRma(orderId: string, sellerSlug: string): Rma | undefined {
  return readAll().find((r) => r.orderId === orderId && r.sellerSlug === sellerSlug);
}

export function requestRma(input: Omit<Rma, 'id' | 'status' | 'createdAt' | 'resolvedAt'>): Rma {
  const existing = getRma(input.orderId, input.sellerSlug);
  if (existing) return existing; // 1 RMA por sub-pedido
  const rma: Rma = {
    ...input,
    id: `rma-${Date.now().toString(36)}`,
    status: 'requested',
    createdAt: new Date().toISOString(),
  };
  writeAll([rma, ...readAll()]);
  pushNotification({
    audienceRole: 'seller',
    storeSlug: input.sellerSlug,
    kind: 'order',
    title: input.type === 'cancel' ? 'Pedido de cancelamento' : 'Pedido de devolução',
    body: `${input.orderId} · ${input.reason.slice(0, 60)}`,
    href: '/vendedor',
  });
  return rma;
}

export function listSellerRmas(sellerSlug: string): Rma[] {
  return readAll()
    .filter((r) => r.sellerSlug === sellerSlug)
    .sort((a, b) => Number(a.status !== 'requested') - Number(b.status !== 'requested') || b.createdAt.localeCompare(a.createdAt));
}

export function resolveRma(id: string, approve: boolean): void {
  const all = readAll();
  const rma = all.find((r) => r.id === id);
  if (!rma || rma.status !== 'requested') return;
  rma.status = approve ? 'approved' : 'rejected';
  rma.resolvedAt = new Date().toISOString();
  writeAll(all);
  pushNotification({
    audienceRole: 'buyer',
    kind: 'order',
    title: approve
      ? rma.type === 'cancel' ? 'Cancelamento aprovado — reembolso a caminho' : 'Devolução aprovada — reembolso a caminho'
      : 'Sua solicitação foi recusada pelo vendedor',
    body: `Pedido ${rma.orderId}`,
    href: `/pedido/${rma.orderId}`,
  });
}

export const RMA_STATUS_LABEL: Record<RmaStatus, string> = {
  requested: 'aguardando o vendedor',
  approved: 'aprovado — reembolso simulado',
  rejected: 'recusado pelo vendedor',
};
