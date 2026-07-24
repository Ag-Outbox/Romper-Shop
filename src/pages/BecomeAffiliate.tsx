import { Link } from 'react-router-dom';
import TopBar from '../components/TopBar';
import SiteFooter from '../components/SiteFooter';
import Reveal from '../components/Reveal';
import { usePageMeta } from '../lib/usePageMeta';

/* ---------------------------------------------------------------------------
   ROMPER SHOP — Landing pública de recrutamento de afiliados (/seja-afiliado)
   Sem login: vende o programa. O CTA leva ao /afiliado (que exige entrar) —
   onboarding em 2 toques: entrar → "Quero ser afiliado".
--------------------------------------------------------------------------- */

const STEPS = [
  { n: '01', title: 'Crie seu link', body: 'Cadastro em 1 clique — você ganha um código único, sem burocracia e sem custo.' },
  { n: '02', title: 'Compartilhe', body: 'WhatsApp, Instagram, TikTok, grupo da família. Qualquer produto da loja pode virar link seu.' },
  { n: '03', title: 'Ganhe comissão', body: 'Quem comprar pelo seu link em até 30 dias gera comissão. Confirmou a entrega, o dinheiro é seu.' },
];

const FAQS = [
  ['Quanto eu ganho?', 'Comissão padrão de 10% sobre o subtotal indicado, confirmada quando o pedido é entregue.'],
  ['Preciso ter loja ou CNPJ?', 'Não. Afiliado é aditivo: você continua comprador (ou vendedor) normal e indica por fora.'],
  ['Quando recebo?', 'A comissão fica pendente até a entrega. Depois disso, é só pedir o saque no seu painel.'],
  ['Posso indicar qualquer produto?', 'Sim — home, loja ou produto específico. Todo link aceita seu código ?ref=.'],
];

export default function BecomeAffiliate() {
  usePageMeta('Seja afiliado', 'Indique produtos da Romper Shop e ganhe comissão por cada venda entregue.');
  return (
    <>
      <TopBar />
      <main>
        {/* hero */}
        <section className="relative overflow-hidden px-5 py-20 md:px-10 md:py-28">
          <div aria-hidden className="pointer-events-none absolute -top-1/3 -right-1/4 h-[40rem] w-[40rem] rounded-full bg-volt/[0.08] blur-3xl" />
          <Reveal>
            <p className="font-mono text-xs text-volt tracking-widest mb-4">PROGRAMA DE AFILIADOS</p>
            <h1 className="max-w-3xl font-display text-5xl md:text-7xl font-semibold text-balance">
              Indique. <span className="text-fog">A entrega acontece.</span> Você ganha.
            </h1>
            <p className="mt-6 max-w-xl text-fog">
              Transforme recomendações em renda: 10% de comissão sobre cada venda
              que chegar pelo seu link, sem estoque, sem atendimento, sem loja.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/afiliado" className="rounded-full bg-volt px-8 py-3.5 text-sm font-semibold text-ink transition-all duration-300 ease-smooth hover:bg-volt-dim hover:-translate-y-0.5">
                Quero meu link →
              </Link>
              <a href="#como-funciona" className="rounded-full border border-line px-8 py-3.5 text-sm hover:border-volt hover:text-volt transition-colors">
                Como funciona
              </a>
            </div>
          </Reveal>
        </section>

        {/* passos */}
        <section id="como-funciona" className="border-t border-line px-5 py-16 md:px-10 md:py-24">
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="rounded-xl2 border border-line bg-surface p-6 h-full">
                  <span className="font-display text-4xl font-semibold text-outline">{s.n}</span>
                  <h2 className="mt-4 font-display text-2xl font-semibold">{s.title}</h2>
                  <p className="mt-2 text-sm text-fog leading-relaxed">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* números */}
        <section className="mx-5 md:mx-10 rounded-xl2 bg-volt p-8 md:p-12 text-ink">
          <div className="flex flex-wrap gap-x-14 gap-y-6">
            {([['10%', 'de comissão padrão'], ['30 dias', 'de atribuição do clique'], ['R$ 0', 'de custo pra participar']] as const).map(([n, l]) => (
              <div key={l}>
                <p className="font-display text-4xl md:text-5xl font-semibold tabular-nums">{n}</p>
                <p className="mt-1 font-mono text-xs tracking-widest uppercase text-ink/70">{l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="px-5 py-16 md:px-10 md:py-24">
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-8">Perguntas frequentes</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {FAQS.map(([q, a]) => (
              <div key={q} className="rounded-xl2 border border-line bg-surface p-5">
                <p className="text-sm font-medium text-mist">{q}</p>
                <p className="mt-2 text-sm text-fog leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
          <Link to="/afiliado" className="mt-10 inline-block rounded-full bg-volt px-8 py-3.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
            Começar agora →
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
