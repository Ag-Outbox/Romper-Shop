import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
  listNotifications,
  unreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  NOTIFICATIONS_EVENT,
} from '../lib/notificationsStore';
import type { AppNotification, NotificationKind } from '../lib/types';

/* Sino da central de notificações (C2). Fica na TopBar; abre um painel com o
   feed do papel atual, marca como lido ao clicar e leva ao contexto (pedido,
   produto, painel). Atualiza na hora via evento NOTIFICATIONS_EVENT. */

const ICON: Record<NotificationKind, string> = {
  order: '📦',
  question: '💬',
  review: '★',
  store: '🏪',
  payout: '💸',
};

/** "agora", "há 5 min", "há 2 h", "há 3 d" — tempo relativo curto em pt-BR. */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const target = user ? { role: user.role, storeSlug: user.storeSlug } : null;

  // Recarrega do store. Depende só do id/loja do usuário (target é recriado a cada render).
  useEffect(() => {
    const sync = () => {
      setItems(listNotifications(target));
      setUnread(unreadNotificationCount(target));
    };
    sync();
    window.addEventListener(NOTIFICATIONS_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(NOTIFICATIONS_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.storeSlug]);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!user) return null;

  const openNotification = (n: AppNotification) => {
    markNotificationRead(n.id);
    setOpen(false);
    if (n.href) navigate(n.href);
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `Notificações (${unread} não lidas)` : 'Notificações'}
        aria-expanded={open}
        className="relative grid h-10 w-10 place-items-center rounded-full border border-line text-mist hover:border-volt hover:text-volt transition-colors"
      >
        <span aria-hidden className="text-base leading-none">🔔</span>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full bg-ember px-1 min-w-[18px] h-[18px] text-[11px] font-semibold text-ink">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2.5rem))] max-h-[70vh] overflow-hidden rounded-xl2 border border-line bg-surface shadow-lift z-50 flex flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-mono text-xs tracking-widest text-fog">NOTIFICAÇÕES</span>
            {unread > 0 && (
              <button
                onClick={() => markAllNotificationsRead(target)}
                className="text-xs text-fog hover:text-volt transition-colors"
              >
                marcar todas como lidas
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-fog">Nada por aqui ainda.</p>
          ) : (
            <ul className="overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openNotification(n)}
                    className={`flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-0 hover:bg-line/20 ${n.read ? '' : 'bg-volt/[0.04]'}`}
                  >
                    <span aria-hidden className="mt-0.5 text-sm leading-none">{ICON[n.kind]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        {!n.read && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-volt" />}
                        <span className={`text-sm ${n.read ? 'text-mist' : 'text-mist font-medium'}`}>{n.title}</span>
                      </span>
                      {n.body && <span className="mt-0.5 block truncate text-xs text-fog">{n.body}</span>}
                      <span className="mt-0.5 block font-mono text-[11px] tracking-wide text-fog/70">{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
