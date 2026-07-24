import { getSellerCatalog } from '../lib/sellerCatalog';
import { getStoreProfile } from '../lib/storeProfile';
import { listCoupons } from '../lib/coupons';
import { listQuestionsForSeller } from '../lib/qna';
import { listSellerSubOrders } from '../lib/orders';

/* Painel do vendedor: checklist de onboarding derivado do estado real —
   cada passo se marca sozinho quando a ação acontece de verdade. */

interface Step {
  label: string;
  hint: string;
  done: boolean;
}

export default function SellerOnboarding({ storeSlug }: { storeSlug: string }) {
  const steps: Step[] = [
    {
      label: 'Publique seu primeiro produto',
      hint: 'Use "Publicar produto" ou importe de um fornecedor.',
      done: getSellerCatalog(storeSlug).some((r) => r.status === 'active'),
    },
    {
      label: 'Personalize o perfil da loja',
      hint: 'Tagline, descrição e políticas aparecem na sua página pública.',
      done: !!getStoreProfile(storeSlug),
    },
    {
      label: 'Crie um cupom da loja',
      hint: 'Cupons aumentam conversão — comece com 10% de boas-vindas.',
      done: listCoupons({ scope: 'store', storeSlug }).length > 0,
    },
    {
      label: 'Responda uma pergunta de comprador',
      hint: 'Perguntas respondidas rápido viram vendas.',
      done: listQuestionsForSeller(storeSlug).some((q) => !!q.answer),
    },
    {
      label: 'Envie seu primeiro pedido',
      hint: 'Marque como enviado assim que postar o pacote.',
      done: listSellerSubOrders(storeSlug).some((s) => s.status === 'shipped' || s.status === 'delivered'),
    },
  ];

  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null; // formou — some da tela

  return (
    <section className="mt-8 rounded-xl2 border border-volt/40 bg-volt/5 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">Primeiros passos da loja</h2>
        <span className="font-mono text-xs text-fog">{done} de {steps.length}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded bg-line">
        <div className="h-full rounded bg-volt transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-5 flex flex-col gap-3">
        {steps.map((s) => (
          <li key={s.label} className="flex items-start gap-3">
            <span
              aria-hidden
              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs ${
                s.done ? 'bg-volt text-ink' : 'border border-line text-fog'
              }`}
            >
              {s.done ? '✓' : ''}
            </span>
            <div>
              <p className={`text-sm ${s.done ? 'text-fog line-through' : 'text-mist'}`}>{s.label}</p>
              {!s.done && <p className="text-xs text-fog">{s.hint}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
