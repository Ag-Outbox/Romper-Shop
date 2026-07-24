import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import SiteFooter from '../components/SiteFooter';
import { useAuth } from '../lib/auth';
import { usePageMeta } from '../lib/usePageMeta';
import {
  listConversations, getOrCreateConversation, sendMessage,
  unreadMessages, markConversationRead, CHAT_EVENT,
} from '../lib/chat';
import type { Conversation } from '../lib/types';

/* ---------------------------------------------------------------------------
   ROMPER SHOP — Mensagens (/mensagens)
   Chat comprador↔vendedor. Mock de dispositivo único: o mesmo navegador vê
   os dois lados (o papel logado define o lado). ?loja=slug&nome=Nome abre
   (ou cria) a conversa com aquela loja.
--------------------------------------------------------------------------- */

function timeShort(iso: string): string {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function Messages() {
  usePageMeta('Mensagens');
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const side: 'buyer' | 'seller' = user?.role === 'seller' ? 'seller' : 'buyer';
  const viewer = useMemo(
    () => (side === 'seller' ? { role: 'seller' as const, storeSlug: user!.storeSlug! } : { role: 'buyer' as const }),
    [side, user],
  );

  const [convos, setConvos] = useState<Conversation[]>(() => listConversations(viewer));
  const [activeId, setActiveId] = useState<string>('');
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // ?loja= cria/abre a conversa (lado comprador)
  useEffect(() => {
    const loja = params.get('loja');
    if (loja && side === 'buyer') {
      getOrCreateConversation(loja, params.get('nome') ?? loja);
      setActiveId(loja);
      setParams({}, { replace: true });
    }
  }, [params, setParams, side]);

  // refresca a lista quando chega mensagem (mesma aba) e ao trocar de papel
  useEffect(() => {
    const refresh = () => setConvos(listConversations(viewer));
    refresh();
    window.addEventListener(CHAT_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(CHAT_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [viewer]);

  const active = convos.find((c) => c.id === activeId) ?? null;

  // abrir uma conversa marca como lida; rola pro fim
  useEffect(() => {
    if (!active) return;
    markConversationRead(active.storeSlug, side);
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [activeId, active?.messages.length, side]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !draft.trim()) return;
    sendMessage(active.storeSlug, side, draft);
    setDraft('');
  };

  return (
    <>
      <TopBar />
      <main className="px-5 md:px-10 py-10 pb-24">
        <h1 className="font-display text-4xl md:text-5xl font-semibold">Mensagens</h1>
        <p className="mt-2 text-fog">
          {side === 'seller' ? 'Converse com quem compra da sua loja.' : 'Converse direto com as lojas.'}
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-[320px_1fr] items-start">
          {/* lista de conversas */}
          <aside className={`rounded-xl2 border border-line bg-surface overflow-hidden ${active ? 'hidden lg:block' : ''}`}>
            {convos.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-fog">
                {side === 'seller'
                  ? 'Nenhuma conversa ainda — os compradores iniciam pelo produto.'
                  : 'Nenhuma conversa ainda — abra um produto e fale com o vendedor.'}
              </p>
            ) : (
              convos.map((c) => {
                const unread = unreadMessages(c, side);
                const last = c.messages[c.messages.length - 1];
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`flex w-full items-center gap-3 border-b border-line px-4 py-3.5 text-left last:border-0 transition-colors hover:bg-line/20 ${
                      activeId === c.id ? 'bg-line/20' : ''
                    }`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-volt/15 font-display text-sm text-volt">
                      {(side === 'seller' ? 'C' : c.storeName.charAt(0))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-mist">
                        {side === 'seller' ? 'Comprador' : c.storeName}
                      </span>
                      {last && <span className="block truncate text-xs text-fog">{last.body}</span>}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      {last && <span className="font-mono text-[10px] text-fog">{timeShort(last.at)}</span>}
                      {unread > 0 && (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-volt px-1 text-xs font-semibold text-ink">
                          {unread}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </aside>

          {/* thread ativa */}
          <section className={`rounded-xl2 border border-line bg-surface ${active ? '' : 'hidden lg:flex lg:min-h-96 lg:items-center lg:justify-center'}`}>
            {!active ? (
              <p className="p-10 text-sm text-fog">Escolha uma conversa ao lado.</p>
            ) : (
              <div className="flex h-[60vh] flex-col">
                <div className="flex items-center gap-3 border-b border-line px-5 py-3">
                  <button onClick={() => setActiveId('')} className="lg:hidden text-sm text-fog hover:text-volt transition-colors" aria-label="Voltar">
                    ←
                  </button>
                  <p className="text-sm text-mist">{side === 'seller' ? 'Comprador' : active.storeName}</p>
                  <span className="font-mono text-[10px] text-fog">mock · vira Realtime na Fase 2</span>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {active.messages.length === 0 && (
                    <p className="py-10 text-center text-sm text-fog">Diga um oi — o vendedor recebe na central de notificações.</p>
                  )}
                  <div className="flex flex-col gap-2">
                    {active.messages.map((m) => {
                      const mine = m.from === side;
                      return (
                        <div key={m.id} className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                          mine ? 'self-end bg-volt text-ink' : 'self-start border border-line bg-ink/5 text-mist'
                        }`}>
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p className={`mt-1 text-right font-mono text-[10px] ${mine ? 'text-ink/60' : 'text-fog'}`}>{timeShort(m.at)}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div ref={bottomRef} />
                </div>

                <form onSubmit={send} className="flex min-w-0 gap-2 border-t border-line p-4">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Escreva sua mensagem…"
                    aria-label="Mensagem"
                    className="min-w-0 flex-1 rounded-full border border-line bg-ink/5 px-4 py-2.5 text-sm text-mist outline-none placeholder:text-fog/60 focus:border-volt transition-colors"
                  />
                  <button type="submit" disabled={!draft.trim()} className="shrink-0 rounded-full bg-volt px-5 py-2.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors disabled:opacity-50">
                    Enviar
                  </button>
                </form>
              </div>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
