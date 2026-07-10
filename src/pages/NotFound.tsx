import { Link } from 'react-router-dom';
import TopBar from '../components/TopBar';
import SiteFooter from '../components/SiteFooter';
import { usePageMeta } from '../lib/usePageMeta';

/** 404 — rota inexistente. */
export default function NotFound() {
  usePageMeta('Página não encontrada');
  return (
    <>
      <TopBar />
      <main className="px-5 md:px-10 py-32 text-center">
        <p className="font-mono text-xs text-volt tracking-widest mb-4">404</p>
        <h1 className="font-display text-4xl md:text-6xl font-semibold">Essa página não existe</h1>
        <p className="mt-5 text-fog">O endereço pode estar errado, ou a página saiu do ar.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="rounded-full bg-volt px-7 py-3 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
            Voltar ao início
          </Link>
          <Link to="/busca" className="rounded-full border border-line px-7 py-3 text-sm hover:border-volt hover:text-volt transition-colors">
            Buscar produtos
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
