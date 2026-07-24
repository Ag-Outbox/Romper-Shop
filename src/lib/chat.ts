import type { ChatMessage, Conversation } from './types';
import { pushNotification } from './notificationsStore';

/* ---------------------------------------------------------------------------
   Chat comprador↔vendedor (C1) — mock em localStorage: este dispositivo tem
   UM comprador, então a conversa é identificada pelo storeSlug. No Supabase
   isto vira `conversations` (buyer_id, store_slug) + `messages` com Realtime
   para entrega instantânea entre dispositivos.
--------------------------------------------------------------------------- */

const KEY = 'romper.chats.v1';
/** Evento pra UI reagir a novas mensagens na mesma aba. */
export const CHAT_EVENT = 'romper:chat';

const EPOCH = '1970-01-01T00:00:00.000Z';

function readAll(): Conversation[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: Conversation[]): void {
  localStorage.setItem(KEY, JSON.stringify(list));
  try {
    window.dispatchEvent(new Event(CHAT_EVENT));
  } catch { /* fora do browser */ }
}

function lastAt(c: Conversation): string {
  return c.messages[c.messages.length - 1]?.at ?? EPOCH;
}

/** Conversas visíveis: comprador vê todas deste dispositivo; vendedor só a da
 *  própria loja. Ordenadas pela mensagem mais recente. */
export function listConversations(viewer: { role: 'buyer' } | { role: 'seller'; storeSlug: string }): Conversation[] {
  const all = viewer.role === 'seller'
    ? readAll().filter((c) => c.storeSlug === viewer.storeSlug)
    : readAll();
  return all.sort((a, b) => lastAt(b).localeCompare(lastAt(a)));
}

export function getOrCreateConversation(storeSlug: string, storeName: string): Conversation {
  const all = readAll();
  const found = all.find((c) => c.storeSlug === storeSlug);
  if (found) return found;
  const c: Conversation = {
    id: storeSlug,
    storeSlug,
    storeName,
    messages: [],
    lastReadBuyer: EPOCH,
    lastReadSeller: EPOCH,
  };
  writeAll([c, ...all]);
  return c;
}

/** Envia mensagem e notifica o outro lado pela central (C2). */
export function sendMessage(storeSlug: string, from: ChatMessage['from'], body: string): void {
  const all = readAll();
  const c = all.find((x) => x.storeSlug === storeSlug);
  if (!c || !body.trim()) return;
  const msg: ChatMessage = {
    id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    from,
    body: body.trim(),
    at: new Date().toISOString(),
  };
  c.messages.push(msg);
  // quem envia já leu até aqui
  if (from === 'buyer') c.lastReadBuyer = msg.at; else c.lastReadSeller = msg.at;
  writeAll(all);

  if (from === 'buyer') {
    pushNotification({
      audienceRole: 'seller',
      storeSlug,
      kind: 'chat',
      title: 'Nova mensagem de comprador',
      body: msg.body.slice(0, 80),
      href: '/mensagens',
    });
  } else {
    pushNotification({
      audienceRole: 'buyer',
      kind: 'chat',
      title: `${c.storeName} respondeu no chat`,
      body: msg.body.slice(0, 80),
      href: '/mensagens',
    });
  }
}

export function unreadMessages(c: Conversation, viewer: 'buyer' | 'seller'): number {
  const lastRead = viewer === 'buyer' ? c.lastReadBuyer : c.lastReadSeller;
  const other = viewer === 'buyer' ? 'seller' : 'buyer';
  return c.messages.filter((m) => m.from === other && m.at > lastRead).length;
}

export function markConversationRead(storeSlug: string, viewer: 'buyer' | 'seller'): void {
  const all = readAll();
  const c = all.find((x) => x.storeSlug === storeSlug);
  if (!c) return;
  const now = new Date().toISOString();
  if (viewer === 'buyer') c.lastReadBuyer = now; else c.lastReadSeller = now;
  writeAll(all);
}
