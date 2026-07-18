import type { AppNotification, NotificationAudienceRole, NotificationKind } from './types';

/* ---------------------------------------------------------------------------
   Central de notificações in-app (C2) — feed de eventos com lido/não lido,
   em localStorage até a tabela `notifications` no Supabase (mesmo padrão
   mock-first de orders.ts).

   Módulo FOLHA de propósito: só depende de ./types. Assim os módulos de
   domínio (orders, qna, reviewsStore, sellers, payouts) podem importar
   pushNotification() sem criar ciclo de import com o auth.

   Escopo por audiência (o app é multi-papel num mesmo dispositivo):
   - buyer  → o comprador deste dispositivo
   - seller → uma loja específica (storeSlug)
   - admin  → qualquer administrador
   Isso espelha o que no Supabase seria uma linha por profile_id com RLS.
--------------------------------------------------------------------------- */

const KEY = 'romper.notifications.v1';
const MAX = 100;
/** Evento interno pra UI (sino) reagir na hora, sem recarregar a página. */
export const NOTIFICATIONS_EVENT = 'romper:notifications';

/** Alvo mínimo de audiência — subconjunto de auth.User, sem importar o auth. */
export interface NotificationTarget {
  role: NotificationAudienceRole;
  storeSlug?: string;
}

export interface NotificationInput {
  audienceRole: NotificationAudienceRole;
  storeSlug?: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  href?: string;
}

function readAll(): AppNotification[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: AppNotification[]): void {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  // Notifica a aba atual (o evento 'storage' só dispara em OUTRAS abas).
  try {
    window.dispatchEvent(new Event(NOTIFICATIONS_EVENT));
  } catch {
    /* fora do browser (testes/SSR) — ignora */
  }
}

/** Registra uma notificação para um papel/loja. Chamado pelos módulos de domínio. */
export function pushNotification(input: NotificationInput): void {
  const n: AppNotification = {
    id: `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    read: false,
    createdAt: new Date().toISOString(),
    ...input,
  };
  writeAll([n, ...readAll()]);
}

function matches(n: AppNotification, target: NotificationTarget): boolean {
  if (n.audienceRole !== target.role) return false;
  if (n.audienceRole === 'seller') return n.storeSlug === target.storeSlug;
  return true;
}

export function listNotifications(target: NotificationTarget | null): AppNotification[] {
  if (!target) return [];
  return readAll().filter((n) => matches(n, target));
}

export function unreadNotificationCount(target: NotificationTarget | null): number {
  if (!target) return 0;
  return readAll().filter((n) => matches(n, target) && !n.read).length;
}

export function markNotificationRead(id: string): void {
  const all = readAll();
  const n = all.find((x) => x.id === id);
  if (!n || n.read) return;
  n.read = true;
  writeAll(all);
}

export function markAllNotificationsRead(target: NotificationTarget | null): void {
  if (!target) return;
  const all = readAll();
  let changed = false;
  for (const n of all) {
    if (matches(n, target) && !n.read) {
      n.read = true;
      changed = true;
    }
  }
  if (changed) writeAll(all);
}
