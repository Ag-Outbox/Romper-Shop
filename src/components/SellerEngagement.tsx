import { useState } from 'react';
import { listQuestionsForSeller, answerQuestion } from '../lib/qna';
import { listReviewsForSeller, addSellerReply } from '../lib/reviewsStore';
import { listSellerRmas, resolveRma } from '../lib/rma';
import { formatBRL } from '../lib/format';

/* Painel do vendedor: perguntas dos compradores para responder e avaliações
   dos produtos com resposta pública. */

const inputCls =
  'min-w-0 flex-1 rounded-lg border border-line bg-ink px-3 py-2 text-sm text-mist outline-none placeholder:text-fog/60 focus:border-volt transition-colors';

function ReplyForm({ placeholder, onSubmit }: { placeholder: string; onSubmit: (body: string) => void }) {
  const [body, setBody] = useState('');
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (body.trim()) { onSubmit(body); setBody(''); } }}
      className="mt-3 flex min-w-0 gap-2"
    >
      <input value={body} onChange={(e) => setBody(e.target.value)} placeholder={placeholder} className={inputCls} />
      <button type="submit" disabled={!body.trim()} className="shrink-0 rounded-full border border-line px-4 py-2 text-xs hover:border-volt hover:text-volt transition-colors disabled:opacity-40">
        Responder
      </button>
    </form>
  );
}

export default function SellerEngagement({ storeSlug }: { storeSlug: string }) {
  const [questions, setQuestions] = useState(() => listQuestionsForSeller(storeSlug));
  const [reviews, setReviews] = useState(() => listReviewsForSeller(storeSlug));
  const [rmas, setRmas] = useState(() => listSellerRmas(storeSlug));
  const pendingQ = questions.filter((q) => !q.answer).length;
  const pendingR = reviews.filter((r) => !r.sellerReply).length;
  const pendingRma = rmas.filter((r) => r.status === 'requested').length;

  if (questions.length === 0 && reviews.length === 0 && rmas.length === 0) return null;

  return (
    <>
      {rmas.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">
            Cancelamentos e devoluções
            {pendingRma > 0 && <span className="ml-3 rounded-full bg-ember/15 px-2.5 py-1 font-mono text-xs text-ember align-middle">{pendingRma} pendente{pendingRma > 1 ? 's' : ''}</span>}
          </h2>
          <div className="mt-5 flex flex-col gap-3">
            {rmas.map((r) => (
              <div key={r.id} className="rounded-xl2 border border-line bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm text-mist">{r.orderId}</p>
                    <p className="mt-1 text-xs text-fog">
                      {r.type === 'cancel' ? 'Cancelamento' : 'Devolução'} · {formatBRL(r.amountCents)} · {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="mt-1 text-sm text-fog">“{r.reason}”</p>
                  </div>
                  {r.status === 'requested' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { resolveRma(r.id, true); setRmas(listSellerRmas(storeSlug)); }}
                        className="rounded-full bg-volt px-4 py-1.5 text-xs font-semibold text-ink hover:bg-volt-dim transition-colors"
                      >
                        Aprovar e reembolsar
                      </button>
                      <button
                        onClick={() => { resolveRma(r.id, false); setRmas(listSellerRmas(storeSlug)); }}
                        className="rounded-full border border-line px-4 py-1.5 text-xs hover:border-ember hover:text-ember transition-colors"
                      >
                        Recusar
                      </button>
                    </div>
                  ) : (
                    <span className={`rounded-full px-3 py-1 font-mono text-xs ${r.status === 'approved' ? 'bg-volt/15 text-volt' : 'bg-ember/15 text-ember'}`}>
                      {r.status === 'approved' ? 'reembolsado' : 'recusado'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {questions.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">
            Perguntas dos compradores
            {pendingQ > 0 && <span className="ml-3 rounded-full bg-ember/15 px-2.5 py-1 font-mono text-xs text-ember align-middle">{pendingQ} sem resposta</span>}
          </h2>
          <div className="mt-5 flex flex-col gap-3">
            {questions.map((q) => (
              <div key={q.id} className="rounded-xl2 border border-line bg-surface p-5">
                <p className="font-mono text-[11px] text-fog">{q.productTitle} · {new Date(q.createdAt).toLocaleDateString('pt-BR')}</p>
                <p className="mt-2 text-sm text-mist">{q.body} <span className="text-fog">— {q.authorName}</span></p>
                {q.answer ? (
                  <p className="mt-2 text-sm text-fog"><span className="text-volt">R:</span> {q.answer.body}</p>
                ) : (
                  <ReplyForm
                    placeholder="Escreva a resposta pública…"
                    onSubmit={(body) => { answerQuestion(q.id, body); setQuestions(listQuestionsForSeller(storeSlug)); }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">
            Avaliações dos clientes
            {pendingR > 0 && <span className="ml-3 rounded-full bg-line px-2.5 py-1 font-mono text-xs text-fog align-middle">{pendingR} sem resposta</span>}
          </h2>
          <div className="mt-5 flex flex-col gap-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl2 border border-line bg-surface p-5">
                <p className="font-mono text-[11px] text-fog">
                  {r.productTitle} · {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} · {r.buyerName}
                </p>
                {r.title && <p className="mt-2 text-sm font-medium text-mist">{r.title}</p>}
                {r.body && <p className="mt-1 text-sm text-fog">{r.body}</p>}
                {r.sellerReply ? (
                  <p className="mt-2 text-sm text-fog"><span className="text-volt">Sua resposta:</span> {r.sellerReply.body}</p>
                ) : (
                  <ReplyForm
                    placeholder="Responder publicamente…"
                    onSubmit={(body) => { addSellerReply(r.id, body); setReviews(listReviewsForSeller(storeSlug)); }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
