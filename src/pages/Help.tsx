import { Link } from 'react-router-dom';
import TopBar from '../components/TopBar';
import SiteFooter from '../components/SiteFooter';
import Reveal from '../components/Reveal';
import { usePageMeta } from '../lib/usePageMeta';

/* ---------------------------------------------------------------------------
   ROMPER SHOP — Ajuda (/ajuda)
   Placeholder proposital: a aba existe na navegação, mas o conteúdo
   (FAQ, chamados, políticas) ainda será construído.
--------------------------------------------------------------------------- */

export default function Help() {
  usePageMeta('Ajuda');
  return (
    <>
      <TopBar />
      <main className="px-5 md:px-10 py-10 pb-24">
        <Reveal>
          <p className="font-mono text-xs text-volt tracking-widest mb-2">CENTRAL DE AJUDA</p>
          <h1 className="font-display text-4xl md:text-6xl font-semibold">Como podemos ajudar?</h1>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-10 max-w-xl rounded-xl2 border border-line bg-surface p-10 text-center">
            <p className="font-display text-2xl">Em construção</p>
            <p className="mt-3 text-fog">
              Estamos preparando a central de dúvidas, trocas e devoluções.
              Enquanto isso, fale com a gente ou continue explorando a loja.
            </p>
            <Link
              to="/"
              className="mt-6 inline-block rounded-full bg-volt px-6 py-2.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors"
            >
              Voltar ao início
            </Link>
          </div>
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
